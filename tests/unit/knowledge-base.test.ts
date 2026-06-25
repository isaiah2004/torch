import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { parseKnowledgeBase } from "@/lib/ingestion/knowledge-base"

const SNIPPET = `
# KB
## Part 1 — 30 Books
### Systematic
1. **Wayne Grudem — *Systematic Theology*** (BAP/REF). Accessible, heavily
   Scripture-cited, the most widely used evangelical systematics.
2. **Herman Bavinck — *Reformed Dogmatics* (4 vols)** (REF). Deep, irenic.

## Part 2 — 30 Websites
### Ministries
1. **Desiring God** — desiringgod.org (REF; John Piper). Deep archive.
2. **9Marks** — 9marks.org (BAP/REF). Ecclesiology.
`

describe("parseKnowledgeBase", () => {
  it("parses books: author, title, primary tradition", () => {
    const seeds = parseKnowledgeBase(SNIPPET)
    const grudem = seeds.find((s) => s.title === "Systematic Theology")
    expect(grudem).toMatchObject({
      author: "Wayne Grudem",
      tradition: "BAP",
      sourceType: "book",
      trustTier: 1,
    })
    // Title strips the "(4 vols)" annotation.
    expect(seeds.find((s) => s.title === "Reformed Dogmatics")).toBeDefined()
  })

  it("parses websites: title, url, tradition, person", () => {
    const seeds = parseKnowledgeBase(SNIPPET)
    const dg = seeds.find((s) => s.title === "Desiring God")
    expect(dg).toMatchObject({
      url: "https://desiringgod.org",
      tradition: "REF",
      author: "John Piper",
      sourceType: "website",
    })
    const nineMarks = seeds.find((s) => s.title === "9Marks")
    expect(nineMarks?.url).toBe("https://9marks.org")
    expect(nineMarks?.tradition).toBe("BAP")
  })

  it("parses the real knowledge base into ~60 sources", () => {
    const path = fileURLToPath(
      new URL("../../protestant-theology-knowledge-base.md", import.meta.url),
    )
    const md = readFileSync(path, "utf8")
    const seeds = parseKnowledgeBase(md)
    const books = seeds.filter((s) => s.sourceType === "book")
    const sites = seeds.filter((s) => s.sourceType === "website")
    expect(books.length).toBe(30)
    expect(sites.length).toBe(30)
    // Every seed has a non-empty title; websites carry a URL.
    expect(seeds.every((s) => s.title.length > 0)).toBe(true)
    expect(sites.every((s) => Boolean(s.url))).toBe(true)
  })
})
