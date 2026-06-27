/**
 * POST /api/chat — ask a theological question and stream a grounded answer.
 *
 * Phase 2 wiring: embed → retrieve (pgvector) → rerank → grounded generation,
 * streamed over the NDJSON protocol (unchanged contract). When retrieval finds
 * no adequate evidence, Torch says so plainly instead of inventing an answer
 * (ARCHITECTURE.md §8). The Phase-3 LangGraph verifier will slot in between
 * generation and the `done` event without changing this contract.
 */
import { randomUUID } from "node:crypto"

import { getUserId } from "@/lib/auth"
import { analyzeQuestion } from "@/lib/chat/analyze"
import {
  buildGroundedMessages,
  citationsFromEvidence,
  estimateConfidence,
  NO_EVIDENCE_ANSWER,
} from "@/lib/chat/grounded"
import { encodeEvent, type ChatStreamEvent } from "@/lib/chat/protocol"
import { recordAiRequest } from "@/lib/chat/record"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import {
  addMessage,
  autoTitleFrom,
  createConversation,
  ensureLocalUserId,
  getConversation,
} from "@/lib/db/queries/conversations"
import type { Citation, Confidence } from "@/lib/db/schema"
import { serverEnv } from "@/lib/env"
import { logger } from "@/lib/logging"
import { getProvider } from "@/lib/providers"
import { retrieveEvidence } from "@/lib/retrieval"
import {
  extractScriptureReferences,
  resolveScriptureReferences,
} from "@/lib/scripture/references"
import { askRequestSchema } from "@/lib/validation/chat"
import { verifyAnswer } from "@/lib/verification/verify"

// proxy/auth runs on nodejs; retrieval + provider need Node APIs too.
export const runtime = "nodejs"
export const maxDuration = 120

const RETRIEVAL_TOP_K = 24
const EVIDENCE_TOP_N = 8

