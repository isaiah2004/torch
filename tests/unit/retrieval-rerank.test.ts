import { describe, expect, it } from "vitest"

import { rerankChunks } from "@/lib/retrieval/rerank"
import type { RetrievedChunk } from "@/lib/retrieval/types"
import type { Reranker } from "@/lib/providers/types"

function chunk(id: string, score: number, content = id): RetrievedChunk {
  return {
    chunkId: id,
    documentId: "doc",
    sourceId: "src",
    ordinal: 0,
    content,
    meta: {},
    score,
    source: { id: "src", title: "Work" },
  }
}

describe("rerankChunks", () => {
  it("returns empty for no candidates", async () => {
    const r = await rerankChunks("q", [], { reranker: null })
    expect(r).toEqual({ selected: [], rejected: [], reranked: false })
  })

  it("falls back to vector-similarity order when no reranker", async () => {
    const cands = [chunk("a", 0.2), chunk("b", 0.9), chunk("c", 0.5)]
    const r = await rerankChunks("q", cands, { reranker: null, topN: 2 })
    expect(r.reranked).toBe(false)
    expect(r.selected.map((c) => c.chunkId)).toEqual(["b", "c"])
    expect(r.rejected.map((c) => c.chunkId)).toEqual(["a"])
  })

  it("uses the reranker ordering and scores when provided", async () => {
    // Reranker prefers the candidate that the vector score ranked last.
    const reranker: Reranker = {
      async rerank(_q, docs) {
        return docs
          .map((_d, index) => ({ index, score: index === 2 ? 0.99 : 0.1 + index * 0.01 }))
          .sort((a, b) => b.score - a.score)
      },
    }
    const cands = [chunk("a", 0.9), chunk("b", 0.8), chunk("c", 0.1)]
    const r = await rerankChunks("q", cands, { reranker, topN: 1 })
    expect(r.reranked).toBe(true)
    expect(r.selected.map((c) => c.chunkId)).toEqual(["c"])
    expect(r.selected[0].score).toBeCloseTo(0.99)
  })

  it("falls back to vector order when the reranker throws", async () => {
    const flaky: Reranker = {
      async rerank() {
        throw new Error("reranker down")
      },
    }
    const cands = [chunk("a", 0.3), chunk("b", 0.9)]
    const r = await rerankChunks("q", cands, { reranker: flaky })
    expect(r.reranked).toBe(false)
    expect(r.selected.map((c) => c.chunkId)).toEqual(["b", "a"])
  })

  it("drops evidence below minScore", async () => {
    const reranker: Reranker = {
      async rerank(_q, docs) {
        const scores = [0.95, 0.4, 0.05]
        return docs.map((_d, index) => ({ index, score: scores[index] }))
      },
    }
    const cands = [chunk("a", 1), chunk("b", 1), chunk("c", 1)]
    const r = await rerankChunks("q", cands, { reranker, topN: 8, minScore: 0.5 })
    expect(r.selected.map((c) => c.chunkId)).toEqual(["a"])
    // b and c fell below the floor → rejected.
    expect(r.rejected.map((c) => c.chunkId).sort()).toEqual(["b", "c"])
  })
})
