import { describe, expect, it } from "vitest"

import {
  encodeEvent,
  parseEvents,
  type ChatStreamEvent,
} from "@/lib/chat/protocol"

describe("chat stream protocol", () => {
  it("round-trips events through encode/parse", () => {
    const events: ChatStreamEvent[] = [
      { type: "status", node: "intent_analysis" },
      { type: "token", value: "Hello " },
      { type: "token", value: "world" },
      { type: "done", confidence: { level: "high" } },
    ]
    const buffer = events
      .map((e) => new TextDecoder().decode(encodeEvent(e)))
      .join("")

    const { events: parsed, rest } = parseEvents(buffer)
    expect(rest).toBe("")
    expect(parsed).toEqual(events)
  })

  it("retains an incomplete trailing line as remainder", () => {
    const whole = new TextDecoder().decode(
      encodeEvent({ type: "token", value: "a" }),
    )
    const partial = '{"type":"token","value":"b"' // no newline yet
    const { events, rest } = parseEvents(whole + partial)
    expect(events).toEqual([{ type: "token", value: "a" }])
    expect(rest).toBe(partial)
  })

  it("ignores malformed lines without throwing", () => {
    const { events } = parseEvents("not json\n" + '{"type":"token","value":"x"}\n')
    expect(events).toEqual([{ type: "token", value: "x" }])
  })
})
