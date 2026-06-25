import { describe, expect, it } from "vitest"

import { embedTexts } from "@/lib/ingestion/embed"
import { prepareDocument } from "@/lib/ingestion/pipeline"
import type { EmbeddingModel } from "@/lib/providers/types"

const enc = (s: string) => new TextEncoder().encode(s)

/** Deterministic fake embedder: fixed-width vectors, no network. */
function fakeEmbedder(dims = 8): EmbeddingModel & { calls: number } {
  return {
    model: "fake-embed",
    dimensions: dims,
    calls: 0,
    async embed(texts: string[]) {
      this.calls += texts.length
      return texts.map((t) => {
        const v = new Array(dims).fill(0)
        for (let i = 0; i < t.length; i++) v[i % dims] += t.charCodeAt(i) % 7
        return v
      })
    },
  }
}

describe("embedTexts", () => {
  it("batches and preserves order", async () => {
    const model = fakeEmbedder(4)
    const vecs = await embedTexts(["a", "bb", "ccc", "dddd", "e"], {
      model,
      batchSize: 2,
    })
    expect(vecs).toHaveLength(5)
    expect(model.calls).toBe(5)
    vecs.forEach((v) => expect(v).toHaveLength(4))
  })

  it("rejects wrong-width vectors", async () => {
    const bad: EmbeddingModel = {
      model: "bad",
      dimensions: 4,
      async embed(texts) {
        return texts.map(() => [1, 2, 3]) // width 3 ≠ 4
      },
    }
    await expect(embedTexts(["x"], { model: bad })).rejects.toThrow(/dimension/i)
  })

  it("returns empty for empty input", async () => {
    expect(await embedTexts([], { model: fakeEmbedder() })).toEqual([])
  })
})

describe("prepareDocument", () => {
  it("loads, chunks, and embeds a markdown buffer with one vector per chunk", async () => {
    const md = [
      "# Atonement",
      "",
      "Christ died for sinners. ".repeat(20),
      "",
      "## Substitution",
      "",
      "He bore our sins in his body. ".repeat(20),
    ].join("\n")

    const model = fakeEmbedder(8)
    const prepared = await prepareDocument(
      { data: enc(md), filename: "atonement.md" },
      { embedModel: model, chunk: { targetTokens: 80, overlapTokens: 0 } },
    )

    expect(prepared.format).toBe("markdown")
    expect(prepared.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(prepared.chunks.length).toBeGreaterThan(1)
    expect(prepared.embeddings).toHaveLength(prepared.chunks.length)
    prepared.embeddings.forEach((v) => expect(v).toHaveLength(8))
    // Metadata survived into the chunks.
    expect(prepared.chunks.some((c) => c.meta.chapter === "Atonement")).toBe(true)
  })

  it("produces a stable sha256 for identical bytes", async () => {
    const model = fakeEmbedder()
    const a = await prepareDocument({ data: enc("same"), filename: "a.txt" }, { embedModel: model })
    const b = await prepareDocument({ data: enc("same"), filename: "b.txt" }, { embedModel: model })
    expect(a.sha256).toBe(b.sha256)
  })
})
