import { describe, expect, it } from "vitest"

import { resolveBook } from "@/lib/scripture/books"
import { formatReference, parseReference } from "@/lib/scripture/reference"
import { normalizeVerseRecords } from "@/lib/scripture/import"

describe("resolveBook", () => {
  it("resolves full names, abbreviations, and numbered books", () => {
    expect(resolveBook("Genesis")?.number).toBe(1)
    expect(resolveBook("gen")?.name).toBe("Genesis")
    expect(resolveBook("1 cor")?.name).toBe("1 Corinthians")
    expect(resolveBook("Ps")?.name).toBe("Psalms")
    expect(resolveBook("Song of Songs")?.name).toBe("Song of Solomon")
    expect(resolveBook("Rev.")?.name).toBe("Revelation")
  })
  it("returns undefined for unknown books", () => {
    expect(resolveBook("Hezekiah")).toBeUndefined()
  })
})

describe("parseReference", () => {
  it("parses a single verse", () => {
    expect(parseReference("John 3:16")).toEqual({
      book: "John",
      bookNumber: 43,
      chapter: 3,
      verseStart: 16,
      verseEnd: 16,
    })
  })
  it("parses a verse range and numbered books", () => {
    expect(parseReference("1 Corinthians 13:4-7")).toMatchObject({
      book: "1 Corinthians",
      chapter: 13,
      verseStart: 4,
      verseEnd: 7,
    })
    expect(parseReference("Rom 8:28–30")?.verseEnd).toBe(30) // en-dash
  })
  it("parses a whole-chapter reference", () => {
    expect(parseReference("Psalm 23")).toMatchObject({
      book: "Psalms",
      chapter: 23,
      verseStart: undefined,
      verseEnd: undefined,
    })
  })
  it("normalizes a reversed range", () => {
    expect(parseReference("John 3:16-10")?.verseEnd).toBe(16)
  })
  it("rejects nonsense", () => {
    expect(parseReference("not a reference")).toBeNull()
    expect(parseReference("Hezekiah 3:1")).toBeNull()
  })
  it("round-trips through formatReference", () => {
    expect(formatReference(parseReference("Romans 8:28-30")!)).toBe("Romans 8:28-30")
    expect(formatReference(parseReference("John 3:16")!)).toBe("John 3:16")
    expect(formatReference(parseReference("Psalm 23")!)).toBe("Psalms 23")
  })
})

describe("normalizeVerseRecords", () => {
  it("normalizes an array with loose keys", () => {
    const rows = normalizeVerseRecords(
      [
        { book: "John", chapter: 3, verse: 16, text: "For God so loved..." },
        { b: 1, c: 1, v: 1, t: "In the beginning..." },
      ],
      "KJV",
    )
    expect(rows).toEqual([
      { translation: "KJV", book: "John", bookNumber: 43, chapter: 3, verse: 16, text: "For God so loved..." },
      { translation: "KJV", book: "Genesis", bookNumber: 1, chapter: 1, verse: 1, text: "In the beginning..." },
    ])
  })

  it("normalizes a nested book→chapter→verse object", () => {
    const rows = normalizeVerseRecords(
      { Genesis: { "1": { "1": "In the beginning...", "2": "And the earth..." } } },
      "WEB",
    )
    expect(rows).toHaveLength(2)
    expect(rows[1]).toMatchObject({ book: "Genesis", chapter: 1, verse: 2, translation: "WEB" })
  })

  it("unwraps a { verses: [...] } wrapper", () => {
    const rows = normalizeVerseRecords(
      { verses: [{ book_number: 43, chapter: 3, verse: 16, text: "x" }] },
      "ASV",
    )
    expect(rows[0]).toMatchObject({ book: "John", bookNumber: 43 })
  })

  it("throws on an unknown book", () => {
    expect(() => normalizeVerseRecords([{ book: "Hezekiah", chapter: 1, verse: 1, text: "x" }], "KJV")).toThrow(
      /Unrecognized Bible book/,
    )
  })
})
