/**
 * Streaming wire protocol shared by the /api/chat route and the chat UI.
 *
 * The response body is newline-delimited JSON (NDJSON). Each line is one
 * `ChatStreamEvent`. This keeps the client simple while leaving room for the
 * full LangGraph trace + citations to stream in later phases.
 */
import type { Citation, Confidence } from "@/lib/db/schema"

/** A scripture reference resolved to its verse text, for the references panel. */
export interface ResolvedReference {
  reference: string
  translation: string
  text: string
}

export type ChatStreamEvent =
  | { type: "token"; value: string }
  | { type: "status"; node: string; message?: string }
  | { type: "citations"; citations: Citation[] }
  | { type: "references"; references: ResolvedReference[] }
  | { type: "done"; confidence?: Confidence; conversationId?: string; verified?: boolean }
  | { type: "error"; message: string }

export function encodeEvent(event: ChatStreamEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n")
}

/** Parse a buffer of NDJSON, returning complete events and the remainder. */
export function parseEvents(buffer: string): {
  events: ChatStreamEvent[]
  rest: string
} {
  const lines = buffer.split("\n")
  const rest = lines.pop() ?? ""
  const events: ChatStreamEvent[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      events.push(JSON.parse(trimmed) as ChatStreamEvent)
    } catch {
      // Ignore malformed partial lines.
    }
  }
  return { events, rest }
}
