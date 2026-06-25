/**
 * POST /api/chat — ask a theological question and stream a grounded answer.
 *
 * Phase 1 scaffold: validates input, authenticates, and streams an honest
 * placeholder over the real NDJSON protocol. The LangGraph reasoning pipeline
 * (retrieval → rerank → generate → citation verification) lands in Phases 2–3
 * and will replace the placeholder body without changing this contract.
 */
import { randomUUID } from "node:crypto"

import { getUserId } from "@/lib/auth"
import { encodeEvent, type ChatStreamEvent } from "@/lib/chat/protocol"
import { logger } from "@/lib/logging"
import { askRequestSchema } from "@/lib/validation/chat"

// proxy/auth runs on nodejs; the graph needs Node APIs too.
export const runtime = "nodejs"

const PLACEHOLDER_NODES = [
  ["intent_analysis", "Understanding the question"],
  ["retrieval_planning", "Planning source retrieval"],
  ["source_retrieval", "Searching trusted sources"],
  ["reranking", "Ranking the best evidence"],
  ["citation_verification", "Verifying every citation"],
] as const

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

  const { question, isPrivate } = parsed.data
  const requestId = randomUUID()
  const log = logger.child({ requestId, userId, private: isPrivate })
  log.info("chat.request.received", { data: { length: question.length, isPrivate } })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ChatStreamEvent) =>
        controller.enqueue(encodeEvent(event))

      try {
        for (const [node, message] of PLACEHOLDER_NODES) {
          send({ type: "status", node, message })
          log.debug("graph.node", { data: { node } })
          await sleep(120)
        }

        const answer =
          "Torch's retrieval pipeline is being wired up. Once the source " +
          "library is ingested (Phase 2), answers here will quote trusted " +
          "theological works verbatim, cite author, work, and page, and present " +
          "differing traditions fairly — and Torch will say so plainly when no " +
          "reliable source can be found, rather than inventing one."

        for (const word of answer.split(" ")) {
          send({ type: "token", value: word + " " })
          await sleep(18)
        }

        send({ type: "citations", citations: [] })
        send({
          type: "done",
          confidence: {
            level: "low",
            reason: "Retrieval not yet connected (Phase 1 scaffold).",
          },
        })
        log.info("chat.request.completed", {})
      } catch (err) {
        log.error("chat.request.failed", {
          data: { error: (err as Error).message },
        })
        send({ type: "error", message: "Something went wrong." })
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
