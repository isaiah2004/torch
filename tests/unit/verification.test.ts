import { describe, expect, it } from "vitest"

import { verifyAnswer } from "@/lib/verification/verify"
import type { RetrievedChunk } from "@/lib/retrieval/types"

function chunk(over: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    chunkId: "c1",
    documentId: "d1",
    sourceId: "s1",
    ordinal: 0,
    content:
      "For God so loved the world, that he gave his only begotten Son, " +
      "that whosoever believeth in him should not perish, but have everlasting life.",
    meta: {},
    score: 0.8,
    source: { id: "s1", title: "Gospel of John" },
    ...over,
  }
}

describe("verifyAnswer", () => {
  it("verifies a real verbatim quote drawn from the evidence", () => {
    const answer =
      'Jesus taught that "For God so loved the world, that he gave his only ' +
      'begotten Son" [1], showing the depth of God\'s love.'
    const result = verifyAnswer(answer, [chunk()])
    expect(result.verified).toBe(true)
    expect(result.quotesChecked).toBe(1)
    expect(result.unsupportedQuotes).toEqual([])
    expect(result.citationIssues).toEqual([])
  })

  it("flags a fabricated quote not present in the evidence", () => {
    const answer =
      'Calvin wrote that "predestination is the eternal decree of the council" [1].'
    const result = verifyAnswer(answer, [chunk()])
    expect(result.verified).toBe(false)
    expect(result.unsupportedQuotes.length).toBeGreaterThan(0)
  })

  it("flags an out-of-range citation marker", () => {
    const answer = "This is well supported by the sources [99]."
    const result = verifyAnswer(answer, [chunk()])
    expect(result.verified).toBe(false)
    expect(result.citationIssues.length).toBeGreaterThan(0)
  })

  it("treats an empty answer as trivially verified", () => {
    const result = verifyAnswer("", [chunk()])
    expect(result.verified).toBe(true)
    expect(result.quotesChecked).toBe(0)
    expect(result.unsupportedQuotes).toEqual([])
    expect(result.citationIssues).toEqual([])
  })
})
