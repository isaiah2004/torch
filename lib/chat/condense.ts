/**
 * Condense a follow-up question + recent conversation into a single standalone
 * question for retrieval. Without this, a follow-up like "is that cruel?"
 * embeds with no topic and retrieves irrelevant passages. Cheap call through the
 * chat provider; falls back to the raw question on any error.
 */
import { getProvider } from "@/lib/providers"
import type { HistoryTurn } from "./grounded"

const SYSTEM =
  "Rewrite the user's latest message into a single, self-contained question for " +
  "a Bible/theology search engine, resolving pronouns and references from the " +
  "conversation. Keep the original topic. Output ONLY the rewritten question, no preamble."

export async function condenseQuery(
  question: string,
  history: HistoryTurn[],
  requestId?: string,
): Promise<string> {
  if (history.length === 0) return question
  try {
    const convo = history
      .slice(-6)
      .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
      .join("\n")
    const res = await getProvider().chat().generate({
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Conversation:\n${convo}\n\nLatest message: ${question}\n\nStandalone question:` },
      ],
      temperature: 0,
      maxTokens: 120,
      requestId,
    })
    const rewritten = res.content.trim().replace(/^["']|["']$/g, "")
    return rewritten.length > 0 ? rewritten : question
  } catch {
    return question
  }
}
