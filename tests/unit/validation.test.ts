import { describe, expect, it } from "vitest"

import { askRequestSchema } from "@/lib/validation/chat"

describe("askRequestSchema", () => {
  it("accepts a minimal valid question and defaults isPrivate to false", () => {
    const parsed = askRequestSchema.parse({ question: "Why does God allow suffering?" })
    expect(parsed.isPrivate).toBe(false)
    expect(parsed.question).toContain("suffering")
  })

  it("rejects an empty question", () => {
    expect(askRequestSchema.safeParse({ question: "" }).success).toBe(false)
  })

  it("rejects an over-long question", () => {
    const long = "a".repeat(4001)
    expect(askRequestSchema.safeParse({ question: long }).success).toBe(false)
  })

  it("rejects a non-uuid conversationId", () => {
    const res = askRequestSchema.safeParse({
      question: "ok",
      conversationId: "not-a-uuid",
    })
    expect(res.success).toBe(false)
  })
})
