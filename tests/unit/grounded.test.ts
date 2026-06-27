import { describe, expect, it } from "vitest"

import {
  buildGroundedMessages,
  citationsFromEvidence,
  estimateConfidence,
  formatEvidence,
  TORCH_SYSTEM_PROMPT,
} from "@/lib/chat/grounded"
import type { RetrievedChunk } from "@/lib/retrieval/types"

function chunk(over: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    chunkId: "c1",
    documentId: "d1",
    sourceId: "s1",
    ordinal: 0,
    content: "Justification is by faith alone.",
    meta: { pageStart: 42, headingPath: ["Justification"] },
    score: 0.8,
    source: { id: "s1", title: "Institutes", author: "John Calvin", tradition: "REF" },
    ...over,
  }
}

describe("grounded answer construction", () => {
  it("system prompt forbids fabrication and demands honesty", () => {
    expect(TORCH_SYSTEM_PROMPT).toMatch(/NO FABRICATION/)
    expect(TORCH_SYSTEM_PROMPT).toMatch(/could not find a reliable source/i)
  })

  it("numbers evidence with author, work, heading and page", () => {
    const block = formatEvidence([chunk()])
    expect(block).toMatch(/^\[1\] John Calvin, Institutes/)
    expect(block).toContain("Justification")
    expect(block).toContain("p. 42")
    expect(block).toContain("Justification is by faith alone.")
  })

  it("builds system + user messages embedding the question and evidence", () => {
    const msgs = buildGroundedMessages("How are we justified?", [chunk()])
    expect(msgs[0].role).toBe("system")
    const user = msgs.find((m) => m.role === "user")
    expect(user).toBeDefined()
    expect(user!.content).toContain("How are we justified?")
    expect(user!.content).toContain("Institutes")
  })

  it("includes a question-type playbook as a system message", () => {
    const msgs = buildGroundedMessages("How do I grieve?", [chunk()], [], "consolation")
    const systems = msgs.filter((m) => m.role === "system").map((m) => m.content)
    expect(systems.some((c) => /ANSWER SHAPE \(grief/.test(c))).toBe(true)
  })

  it("citations reference the real chunk/source ids", () => {
    const cites = citationsFromEvidence([chunk()])
    expect(cites[0]).toMatchObject({
      chunkId: "c1",
      sourceId: "s1",
      author: "John Calvin",
      work: "Institutes",
      page: 42,
    })
    expect(cites[0].quote).toContain("Justification is by faith alone.")
  })

  it("truncates long quotes", () => {
    const long = "x".repeat(1000)
    const [cite] = citationsFromEvidence([chunk({ content: long })])
    expect(cite.quote!.length).toBeLessThanOrEqual(322)
    expect(cite.quote!.endsWith("…")).toBe(true)
  })

  it("confidence reflects evidence volume", () => {
    expect(estimateConfidence([]).level).toBe("low")
    expect(estimateConfidence([chunk()]).level).toBe("medium")
    expect(
      estimateConfidence([chunk(), chunk(), chunk(), chunk()]).level,
    ).toBe("high")
  })
})
