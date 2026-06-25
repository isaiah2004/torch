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

export interface NormalizeOptions {
  /**
   * Skip (rather than throw on) books outside the 66-book Protestant canon —
   * e.g. apocrypha in some Geneva editions. Default false (strict).
   */
  skipUnknownBooks?: boolean
}

function toBookOrNull(value: unknown): BookInfo | null {
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
  return null
}

function resolveBookOrThrow(value: unknown, skip: boolean): BookInfo | null {
  const b = toBookOrNull(value)
  if (b) return b
  if (skip) return null
  throw new Error(`Unrecognized Bible book: ${JSON.stringify(value)}`)
}

function num(value: unknown, label: string): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`Invalid ${label}: ${JSON.stringify(value)}`)
  }
  return n
}

function fromArray(rows: unknown[], translation: string, skip: boolean): VerseRow[] {
  const out: VerseRow[] = []
  for (const raw of rows) {
    const o = raw as Record<string, unknown>
    const book = resolveBookOrThrow(
      firstKey(o, ["book", "book_name", "bookName", "name", "b", "book_number", "bookNumber"]),
      skip,
    )
    if (!book) continue
    out.push({
      translation,
      book: book.name,
      bookNumber: book.number,
      chapter: num(firstKey(o, ["chapter", "c", "chapterNumber"]), "chapter"),
      verse: num(firstKey(o, ["verse", "v", "verseNumber"]), "verse"),
      text: String(firstKey(o, ["text", "t", "verseText", "scripture"]) ?? "").trim(),
    })
  }
  return out
}

/** The canonical scrollmapper shape: { translation, books: [{ name, chapters: [{ chapter, verses }] }] }. */
function fromBooksArray(books: unknown[], translation: string, skip: boolean): VerseRow[] {
  const out: VerseRow[] = []
  for (const rawBook of books) {
    const b = rawBook as Record<string, unknown>
    const book = resolveBookOrThrow(firstKey(b, ["name", "book", "book_name"]), skip)
    if (!book) continue
    const chapters = (b.chapters ?? []) as unknown[]
    for (const rawChapter of chapters) {
      const c = rawChapter as Record<string, unknown>
      const chapter = num(firstKey(c, ["chapter", "c", "number"]), "chapter")
      const verses = (c.verses ?? []) as unknown[]
      for (const rawVerse of verses) {
        const v = rawVerse as Record<string, unknown>
        out.push({
          translation,
          book: book.name,
          bookNumber: book.number,
          chapter,
          verse: num(firstKey(v, ["verse", "v", "number"]), "verse"),
          text: String(firstKey(v, ["text", "t"]) ?? "").trim(),
        })
      }
    }
  }
  return out
}

function fromNested(
  data: Record<string, unknown>,
  translation: string,
  skip: boolean,
): VerseRow[] {
  const out: VerseRow[] = []
  for (const [bookKey, chapters] of Object.entries(data)) {
    const book = resolveBookOrThrow(bookKey, skip)
    if (!book) continue
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

export function normalizeVerseRecords(
  data: unknown,
  translation: string,
  options: NormalizeOptions = {},
): VerseRow[] {
  const skip = options.skipUnknownBooks ?? false
  if (Array.isArray(data)) return fromArray(data, translation, skip)
  if (data && typeof data === "object") {
    const wrapper = data as Record<string, unknown>
    // Canonical scrollmapper export: { translation, books: [...] }.
    if (Array.isArray(wrapper.books)) return fromBooksArray(wrapper.books as unknown[], translation, skip)
    // Some exports wrap rows under a key (e.g. { verses: [...] } or { rows: [...] }).
    for (const key of ["verses", "rows", "data", "resultset"]) {
      if (Array.isArray(wrapper[key])) return fromArray(wrapper[key] as unknown[], translation, skip)
    }
    return fromNested(wrapper, translation, skip)
  }
  throw new Error("Unsupported Bible data shape: expected an array or object.")
}
