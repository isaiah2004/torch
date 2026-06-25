/**
 * Parse a scripture reference like "John 3:16", "Rom 8:28-30",
 * "1 Corinthians 13:4-7", or a whole chapter "Psalm 23" into a structured,
 * canonicalized form. Pure (no DB) so it is fully unit-testable; `lookupPassage`
 * (./lookup) turns the result into verses.
 */
import { resolveBook } from "./books"

export interface ScriptureReference {
  book: string
  bookNumber: number
  chapter: number
  /** Inclusive verse range. When omitted (whole-chapter ref), both are undefined. */
  verseStart?: number
  verseEnd?: number
}

// e.g. "1 Corinthians 13:4-7" → book="1 Corinthians", ch=13, v=4..7
//      "Psalm 23"            → book="Psalm", ch=23, no verses
const REF = /^\s*((?:[1-3]\s*|i{1,3}\s+)?[A-Za-z][A-Za-z.\s]*?)\s+(\d+)(?::(\d+)(?:\s*[-–]\s*(\d+))?)?\s*$/

export function parseReference(input: string): ScriptureReference | null {
  const m = REF.exec(input)
  if (!m) return null

  const book = resolveBook(m[1])
  if (!book) return null

  const chapter = Number(m[2])
  if (!Number.isInteger(chapter) || chapter < 1) return null

  const verseStart = m[3] ? Number(m[3]) : undefined
  let verseEnd = m[4] ? Number(m[4]) : verseStart
  if (verseStart !== undefined && verseEnd !== undefined && verseEnd < verseStart) {
    verseEnd = verseStart
  }

  return {
    book: book.name,
    bookNumber: book.number,
    chapter,
    verseStart,
    verseEnd,
  }
}

/** Render a canonical reference back to a display string. */
export function formatReference(ref: ScriptureReference): string {
  if (ref.verseStart === undefined) return `${ref.book} ${ref.chapter}`
  if (ref.verseEnd === undefined || ref.verseEnd === ref.verseStart) {
    return `${ref.book} ${ref.chapter}:${ref.verseStart}`
  }
  return `${ref.book} ${ref.chapter}:${ref.verseStart}-${ref.verseEnd}`
}
