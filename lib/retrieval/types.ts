/** Shared retrieval types (ARCHITECTURE.md §12). */
import type { ChunkMeta } from "@/lib/db/schema"

/** Source metadata denormalized onto a retrieved chunk for citation rendering. */
export interface RetrievedSource {
  id: string
  title: string
  author?: string | null
  url?: string | null
  tradition?: string | null
  sourceType?: string | null
  year?: number | null
}

/** A chunk returned from vector search, with its similarity (or rerank) score. */
export interface RetrievedChunk {
  chunkId: string
  documentId: string
  sourceId: string
  ordinal: number
  content: string
  meta: ChunkMeta
  /** 0..1 — cosine similarity from ANN search, replaced by rerank relevance after rerank. */
  score: number
  source: RetrievedSource
}

export interface RetrievalFilters {
  traditions?: string[]
  sourceTypes?: string[]
  yearFrom?: number
  yearTo?: number
  /** Allow-list of source ids to restrict retrieval to. */
  sourceIds?: string[]
}
