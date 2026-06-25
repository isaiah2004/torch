/**
 * Cohere reranker (default model `rerank-v3.5`) — chosen for a strong balance of
 * accuracy and cost. Implemented against Cohere's REST API directly (no SDK) so
 * it stays a thin, swappable piece behind the {@link Reranker} interface. The
 * rest of the app never imports this directly — it goes through
 * `getReranker()` in ./index, so swapping rerankers is config-only.
 */
import { logger } from "@/lib/logging"
import type { Reranker, ScoredDoc } from "./types"

const COHERE_RERANK_URL = "https://api.cohere.com/v2/rerank"

interface CohereRerankResponse {
  results: { index: number; relevance_score: number }[]
}

export class CohereReranker implements Reranker {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async rerank(query: string, docs: string[], topN?: number): Promise<ScoredDoc[]> {
    if (docs.length === 0) return []
    const started = performance.now()
    const res = await fetch(COHERE_RERANK_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        query,
        documents: docs,
        top_n: topN ?? docs.length,
      }),
    })
    if (!res.ok) {
      throw new Error(`Cohere rerank failed: ${res.status} ${await res.text()}`)
    }
    const json = (await res.json()) as CohereRerankResponse
    logger.info("provider.rerank", {
      data: {
        provider: "cohere",
        model: this.model,
        docs: docs.length,
        latencyMs: Math.round(performance.now() - started),
      },
    })
    return json.results.map((r) => ({ index: r.index, score: r.relevance_score }))
  }
}
