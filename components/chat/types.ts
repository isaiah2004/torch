import type { Citation, Confidence } from "@/lib/db/schema"

/** A message as held in the chat UI (superset of the persisted shape). */
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  confidence?: Confidence
  /** True while tokens are still streaming in. */
  streaming?: boolean
  /** Current graph node id while streaming (for the status line). */
  statusNode?: string
  statusLabel?: string
}
