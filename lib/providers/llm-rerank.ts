/**
 * LLM-based reranker — scores candidate passages with a chat model instead of a
 * dedicated rerank API. This is the reranker that works *through* OpenRouter
 * (which has no rerank endpoint): it uses the normal chat/structured-output path.
 *
 * Pointwise relevance scoring (0..1) in a single structured call. Passages are
 * truncated in the prompt to keep cost/latency bounded. Used via `getReranker()`
 * in ./index when no Cohere key is configured (or AI_RERANK_STRATEGY=llm).
 */
import { z } from "zod"

import { logger } from "@/lib/logging"
import type { ChatModel, Reranker, ScoredDoc } from "./types"

const RERANK_SCHEMA = z.object({
  rankings: z.array(z.object({ index: z.number(), score: z.number() })),
})

const SYSTEM_PROMPT =
  "You are a search reranker for a theological research assistant. Given a query " +
  "and a numbered list of source passages, score EACH passage from 0.0 " +
  "(irrelevant) to 1.0 (directly and strongly answers the query) by how useful it " +
  'is for answering the query. Respond with ONLY JSON: {"rankings":[{"index":<n>,' +
  '"score":<0..1>}, ...]} including every passage index exactly once.'

/** Max characters of each passage shown to the reranker (keeps the prompt small). */
const MAX_PASSAGE_CHARS = 600

export class LlmReranker implements Reranker {
  constructor(private readonly chat: ChatModel) {}

  async rerank(query: string, docs: string[], topN?: number): Promise<ScoredDoc[]> {
    if (docs.length === 0) return []
    const started = performance.now()

    const list = docs
      .map((d, i) => `[${i}] ${d.slice(0, MAX_PASSAGE_CHARS).replace(/\s+/g, " ").trim()}`)
      .join("\n\n")

    const result = await this.chat.structured(
      {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Query: ${query}\n\nPassages:\n${list}\n\nScore all ${docs.length} passages.`,
          },
        ],
        temperature: 0,
      },
      RERANK_SCHEMA,
    )

    logger.info("provider.rerank", {
      data: {
        provider: "llm",
        docs: docs.length,
        latencyMs: Math.round(performance.now() - started),
      },
    })

    return result.rankings
      .filter((r) => Number.isInteger(r.index) && r.index >= 0 && r.index < docs.length)
      .map((r) => ({ index: r.index, score: r.score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN ?? docs.length)
  }
}
