import { describe, expect, it } from "vitest"
import type { ZodType } from "zod"

import { LlmReranker } from "@/lib/providers/llm-rerank"
import type { ChatModel, ChatRequest } from "@/lib/providers/types"

/** Fake chat model whose structured() returns canned rankings, capturing the prompt. */
function fakeChat(
  rankings: { index: number; score: number }[],
): ChatModel & { lastPrompt?: string } {
  const model: ChatModel & { lastPrompt?: string } = {
    async generate() {
      throw new Error("not used")
    },
    async *stream() {
      throw new Error("not used")
    },
    async structured<T>(req: ChatRequest, schema: ZodType<T>): Promise<T> {
      model.lastPrompt = req.messages.map((m) => m.content).join("\n")
      // Validate through the real schema the reranker passes, like a provider would.
      return schema.parse({ rankings })
    },
  }
  return model
}

describe("LlmReranker", () => {
  it("orders by model score and truncates to topN", async () => {
    const chat = fakeChat([
      { index: 0, score: 0.2 },
      { index: 1, score: 0.95 },
      { index: 2, score: 0.6 },
    ])
    const reranker = new LlmReranker(chat)
    const out = await reranker.rerank("grace", ["a", "b", "c"], 2)
    expect(out.map((s) => s.index)).toEqual([1, 2])
    expect(out[0].score).toBeCloseTo(0.95)
    // The query and passages reach the prompt.
    expect(chat.lastPrompt).toContain("grace")
    expect(chat.lastPrompt).toContain("[0]")
  })

  it("drops out-of-range indices the model might hallucinate", async () => {
    const chat = fakeChat([
      { index: 0, score: 0.5 },
      { index: 9, score: 0.99 }, // invalid
    ])
    const out = await new LlmReranker(chat).rerank("q", ["only-one"])
    expect(out).toEqual([{ index: 0, score: 0.5 }])
  })

  it("returns empty for no docs without calling the model", async () => {
    const chat = fakeChat([])
    expect(await new LlmReranker(chat).rerank("q", [])).toEqual([])
    expect(chat.lastPrompt).toBeUndefined()
  })
})