export async function POST(req: Request) {
  const userId = await getUserId()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rl = checkRateLimit(`chat:${userId}`, serverEnv.RATE_LIMIT_CHAT_PER_MIN)
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = askRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { question, isPrivate, filters, conversationId, history } = parsed.data
  const requestId = randomUUID()
  const log = logger.child({ requestId, userId, private: isPrivate })
  log.info("chat.request.received", {
    data: { length: question.length, isPrivate, filters, historyTurns: history.length },
  })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) => controller.enqueue(encodeEvent(event))
      const started = performance.now()

      // ── Persistence (skipped entirely in private mode) ──────────────────────
      // `echoConversationId` is what we return in the `done` event; `persistTo`
      // is set only when we will actually write messages. Setup failures (or a
      // missing local users row) degrade gracefully: streaming continues,
      // nothing is persisted, and we echo back the incoming conversationId.
      let echoConversationId: string | undefined = conversationId
      let persistTo: string | undefined
      if (!isPrivate && process.env.DATABASE_URL) {
        try {
          const localUserId = await ensureLocalUserId(userId)
          if (localUserId) {
            let cid = conversationId
            // Only reuse a conversation the caller actually owns.
            if (cid && !(await getConversation(cid, localUserId))) cid = undefined
            if (!cid) {
              cid = (
                await createConversation({
                  userId: localUserId,
                  title: autoTitleFrom(question),
                })
              ).id
            }
            await addMessage({ conversationId: cid, role: "user", content: question })
            persistTo = cid
            echoConversationId = cid
          }
        } catch (err) {
          log.error("chat.persist.setup_failed", {
            data: { error: (err as Error).message },
          })
          persistTo = undefined
        }
      }

      // Persist the assistant turn after generation; never break the stream.
      const persistAssistant = async (
        content: string,
        citations: Citation[],
        confidence: Confidence,
      ) => {
        if (!persistTo) return
        try {
          await addMessage({
            conversationId: persistTo,
            role: "assistant",
            content,
            citations,
            confidence,
          })
        } catch (err) {
          log.error("chat.persist.assistant_failed", {
            data: { error: (err as Error).message },
          })
        }
      }

      try {
        send({ type: "status", node: "intent_analysis", message: "Understanding the question" })

        // Classify the question + rewrite follow-ups into a standalone retrieval query.
        const { standaloneQuestion: retrievalQuery, type } = await analyzeQuestion(
          question,
          history,
          requestId,
        )
        log.info("chat.query.analyzed", { data: { type, retrievalQuery } })

        send({ type: "status", node: "retrieval_planning", message: "Planning source retrieval" })
        send({ type: "status", node: "source_retrieval", message: "Searching trusted sources" })

        const { selected, candidates } = await retrieveEvidence(retrievalQuery, {
          filters,
          topK: RETRIEVAL_TOP_K,
          requestId,
          rerank: { topN: EVIDENCE_TOP_N, requestId },
        })

        send({ type: "status", node: "reranking", message: "Ranking the best evidence" })

        // No fabrication: when nothing is retrieved, say so honestly.
        if (selected.length === 0) {
          for (const word of NO_EVIDENCE_ANSWER.split(" ")) {
            send({ type: "token", value: word + " " })
          }
          send({ type: "citations", citations: [] })
          const noEvidenceConfidence = estimateConfidence([])
          await persistAssistant(NO_EVIDENCE_ANSWER, [], noEvidenceConfidence)
          send({
            type: "done",
            confidence: noEvidenceConfidence,
            conversationId: echoConversationId,
          })
          log.info("chat.request.no_evidence", { data: { candidates: candidates.length } })
          await recordAiRequest({
            requestId,
            userId,
            conversationId: echoConversationId,
            question,
            provider: getProvider().name,
            model: serverEnv.AI_CHAT_MODEL,
            latencyMs: Math.round(performance.now() - started),
            retrievalCount: 0,
            verified: false,
            isPrivate,
          })
          return
        }

        const provider = getProvider()
        const messages = buildGroundedMessages(question, selected, history, type)
        let usagePrompt: number | undefined
        let usageCompletion: number | undefined
        let answer = ""

        for await (const chunk of provider.chat().stream({
          messages,
          temperature: 0.2,
          requestId,
        })) {
          if (chunk.delta) {
            answer += chunk.delta
            send({ type: "token", value: chunk.delta })
          }
          if (chunk.usage) {
            usagePrompt = chunk.usage.prompt
            usageCompletion = chunk.usage.completion
          }
        }

        const citations = citationsFromEvidence(selected)
        const confidence = estimateConfidence(selected)
        await persistAssistant(answer, citations, confidence)
        send({ type: "citations", citations })

        // ── Trust layer: verify every quote/citation against the evidence ──────
        send({ type: "status", node: "citation_verification", message: "Verifying citations" })
        const verification = verifyAnswer(answer, selected)
        log.info("chat.verification", {
          data: {
            verified: verification.verified,
            quotesChecked: verification.quotesChecked,
            unsupportedQuotes: verification.unsupportedQuotes.length,
            citationIssues: verification.citationIssues.length,
          },
        })

        // ── Biblical references: derived from the answer, never persisted ─────
        // Emitted for both private and non-private turns (only DB writes are gated).
        const references = await resolveScriptureReferences(
          extractScriptureReferences(answer),
        )
        if (references.length > 0) send({ type: "references", references })

        send({
          type: "done",
          confidence,
          conversationId: echoConversationId,
          verified: verification.verified,
        })
        log.info("chat.request.completed", {
          data: { evidence: selected.length, latencyMs: Math.round(performance.now() - started) },
        })

        await recordAiRequest({
          requestId,
          userId,
          conversationId: echoConversationId,
          question,
          provider: provider.name,
          model: serverEnv.AI_CHAT_MODEL,
          latencyMs: Math.round(performance.now() - started),
          tokensPrompt: usagePrompt,
          tokensCompletion: usageCompletion,
          retrievalCount: selected.length,
          verified: verification.verified,
          isPrivate,
        })
      } catch (err) {
        log.error("chat.request.failed", { data: { error: (err as Error).message } })
        send({ type: "error", message: "Something went wrong while answering." })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  })
}
