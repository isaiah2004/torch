/**
 * Normalize Bible verse data into rows for the `bible_verses` table.
 *
 * Tolerates the common public-domain export shapes (e.g. from
 * scrollmapper/bible_databases): an array of verse objects with loosely-named
 * keys, or a nested `{ book: { chapter: { verse: text } } }` object. Book names
 * or numbers are canonicalized via the 66-book canon; unknown books throw so a
 * bad import fails loudly rather than silently dropping verses. Pure (no DB) —
 * scripts/load-bible.ts handles persistence.
 */
import { CANON, resolveBook, type BookInfo } from "./books"

export interface VerseRow {
  translation: string
  book: string
  bookNumber: number
  chapter: number
  verse: number
  text: string
}

const BY_NUMBER = new Map<number, BookInfo>(CANON.map((b) => [b.number, b]))

function firstKey(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k]
  }
  return undefined
}

function toBook(value: unknown): BookInfo {
  if (typeof value === "number") {
    const b = BY_NUMBER.get(value)
    if (b) return b
  }
  if (typeof value === "string") {
    const asNum = /^\d+$/.test(value.trim()) ? Number(value) : NaN
    if (!Number.isNaN(asNum) && BY_NUMBER.has(asNum)) return BY_NUMBER.get(asNum)!
    const b = resolveBook(value)
    if (b) return b
  }
  throw new Error(`Unrecognized Bible book: ${JSON.stringify(value)}`)
}

function num(value: unknown, label: string): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(value)}`)
  }
  return n
}

function fromArray(rows: unknown[], translation: string): VerseRow[] {
  return rows.map((raw) => {
    const o = raw as Record<string, unknown>
    const book = toBook(
      firstKey(o, ["book", "book_name", "bookName", "name", "b", "book_number", "bookNumber"]),
    )
    const chapter = num(firstKey(o, ["chapter", "c", "chapterNumber"]), "chapter")
    const verse = num(firstKey(o, ["verse", "v", "verseNumber"]), "verse")
    const text = String(firstKey(o, ["text", "t", "verseText", "scripture"]) ?? "").trim()
    return { translation, book: book.name, bookNumber: book.number, chapter, verse, text }
  })
}

function fromNested(
  data: Record<string, unknown>,
  translation: string,
): VerseRow[] {
  const out: VerseRow[] = []
  for (const [bookKey, chapters] of Object.entries(data)) {
    const book = toBook(bookKey)
    for (const [chapterKey, verses] of Object.entries(chapters as Record<string, unknown>)) {
      const chapter = num(chapterKey, "chapter")
      for (const [verseKey, text] of Object.entries(verses as Record<string, unknown>)) {
        out.push({
          translation,
          book: book.name,
          bookNumber: book.number,
          chapter,
          verse: num(verseKey, "verse"),
          text: String(text).trim(),
        })
      }
    }
  }
  return out
}

export function normalizeVerseRecords(data: unknown, translation: string): VerseRow[] {
  if (Array.isArray(data)) return fromArray(data, translation)
  if (data && typeof data === "object") {
    // Some exports wrap rows under a key (e.g. { verses: [...] } or { rows: [...] }).
    const wrapper = data as Record<string, unknown>
    for (const key of ["verses", "rows", "data", "resultset"]) {
      if (Array.isArray(wrapper[key])) return fromArray(wrapper[key] as unknown[], translation)
    }
    return fromNested(wrapper, translation)
  }
  throw new Error("Unsupported Bible data shape: expected an array or object.")
}
