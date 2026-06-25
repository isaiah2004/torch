import { describe, expect, it } from "vitest"

import { cleanText } from "@/lib/ingestion/clean"
import { chunkDocument } from "@/lib/ingestion/chunk"
import { markdownLoader } from "@/lib/ingestion/loaders"
import { countTokens } from "@/lib/ingestion/tokenize"
import type { LoaderResult } from "@/lib/ingestion/types"

const enc = (s: string) => new TextEncoder().encode(s)

describe("cleanText", () => {
  it("de-hyphenates line-break splits", () => {
    expect(cleanText("justifica-\ntion by faith")).toBe("justification by faith")
  })
  it("removes standalone page-number lines", () => {
    expect(cleanText("Real content.\n42\nMore content.")).toBe(
      "Real content.\nMore content.",
    )
  })
  it("collapses runs of whitespace and blank lines", () => {
    expect(cleanText("a   b\n\n\n\nc")).toBe("a b\n\nc")
  })
})

describe("chunkDocument", () => {
  const paragraph = (label: string) =>
    `${label}: ` + "Grace is the unmerited favor of God toward sinners. ".repeat(12)

  function bigMarkdown() {
    return [
      "# Justification",
      "",
      paragraph("J1"),
      "",
      paragraph("J2"),
      "",
      "## Imputation",
      "",
      paragraph("I1"),
      "",
      "# Sanctification",
      "",
      paragraph("S1"),
    ].join("\n")
  }

  it("produces sequential ordinals and never exceeds the hard ceiling", async () => {
    const loaded = await markdownLoader.load({ data: enc(bigMarkdown()) })
    const chunks = chunkDocument(loaded, {
      targetTokens: 120,
      overlapTokens: 24,
      maxTokens: 400,
    })
    expect(chunks.length).toBeGreaterThan(1)
    chunks.forEach((c, i) => {
      expect(c.ordinal).toBe(i)
      expect(c.tokenCount).toBeLessThanOrEqual(400)
      expect(c.tokenCount).toBe(countTokens(c.content))
    })
  })

  it("never mixes two top-level sections in one chunk", async () => {
    const loaded = await markdownLoader.load({ data: enc(bigMarkdown()) })
    const chunks = chunkDocument(loaded, { targetTokens: 1000, overlapTokens: 0 })
    for (const c of chunks) {
      const inJust = c.content.includes("Justification") || /J\d:|I1:/.test(c.content)
      const inSanct = /S1:/.test(c.content)
      expect(inJust && inSanct).toBe(false)
    }
  })

  it("carries heading path / chapter / section into chunk metadata", async () => {
    const loaded = await markdownLoader.load({ data: enc(bigMarkdown()) })
    const chunks = chunkDocument(loaded, { targetTokens: 80, overlapTokens: 0 })
    const imp = chunks.find((c) => c.content.includes("I1:"))
    expect(imp).toBeDefined()
    expect(imp!.meta.chapter).toBe("Justification")
    expect(imp!.meta.section).toBe("Imputation")
    expect(imp!.meta.headingPath).toEqual(["Justification", "Imputation"])
  })

  it("overlaps consecutive chunks within a section", async () => {
    const loaded = await markdownLoader.load({ data: enc(bigMarkdown()) })
    const chunks = chunkDocument(loaded, { targetTokens: 90, overlapTokens: 40 })
    // Find two adjacent chunks in the same chapter and assert shared text.
    let foundOverlap = false
    for (let i = 1; i < chunks.length; i++) {
      if (chunks[i].meta.chapter !== chunks[i - 1].meta.chapter) continue
      const prevTail = chunks[i - 1].content.split(/\s+/).slice(-6).join(" ")
      if (prevTail && chunks[i].content.includes(prevTail.split(" ")[0])) {
        foundOverlap = true
        break
      }
    }
    expect(foundOverlap).toBe(true)
  })

  it("derives page ranges from page spans", () => {
    const text = "Alpha paragraph.\n\nBravo paragraph.\n\nCharlie paragraph."
    const doc: LoaderResult = {
      text,
      pages: [
        { page: 1, start: 0, end: text.indexOf("Bravo") },
        { page: 2, start: text.indexOf("Bravo"), end: text.length },
      ],
    }
    const chunks = chunkDocument(doc, { targetTokens: 1000, overlapTokens: 0 })
    expect(chunks).toHaveLength(1)
    expect(chunks[0].meta.pageStart).toBe(1)
    expect(chunks[0].meta.pageEnd).toBe(2)
  })
})
