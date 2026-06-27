/**
 * Admin DB helpers — embeddings & ingestion dashboard.
 *
 * All queries run server-side only; never import this from client components.
 */
import { desc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  chunks,
  documents,
  ingestionJobs,
  bibleVerses,
  sources,
} from "@/lib/db/schema"

// ── Public types ─────────────────────────────────────────────────────────────

export interface DocStatusCount {
  status: string
  count: number
}

export interface ChunksBySourceType {
  sourceType: string | null
  count: number
}

export interface EmbeddingStats {
  docsByStatus: DocStatusCount[]
  totalChunks: number
  totalSources: number
  chunksBySourceType: ChunksBySourceType[]
  totalBibleVerses: number
  distinctBibleTranslations: number
  /** Rounded to one decimal; null when the chunks table is empty. */
  avgChunkTokens: number | null
}

// Infer row shapes from the query selects so the page never goes out of sync.
type IngestionJobSelect = {
  id: string
  kind: "parse" | "embed" | "reembed"
  status: "pending" | "parsing" | "chunking" | "embedding" | "done" | "failed"
  chunksDone: number | null
  chunksTotal: number | null
  model: string | null
  startedAt: Date | null
  finishedAt: Date | null
  error: string | null
  filename: string
  sourceTitle: string
}

type DocumentSelect = {
  id: string
  filename: string
  sourceTitle: string
  status: "pending" | "parsing" | "chunking" | "embedding" | "done" | "failed"
  pageCount: number | null
  charCount: number | null
  chunkCount: number
  createdAt: Date
}

export type IngestionJobRow = IngestionJobSelect
export type DocumentRow = DocumentSelect

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Aggregate stats for the embeddings dashboard summary cards.
 * Runs six parallel queries and merges the results.
 */
export async function getEmbeddingStats(): Promise<EmbeddingStats> {
  const [
    docsByStatusRows,
    chunksRow,
    sourcesRow,
    chunksByTypeRows,
    bibleRow,
    avgTokenRow,
  ] = await Promise.all([
    // Documents grouped by pipeline status
    db
      .select({
        status: documents.status,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(documents)
      .groupBy(documents.status),

    // Total chunk rows
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(chunks),

    // Total source records
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(sources),

    // Chunk count per source-type (e.g. book, commentary, article)
    db
      .select({
        sourceType: sources.sourceType,
        count: sql<number>`cast(count(${chunks.id}) as int)`,
      })
      .from(chunks)
      .innerJoin(sources, eq(chunks.sourceId, sources.id))
      .groupBy(sources.sourceType),

    // Bible verse count + distinct translation codes
    db
      .select({
        totalVerses: sql<number>`cast(count(*) as int)`,
        distinctTranslations: sql<number>`cast(count(distinct ${bibleVerses.translation}) as int)`,
      })
      .from(bibleVerses),

    // Average token count across all chunks
    db
      .select({
        avg: sql<number | null>`round(avg(${chunks.tokenCount}), 1)`,
      })
      .from(chunks),
  ])

  return {
    docsByStatus: docsByStatusRows,
    totalChunks: chunksRow[0]?.count ?? 0,
    totalSources: sourcesRow[0]?.count ?? 0,
    chunksBySourceType: chunksByTypeRows,
    totalBibleVerses: bibleRow[0]?.totalVerses ?? 0,
    distinctBibleTranslations: bibleRow[0]?.distinctTranslations ?? 0,
    avgChunkTokens: avgTokenRow[0]?.avg ?? null,
  }
}

/**
 * Most-recent ingestion jobs joined to their document filename and source title.
 */
export async function listIngestionJobs({
  limit = 100,
}: { limit?: number } = {}): Promise<IngestionJobRow[]> {
  const rows = await db
    .select({
      id: ingestionJobs.id,
      kind: ingestionJobs.kind,
      status: ingestionJobs.status,
      chunksDone: ingestionJobs.chunksDone,
      chunksTotal: ingestionJobs.chunksTotal,
      model: ingestionJobs.model,
      startedAt: ingestionJobs.startedAt,
      finishedAt: ingestionJobs.finishedAt,
      error: ingestionJobs.error,
      filename: documents.filename,
      sourceTitle: sources.title,
    })
    .from(ingestionJobs)
    .innerJoin(documents, eq(ingestionJobs.documentId, documents.id))
    .innerJoin(sources, eq(documents.sourceId, sources.id))
    .orderBy(desc(ingestionJobs.startedAt))
    .limit(limit)

  return rows as IngestionJobRow[]
}

/**
 * Most-recent documents joined to their source title and a live chunk count.
 */
export async function listDocuments({
  limit = 100,
}: { limit?: number } = {}): Promise<DocumentRow[]> {
  // Subquery: chunk count per document
  const chunkCounts = db
    .select({
      documentId: chunks.documentId,
      count: sql<number>`cast(count(*) as int)`.as("count"),
    })
    .from(chunks)
    .groupBy(chunks.documentId)
    .as("chunk_counts")

  const rows = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      sourceTitle: sources.title,
      status: documents.status,
      pageCount: documents.pageCount,
      charCount: documents.charCount,
      chunkCount: sql<number>`coalesce(${chunkCounts.count}, 0)`,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(sources, eq(documents.sourceId, sources.id))
    .leftJoin(chunkCounts, eq(documents.id, chunkCounts.documentId))
    .orderBy(desc(documents.createdAt))
    .limit(limit)

  return rows as DocumentRow[]
}
