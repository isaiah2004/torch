/**
 * Group Bible verses into passage chunks for embedding into the RAG corpus.
 *
 * Chunks never cross a chapter boundary and pack consecutive verses up to a
 * token budget. Each chunk carries structured scripture metadata (book,
 * chapter, verse range) so retrieved Scripture can be cited precisely, and the
 * content keeps verse numbers inline so the model can attribute quotes.
 */
import type { ChunkMeta } from "@/lib/db/schema"

import { countTokens } from "@/lib/ingestion/tokenize"

export interface VerseInput {
  book: string
  bookNumber: number
  chapter: number
  verse: number
  text: string
}

export interface VerseChunk {
  ordinal: number
  content: string
  tokenCount: number
  meta: ChunkMeta
}

export interface ChunkVersesOptions {
  /** Target tokens per passage chunk. Default 220. */
  targetTokens?: number
}

function makeChunk(ordinal: number, verses: VerseInput[]): VerseChunk {
  const first = verses[0]
  const last = verses[verses.length - 1]
  const content = verses.map((v) => `${v.verse} ${v.text}`).join(" ").replace(/\s+/g, " ").trim()
  const range =
    first.verse === last.verse
      ? `${first.book} ${first.chapter}:${first.verse}`
      : `${first.book} ${first.chapter}:${first.verse}-${last.verse}`
  return {
    ordinal,
    content,
    tokenCount: countTokens(content),
    meta: {
      book: first.book,
      chapterNumber: first.chapter,
      verseStart: first.verse,
      verseEnd: last.verse,
      chapter: `${first.book} ${first.chapter}`,
      section: range,
      headingPath: [first.book, `Chapter ${first.chapter}`],
    },
  }
}

/**
 * Chunk verses (already ordered by book → chapter → verse) into passages.
 */
export function chunkVerses(
  verses: VerseInput[],
  options: ChunkVersesOptions = {},
): VerseChunk[] {
  const targetTokens = options.targetTokens ?? 220
  const chunks: VerseChunk[] = []
  let current: VerseInput[] = []
  let currentTokens = 0

  const flush = () => {
    if (current.length) {
      chunks.push(makeChunk(chunks.length, current))
      current = []
      currentTokens = 0
    }
  }

  for (const v of verses) {
    const boundary =
      current.length > 0 &&
      (current[0].book !== v.book || current[0].chapter !== v.chapter)
    const vTokens = countTokens(v.text)

    if (boundary || (current.length > 0 && currentTokens + vTokens > targetTokens)) {
      flush()
    }
    current.push(v)
    currentTokens += vTokens
  }
  flush()

  return chunks
}
