/**
 * Shared types for the ingestion pipeline: parse → clean → chunk → embed → store.
 *
 * Loaders normalize every supported format into a single {@link LoaderResult}
 * so the cleaner and chunker never need to know whether the source was a PDF,
 * an EPUB, Markdown, HTML, or plain text. Structural hints (page boundaries,
 * heading offsets) are carried as character offsets into `text` so the chunker
 * can preserve theological context (ARCHITECTURE.md §11).
 */
import type { ChunkMeta } from "@/lib/db/schema"

/** A page boundary expressed as a half-open character range `[start, end)` in `text`. */
export interface PageSpan {
  page: number
  start: number
  end: number
}

/** A heading occurrence: its depth (1 = top level) and the character offset where it begins. */
export interface HeadingSpan {
  /** 1-based depth (h1 → 1, h2 → 2, …; Markdown `#` count). */
  depth: number
  title: string
  /** Character offset into `text` where this heading's section starts. */
  offset: number
}

/**
 * Normalized output of a loader. `text` is the full document body; `pages` and
 * `headings` are present only when the source format exposes that structure.
 */
export interface LoaderResult {
  text: string
  pages?: PageSpan[]
  headings?: HeadingSpan[]
}

/** Raw input handed to a loader. */
export interface LoaderInput {
  data: Uint8Array
  filename?: string
  mimeType?: string
}

export interface Loader {
  load(input: LoaderInput): Promise<LoaderResult>
}

/** A chunk ready to embed and store (mirrors the `chunks` table, sans ids/vector). */
export interface ChunkInput {
  ordinal: number
  content: string
  tokenCount: number
  meta: ChunkMeta
}

export type SupportedFormat = "pdf" | "epub" | "markdown" | "html" | "text"
