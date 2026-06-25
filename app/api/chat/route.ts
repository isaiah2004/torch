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
import {
  buildGroundedMessages,
  citationsFromEvidence,
  estimateConfidence,
  NO_EVIDENCE_ANSWER,
} from "@/lib/chat/grounded"
import { encodeEvent, type ChatStreamEvent } from "@/lib/chat/protocol"
import { recordAiRequest } from "@/lib/chat/record"
import { serverEnv } from "@/lib/env"
import { logger } from "@/lib/logging"
import { getProvider } from "@/lib/providers"
import { retrieveEvidence } from "@/lib/retrieval"
import { askRequestSchema } from "@/lib/validation/chat"

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

  const { question, isPrivate, filters, conversationId } = parsed.data
  const requestId = randomUUID()
  const log = logger.child({ requestId, userId, private: isPrivate })
  log.info("chat.request.received", {
    data: { length: question.length, isPrivate, filters },
  })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) => controller.enqueue(encodeEvent(event))
      const started = performance.now()

      try {
        send({ type: "status", node: "retrieval_planning", message: "Planning source retrieval" })
        send({ type: "status", node: "source_retrieval", message: "Searching trusted sources" })

        const { selected, candidates } = await retrieveEvidence(question, {
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
          send({ type: "done", confidence: estimateConfidence([]), conversationId })
          log.info("chat.request.no_evidence", { data: { candidates: candidates.length } })
          await recordAiRequest({
            requestId,
            userId,
            conversationId,
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
        const messages = buildGroundedMessages(question, selected)
        let usagePrompt: number | undefined
        let usageCompletion: number | undefined

        for await (const chunk of provider.chat().stream({
          messages,
          temperature: 0.2,
          requestId,
        })) {
          if (chunk.delta) send({ type: "token", value: chunk.delta })
          if (chunk.usage) {
            usagePrompt = chunk.usage.prompt
            usageCompletion = chunk.usage.completion
          }
        }

        send({ type: "citations", citations: citationsFromEvidence(selected) })
        send({
          type: "done",
          confidence: estimateConfidence(selected),
          conversationId,
        })
        log.info("chat.request.completed", {
          data: { evidence: selected.length, latencyMs: Math.round(performance.now() - started) },
        })

        await recordAiRequest({
          requestId,
          userId,
          conversationId,
          question,
          provider: provider.name,
          model: serverEnv.AI_CHAT_MODEL,
          latencyMs: Math.round(performance.now() - started),
          tokensPrompt: usagePrompt,
          tokensCompletion: usageCompletion,
          retrievalCount: selected.length,
          verified: false,
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
