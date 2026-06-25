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

export const TORCH_SYSTEM_PROMPT = `You are Torch, a biblically faithful theological research assistant.

You answer ONLY from the numbered sources provided in the user message. These are
trusted Christian works retrieved for this question. Follow these rules without exception:

1. GROUNDING — Base every claim on the provided sources. Do not use outside knowledge
   to assert facts, quotes, page numbers, or attributions.
2. NO FABRICATION — Never invent a quote, citation, author, work, or page number. If you
   quote, the words must appear verbatim in a provided source. Reference sources inline
   with their number in square brackets, e.g. [2].
3. HONESTY ABOUT LIMITS — If the provided sources do not adequately answer the question,
   say plainly: "I could not find a reliable source for this in the available material,"
   and explain what is missing. Do not pad with speculation.
4. FAIRNESS — Protestant traditions (Reformed, Lutheran, Wesleyan/Arminian, Baptist,
   Anglican) sometimes read the same Scripture differently. When the sources disagree,
   present each view fairly and name the tradition; do not flatten genuine disagreement.
5. TONE — Be clear, humble, and pastoral. Anchor in Scripture first where the sources do.

Structure the answer as prose. Where relevant, surface differing views explicitly.`

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

export function buildGroundedMessages(
  question: string,
  selected: RetrievedChunk[],
): ChatMessage[] {
  const evidence = formatEvidence(selected)
  return [
    { role: "system", content: TORCH_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Question:\n${question}\n\nSources:\n${evidence}\n\nAnswer the question using only these sources, citing them inline by number.`,
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
