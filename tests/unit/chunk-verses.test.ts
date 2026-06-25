import { describe, expect, it } from "vitest"

import { chunkVerses, type VerseInput } from "@/lib/scripture/chunk-verses"

function verse(book: string, bookNumber: number, chapter: number, v: number, text: string): VerseInput {
  return { book, bookNumber, chapter, verse: v, text }
}

describe("chunkVerses", () => {
  it("never crosses a chapter or book boundary", () => {
    const verses = [
      verse("John", 43, 3, 16, "For God so loved the world"),
      verse("John", 43, 3, 17, "For God sent not his Son to condemn"),
      verse("John", 43, 4, 1, "When therefore the Lord knew"),
      verse("Acts", 44, 1, 1, "The former treatise have I made"),
    ]
    const chunks = chunkVerses(verses, { targetTokens: 10000 })
    // 3 groups: John 3, John 4, Acts 1.
    expect(chunks).toHaveLength(3)
    expect(chunks[0].meta).toMatchObject({ book: "John", chapterNumber: 3, verseStart: 16, verseEnd: 17 })
    expect(chunks[1].meta).toMatchObject({ book: "John", chapterNumber: 4, verseStart: 1, verseEnd: 1 })
    expect(chunks[2].meta).toMatchObject({ book: "Acts", chapterNumber: 1 })
  })

  it("packs consecutive verses up to the token budget", () => {
    const verses = Array.from({ length: 20 }, (_, i) =>
      verse("Psalms", 19, 119, i + 1, "Blessed are the undefiled in the way ".repeat(3)),
    )
    const chunks = chunkVerses(verses, { targetTokens: 60 })
    expect(chunks.length).toBeGreaterThan(1)
    // Sequential ordinals, contiguous non-overlapping verse ranges.
    chunks.forEach((c, i) => expect(c.ordinal).toBe(i))
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].meta.verseStart).toBe((chunks[i - 1].meta.verseEnd ?? 0) + 1)
    }
  })

  it("keeps verse numbers inline and builds a citation range", () => {
    const chunks = chunkVerses([
      verse("Romans", 45, 8, 28, "And we know that all things work together for good"),
      verse("Romans", 45, 8, 29, "For whom he did foreknow"),
    ])
    expect(chunks[0].content).toMatch(/^28 .*29 /)
    expect(chunks[0].meta.section).toBe("Romans 8:28-29")
    expect(chunks[0].meta.headingPath).toEqual(["Romans", "Chapter 8"])
  })
})
