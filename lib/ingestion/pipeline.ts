/**
 * Ingestion pipeline: parse → clean → chunk → embed → store (ARCHITECTURE.md §11).
 *
 * Two entry points:
 *  - {@link prepareDocument} is pure I/O over a buffer (no DB): load → chunk →
 *    embed. It is the unit-testable core (inject a fake embedding model).
 *  - {@link ingestDocument} wraps it with persistence: sha256 dedupe, `documents`
 *    + `chunks` rows, `ingestion_jobs` tracking, and status transitions, with a
 *    structured log at every step.
 */
import { createHash } from "node:crypto"

import { chunks, documents, ingestionJobs } from "@/lib/db/schema"
import { logger } from "@/lib/logging"
import { eq, sql } from "drizzle-orm"

import type { Database } from "@/lib/db"

/** Lazily resolve the default DB client so importing this module never opens a connection. */
async function resolveDb(injected?: Database): Promise<Database> {
  if (injected) return injected
  return (await import("@/lib/db")).db
}

import { chunkDocument, type ChunkOptions } from "./chunk"
import { embedTexts } from "./embed"
import { detectFormat, loadDocument } from "./loaders"
import type { ChunkInput, LoaderInput, LoaderResult, SupportedFormat } from "./types"
import type { EmbeddingModel } from "@/lib/providers/types"

export interface PreparedDocument {
  sha256: string
  format: SupportedFormat
  loaded: LoaderResult
  chunks: ChunkInput[]
  embeddings: number[][]
  charCount: number
  pageCount?: number
}

export interface PrepareOptions {
  embedModel?: EmbeddingModel
  chunk?: ChunkOptions
  requestId?: string
}

function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex")
}

/** Load, chunk, and embed a document buffer. No database access. */
export async function prepareDocument(
  input: LoaderInput,
  options: PrepareOptions = {},
): Promise<PreparedDocument> {
  const format = detectFormat(input)
  if (!format) {
    throw new Error(
      `Unsupported document type (mime=${input.mimeType ?? "?"}, file=${input.filename ?? "?"}).`,
    )
  }
  const sha256 = sha256Hex(input.data)
  const log = logger.child({ requestId: options.requestId })

  const loaded = await loadDocument(input)
  log.info("ingestion.parsed", {
    data: { format, chars: loaded.text.length, pages: loaded.pages?.length },
  })

  const chunkInputs = chunkDocument(loaded, options.chunk)
  log.info("ingestion.chunked", { data: { chunks: chunkInputs.length } })

  const embeddings = await embedTexts(
    chunkInputs.map((c) => c.content),
    { model: options.embedModel, requestId: options.requestId },
  )
  log.info("ingestion.embedded", {
    data: { vectors: embeddings.length, dims: embeddings[0]?.length },
  })

  return {
    sha256,
    format,
    loaded,
    chunks: chunkInputs,
    embeddings,
    charCount: loaded.text.length,
    pageCount: loaded.pages?.length,
  }
}

export interface IngestDocumentInput {
  sourceId: string
  filename: string
  mimeType?: string
  data: Uint8Array
}

export interface IngestResult {
  documentId: string
  chunkCount: number
  /** True when an identical file (same sha256) was already ingested. */
  deduped: boolean
}

export interface IngestOptions extends PrepareOptions {
  db?: Database
  /** Rows per chunk INSERT. Default 200. */
  insertBatchSize?: number
}

/**
 * Ingest a document end-to-end and persist it. Idempotent by `sha256`: an
 * identical file already present short-circuits with `deduped: true`.
 */
export async function ingestDocument(
  input: IngestDocumentInput,
  options: IngestOptions = {},
): Promise<IngestResult> {
  const database = await resolveDb(options.db)
  const sha256 = sha256Hex(input.data)
  const log = logger.child({ requestId: options.requestId })

  const existing = await database
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.sha256, sha256))
    .limit(1)
  if (existing.length) {
    log.info("ingestion.deduped", { documentId: existing[0].id, data: { sha256 } })
    return { documentId: existing[0].id, chunkCount: 0, deduped: true }
  }

  const [doc] = await database
    .insert(documents)
    .values({
      sourceId: input.sourceId,
      filename: input.filename,
      mimeType: input.mimeType,
      sha256,
      status: "parsing",
    })
    .returning({ id: documents.id })
  const documentId = doc.id

  const [job] = await database
    .insert(ingestionJobs)
    .values({
      documentId,
      kind: "parse",
      status: "parsing",
      model: options.embedModel?.model,
      startedAt: new Date(),
    })
    .returning({ id: ingestionJobs.id })

  try {
    const prepared = await prepareDocument(
      { data: input.data, filename: input.filename, mimeType: input.mimeType },
      options,
    )

    await database
      .update(documents)
      .set({
        status: "embedding",
        pageCount: prepared.pageCount,
        charCount: prepared.charCount,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
    await database
      .update(ingestionJobs)
      .set({ status: "embedding", chunksTotal: prepared.chunks.length })
      .where(eq(ingestionJobs.id, job.id))

    const rows = prepared.chunks.map((c, i) => ({
      documentId,
      sourceId: input.sourceId,
      ordinal: c.ordinal,
      content: c.content,
      tokenCount: c.tokenCount,
      meta: c.meta,
      embedding: prepared.embeddings[i],
    }))

    const batchSize = Math.max(1, options.insertBatchSize ?? 200)
    for (let i = 0; i < rows.length; i += batchSize) {
      await database.insert(chunks).values(rows.slice(i, i + batchSize))
    }

    await database
      .update(documents)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(documents.id, documentId))
    await database
      .update(ingestionJobs)
      .set({
        status: "done",
        chunksDone: rows.length,
        finishedAt: new Date(),
      })
      .where(eq(ingestionJobs.id, job.id))

    log.info("ingestion.stored", {
      documentId,
      data: { chunks: rows.length },
    })
    return { documentId, chunkCount: rows.length, deduped: false }
  } catch (err) {
    const message = (err as Error).message
    await database
      .update(documents)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(eq(documents.id, documentId))
    await database
      .update(ingestionJobs)
      .set({ status: "failed", error: message, finishedAt: new Date() })
      .where(eq(ingestionJobs.id, job.id))
    log.error("ingestion.failed", { documentId, data: { error: message } })
    throw err
  }
}

/** Convenience: total chunk count for a document (used by admin views/tests). */
export async function countChunks(
  documentId: string,
  injectedDb?: Database,
): Promise<number> {
  const database = await resolveDb(injectedDb)
  const [row] = await database
    .select({ n: sql<number>`count(*)::int` })
    .from(chunks)
    .where(eq(chunks.documentId, documentId))
  return row?.n ?? 0
}
