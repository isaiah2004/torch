/**
 * Grounded answer construction (ARCHITECTURE.md §8 + §13).
 *
 * Turns selected retrieval evidence into (a) the prompt messages handed to the
 * provider and (b) the structured citations streamed to the UI. The system
 * prompt encodes the non-negotiable hallucination rules: quote only retrieved
 * text, cite only retrieved sources, present disagreement fairly, and prefer
 * "I could not find a reliable source" over invention.
 *
 * NOTE: this is the Phase-2 direct wiring. The Phase-3 LangGraph verifier will
 * additionally *enforce* these rules in code (verbatim-quote + citation checks)
 * rather than relying on the prompt alone.
 */
import type { Citation, Confidence } from "@/lib/db/schema"
import type { ChatMessage } from "@/lib/providers/types"
import type { RetrievedChunk } from "@/lib/retrieval/types"
import { playbookFor, type QuestionType } from "./playbooks"
import { detectTopic } from "./topics"

export const TORCH_SYSTEM_PROMPT = `You are Torch, a trustworthy study companion that helps believers wrestle with
hard questions about God, the Bible, and the Christian faith — honestly,
pastorally, and grounded in Scripture and trusted Christian sources.

Your job is to actually HELP the person, not just recite verses. Engage the real
difficulty behind what they ask (doubts, objections, "is this cruel/unfair?"
questions) with warmth and intellectual honesty.

Use the numbered sources provided below as your evidence. Rules:

1. CORRECT FALSE OR LOADED PREMISES FIRST — Many hard questions smuggle in a
   false assumption (e.g. "Why does God hate gay people?", "Why is God a
   genocidal tyrant?"). Do NOT accept the premise and pile on proof-texts. Open
   by addressing the premise plainly and graciously — e.g. "God does not hate gay
   people; Scripture is clear that God loves every person." THEN explain.
2. LOVE FOR PEOPLE vs. TEACHING ON BEHAVIOR — Never state or imply that God hates
   any person or group. Carefully distinguish God's posture toward people (love,
   the desire for everyone to come to him) from the Bible's teaching about
   particular actions. Lead with the former.
3. SIN IS UNIVERSAL — Frame sin as the shared human condition ("all have sinned"),
   not a problem of one group. Never single out a group as uniquely sinful; every
   person stands equally in need of grace. God's design, and humanity's deviation
   from it through sin, applies to all of us.
4. GROUNDING — Base claims on the provided sources and Scripture; cite sources
   inline by number in square brackets, e.g. [2].
5. NO FABRICATION — Never invent a quote, reference, author, or page. Quoted
   words must appear in a provided source. If the sources don't settle it, say
   "I could not find a reliable source for this" and explain what is missing.
6. ANSWER THE ACTUAL QUESTION & KEEP CONTEXT — Address what they asked directly
   and follow the conversation. For follow-ups (e.g. "is that fair?"), stay on the
   SAME topic; don't drift to an unrelated passage.
7. FAIRNESS — When traditions (Reformed, Lutheran, Wesleyan/Arminian, Baptist,
   Anglican) disagree, present each fairly and name it; don't flatten it.

8. BE CONCISE — DON'T OVER-QUOTE — Lead with the answer in your own words. Quote
   Scripture and sources precisely and sparingly (short, relevant phrases), never
   in bulk; explain and cite rather than pasting long passages. No padding.

Tone: clear, humble, pastoral, and direct. Lead with the gracious, truthful
answer; then support it from Scripture and the sources; be honest about tension.`

/** Render the selected evidence as a numbered block for the prompt. */
export function formatEvidence(selected: RetrievedChunk[]): string {
  return selected
    .map((c, i) => {
      const s = c.source
      const bits = [s.author, s.title].filter(Boolean).join(", ")
      const page =
        c.meta.pageStart != null
          ? c.meta.pageEnd != null && c.meta.pageEnd !== c.meta.pageStart
            ? `pp. ${c.meta.pageStart}–${c.meta.pageEnd}`
            : `p. ${c.meta.pageStart}`
          : null
      const where = [c.meta.headingPath?.join(" › "), page]
        .filter(Boolean)
        .join(", ")
      const header = `[${i + 1}] ${bits}${where ? ` (${where})` : ""}${
        s.tradition ? ` — ${s.tradition}` : ""
      }`
      return `${header}\n"""\n${c.content}\n"""`
    })
    .join("\n\n")
}

/** A prior conversation turn (most recent last). */
export interface HistoryTurn {
  role: "user" | "assistant"
  content: string
}

export function buildGroundedMessages(
  question: string,
  selected: RetrievedChunk[],
  history: HistoryTurn[] = [],
  type: QuestionType = "general",
): ChatMessage[] {
  const evidence = formatEvidence(selected)
  const topic = detectTopic(question)
  return [
    { role: "system", content: TORCH_SYSTEM_PROMPT },
    // The playbook tailors the answer structure to this kind of question.
    { role: "system", content: playbookFor(type) },
    // Topic-specific guidance for known hot-button subjects (if matched).
    ...(topic
      ? [{ role: "system", content: `TOPIC GUIDANCE — ${topic.label}:\n${topic.guidance}` } as ChatMessage]
      : []),
    // Prior turns give the model conversational context for follow-ups.
    ...history.map((h) => ({ role: h.role, content: h.content }) as ChatMessage),
    {
      role: "user",
      content: `Question:\n${question}\n\nSources:\n${evidence}\n\nUsing these sources (and the conversation so far), answer the question directly, citing sources inline by number.`,
    },
  ]
}

/** Cap quoted evidence excerpts so citations stay light to render. */
const MAX_QUOTE = 320

/** Build citations referencing the real retrieved chunks (citation integrity, §4). */
export function citationsFromEvidence(selected: RetrievedChunk[]): Citation[] {
  return selected.map((c) => ({
    chunkId: c.chunkId,
    sourceId: c.sourceId,
    author: c.source.author ?? undefined,
    work: c.source.title,
    page: c.meta.pageStart,
    quote:
      c.content.length > MAX_QUOTE ? c.content.slice(0, MAX_QUOTE).trimEnd() + "…" : c.content,
    url: c.source.url ?? undefined,
  }))
}

/** Heuristic confidence for Phase 2 (the verifier will refine this in Phase 3). */
export function estimateConfidence(selected: RetrievedChunk[]): Confidence {
  if (selected.length === 0) {
    return { level: "low", reason: "No reliable source was retrieved for this question." }
  }
  if (selected.length >= 4) {
    return { level: "high", reason: `Grounded in ${selected.length} retrieved sources.` }
  }
  return {
    level: "medium",
    reason: `Grounded in ${selected.length} retrieved source${selected.length === 1 ? "" : "s"}.`,
  }
}

export const NO_EVIDENCE_ANSWER =
  "I could not find a reliable source for this in the available material. " +
  "Torch only answers from its library of trusted Christian works, and nothing " +
  "in that library matched this question closely enough to answer faithfully. " +
  "You might rephrase the question, or this topic may not yet be covered by the " +
  "ingested sources."
