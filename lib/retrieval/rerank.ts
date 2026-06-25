/**
 * Rerank + evidence selection (ARCHITECTURE.md §12).
 *
 * Reorders ANN candidates with the hosted reranker (Cohere by default, via the
 * provider layer), drops low-relevance evidence, and returns both the selected
 * set (passed to the LLM) and the rejected set (logged for the retrieval
 * inspector). When no reranker is configured it falls back to vector-similarity
 * order — retrieval still works, just without the rerank quality boost.
 */
import { logger } from "@/lib/logging"
import { getReranker } from "@/lib/providers"
import type { Reranker } from "@/lib/providers/types"

import type { RetrievedChunk } from "./types"

export interface RerankOptions {
  /** Keep at most this many after rerank. Default 8. */
  topN?: number
  /** Drop evidence scoring below this (after rerank). Default 0 (keep all). */
  minScore?: number
  /** Inject for tests; defaults to the configured reranker (may be undefined). */
  reranker?: Reranker | null
  requestId?: string
}

export interface RerankResult {
  selected: RetrievedChunk[]
  rejected: RetrievedChunk[]
  /** Whether a hosted reranker ran (false = vector-score fallback). */
  reranked: boolean
}

export async function rerankChunks(
  query: string,
  candidates: RetrievedChunk[],
  options: RerankOptions = {},
): Promise<RerankResult> {
  if (candidates.length === 0) {
    return { selected: [], rejected: [], reranked: false }
  }

  const topN = Math.max(1, options.topN ?? 8)
  const minScore = options.minScore ?? 0
  const reranker =
    options.reranker === undefined ? getReranker() : options.reranker

  let ordered: RetrievedChunk[]
  let reranked = false

  if (reranker) {
    try {
      const scored = await reranker.rerank(
        query,
        candidates.map((c) => c.content),
        candidates.length,
      )
      // Replace similarity with rerank relevance; keep reranker's ordering.
      ordered = scored
        .filter((s) => s.index >= 0 && s.index < candidates.length)
        .map((s) => ({ ...candidates[s.index], score: s.score }))
      reranked = true
    } catch (err) {
      // A flaky reranker must never break the answer — degrade to vector order.
      logger.warn("retrieval.rerank.fallback", {
        requestId: options.requestId,
        data: { error: (err as Error).message },
      })
      ordered = [...candidates].sort((a, b) => b.score - a.score)
    }
  } else {
    ordered = [...candidates].sort((a, b) => b.score - a.score)
  }

  const passing = ordered.filter((c) => c.score >= minScore)
  const selected = passing.slice(0, topN)
  const selectedIds = new Set(selected.map((c) => c.chunkId))
  const rejected = ordered.filter((c) => !selectedIds.has(c.chunkId))

  logger.info("retrieval.rerank", {
    requestId: options.requestId,
    data: {
      reranked,
      candidates: candidates.length,
      selected: selected.length,
      rejected: rejected.length,
      selectedScores: selected.map((c) => Number(c.score.toFixed(4))),
    },
  })

  return { selected, rejected, reranked }
}
