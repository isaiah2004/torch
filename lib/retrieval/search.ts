/**
 * Vector retrieval over pgvector (ARCHITECTURE.md §12).
 *
 * Embeds the query through the provider layer, then runs a cosine-distance ANN
 * search against the `chunks` HNSW index (joined to `sources` for citation
 * metadata), with optional metadata filters (tradition, source type, year,
 * source allow-list). Returns candidates ordered best-first; the reranker
 * (./rerank) then selects the final evidence set.
 */
import { and, cosineDistance, eq, gte, inArray, lte, sql } from "drizzle-orm"

import { chunks, sources, type ChunkMeta } from "@/lib/db/schema"
import { logger } from "@/lib/logging"
import { getEmbeddingModel } from "@/lib/providers"
import type { EmbeddingModel } from "@/lib/providers/types"

import type { RetrievalFilters, RetrievedChunk } from "./types"
import type { Database } from "@/lib/db"

export interface SearchOptions {
  /** Candidate count to fetch from ANN (before rerank). Default 20. */
  topK?: number
  filters?: RetrievalFilters
  /** Inject for tests / model overrides. */
  embedModel?: EmbeddingModel
  db?: Database
  /** Skip embedding by supplying a precomputed query vector. */
  queryVector?: number[]
  requestId?: string
}

async function resolveDb(injected?: Database): Promise<Database> {
  if (injected) return injected
  return (await import("@/lib/db")).db
}

/** Build the metadata filter conditions for a retrieval query. */
function filterConditions(filters?: RetrievalFilters) {
  const conds = []
  if (filters?.traditions?.length) {
    conds.push(inArray(sources.tradition, filters.traditions))
  }
  if (filters?.sourceTypes?.length) {
    conds.push(inArray(sources.sourceType, filters.sourceTypes))
  }
  if (filters?.sourceIds?.length) {
    conds.push(inArray(chunks.sourceId, filters.sourceIds))
  }
  if (typeof filters?.yearFrom === "number") {
    conds.push(gte(sources.year, filters.yearFrom))
  }
  if (typeof filters?.yearTo === "number") {
    conds.push(lte(sources.year, filters.yearTo))
  }
  return conds
}

export async function searchChunks(
  query: string,
  options: SearchOptions = {},
): Promise<RetrievedChunk[]> {
  const topK = Math.max(1, options.topK ?? 20)
  const database = await resolveDb(options.db)

  const queryVector =
    options.queryVector ??
    (await (options.embedModel ?? getEmbeddingModel()).embed([query]))[0]

  const distance = cosineDistance(chunks.embedding, queryVector)
  const similarity = sql<number>`1 - (${distance})`

  const conds = filterConditions(options.filters)
  const where = conds.length ? and(...conds) : undefined

  const rows = await database
    .select({
      chunkId: chunks.id,
      documentId: chunks.documentId,
      sourceId: chunks.sourceId,
      ordinal: chunks.ordinal,
      content: chunks.content,
      meta: chunks.meta,
      similarity,
      sTitle: sources.title,
      sAuthor: sources.author,
      sUrl: sources.url,
      sTradition: sources.tradition,
      sType: sources.sourceType,
      sYear: sources.year,
    })
    .from(chunks)
    .innerJoin(sources, eq(chunks.sourceId, sources.id))
    .where(where)
    .orderBy(distance) // ascending distance == best first; uses the HNSW index
    .limit(topK)

  const results: RetrievedChunk[] = rows.map((r) => ({
    chunkId: r.chunkId,
    documentId: r.documentId,
    sourceId: r.sourceId,
    ordinal: r.ordinal,
    content: r.content,
    meta: (r.meta ?? {}) as ChunkMeta,
    score: Number(r.similarity),
    source: {
      id: r.sourceId,
      title: r.sTitle,
      author: r.sAuthor,
      url: r.sUrl,
      tradition: r.sTradition,
      sourceType: r.sType,
      year: r.sYear,
    },
  }))

  logger.info("retrieval.search", {
    requestId: options.requestId,
    data: {
      topK,
      returned: results.length,
      filters: options.filters,
      topScore: results[0]?.score,
    },
  })

  return results
}
