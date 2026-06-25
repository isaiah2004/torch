/**
 * Retrieval entry point: embed → ANN search → rerank → select evidence.
 * See ARCHITECTURE.md §12. Both selected and rejected evidence are returned so
 * callers (and the admin retrieval inspector) can see what was considered.
 */
import { rerankChunks, type RerankOptions, type RerankResult } from "./rerank"
import { searchChunks, type SearchOptions } from "./search"
import type { RetrievedChunk } from "./types"

export interface RetrieveOptions extends SearchOptions {
  rerank?: RerankOptions
}

export interface RetrieveResult extends RerankResult {
  /** All ANN candidates considered, best-first, before selection. */
  candidates: RetrievedChunk[]
}

export async function retrieveEvidence(
  query: string,
  options: RetrieveOptions = {},
): Promise<RetrieveResult> {
  const candidates = await searchChunks(query, options)
  const result = await rerankChunks(query, candidates, {
    requestId: options.requestId,
    ...options.rerank,
  })
  return { ...result, candidates }
}

export { searchChunks } from "./search"
export { rerankChunks } from "./rerank"
export type { RetrievedChunk, RetrievalFilters, RetrievedSource } from "./types"
export type { RerankResult } from "./rerank"
