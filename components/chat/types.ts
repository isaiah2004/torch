import type { ResolvedReference } from "@/lib/chat/protocol"
import type { Citation, Confidence } from "@/lib/db/schema"

/** A message as held in the chat UI (superset of the persisted shape). */
export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  confidence?: Confidence
  /** Scripture references resolved from the answer (derived, not persisted). */
  references?: ResolvedReference[]
  /** True when the trust layer verified every quote and citation. */
  verified?: boolean
  /** True while tokens are still streaming in. */
  streaming?: boolean
  /** Current graph node id while streaming (for the status line). */
  statusNode?: string
  statusLabel?: string
}
