import { describe, expect, it } from "vitest"

import { TOPICS, detectTopic } from "@/lib/chat/topics"

describe("topic playbooks", () => {
  it("every topic has keywords and substantive guidance", () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(20)
    for (const t of TOPICS) {
      expect(t.key).toMatch(/^[a-z0-9-]+$/)
      expect(t.keywords.length).toBeGreaterThan(0)
      expect(t.guidance.length).toBeGreaterThan(80)
    }
  })

  it("detects hot-button topics from natural questions", () => {
    expect(detectTopic("Why does God hate gay people?")?.key).toBe("lgbtq-sexuality-marriage")
    expect(detectTopic("Does the Bible endorse slavery?")?.key).toBe("slavery-in-the-bible")
    expect(detectTopic("Is abortion a sin?")?.key).toBe("abortion")
    expect(detectTopic("Can women be pastors or elders in the church?")?.key).toBe(
      "women-in-ministry",
    )
    expect(detectTopic("how do i deal with apostates in the church")?.key).toBe(
      "apostasy-and-church-discipline",
    )
  })

  it("returns undefined for unrelated questions", () => {
    expect(detectTopic("what is the best bread recipe")).toBeUndefined()
    expect(detectTopic("hello there")).toBeUndefined()
  })
})
