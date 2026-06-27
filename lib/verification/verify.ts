/**
 * Citation/quote verifier (ARCHITECTURE.md §8/§13 — the Phase-3 trust layer).
 *
 * Phase 2 relies on the system prompt to forbid fabrication. This module *checks*
 * the model's output in code: every quoted span must appear (near-)verbatim in
 * the retrieved evidence, and every inline citation marker [n] must point at a
 * real selected source. Pure and dependency-free so it is fully unit-testable.
 */
import type { RetrievedChunk } from "@/lib/retrieval/types"

export interface VerificationResult {
  /** True when nothing was flagged: no unsupported quotes and no bad citations. */
  verified: boolean
  /** How many quoted spans we actually checked. */
  quotesChecked: number
  /** Quoted spans (original text) that no retrieved chunk supports. */
  unsupportedQuotes: string[]
  /** Human-readable problems with inline [n] citation markers. */
  citationIssues: string[]
}

/** Minimum quote length (chars) we bother checking — skips trivial fragments. */
const MIN_QUOTE_LEN = 15
/** Word-overlap fraction that counts as "supported" when not a clean substring. */
const FUZZ_THRESHOLD = 0.9

/** Lowercase, strip most punctuation, collapse whitespace — for robust matching. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    // Keep word characters and whitespace; drop quotes, commas, dashes, etc.
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Extract quoted spans (straight or curly double quotes) of meaningful length. */
function extractQuotes(answer: string): string[] {
  const quotes: string[] = []
  // Straight "…" and curly “…” double-quoted spans.
  const re = /"([^"]+)"|“([^”]+)”/g
  let m: RegExpExecArray | null
  while ((m = re.exec(answer)) !== null) {
    const span = (m[1] ?? m[2] ?? "").trim()
    if (span.length >= MIN_QUOTE_LEN) quotes.push(span)
  }
  return quotes
}

/** Extract inline citation numbers from markers like [1], [2]. */
function extractCitationNumbers(answer: string): number[] {
  const nums: number[] = []
  const re = /\[(\d+)\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(answer)) !== null) {
    nums.push(Number(m[1]))
  }
  return nums
}

/** True if `quote` is supported by `haystack`: substring, or ≥90% word overlap. */
function isSupportedBy(normQuote: string, normHaystack: string): boolean {
  if (!normQuote) return true
  if (normHaystack.includes(normQuote)) return true
  // Fuzzy fallback: most of the quote's words appear in the chunk.
  const words = normQuote.split(" ").filter(Boolean)
  if (words.length === 0) return true
  const hayWords = new Set(normHaystack.split(" "))
  const hits = words.filter((w) => hayWords.has(w)).length
  return hits / words.length >= FUZZ_THRESHOLD
}

/**
 * Verify a generated answer against the evidence it was grounded in. An empty
 * answer (or one with no quotes/citations) verifies trivially — there is nothing
 * to contradict.
 */
export function verifyAnswer(
  answer: string,
  selected: RetrievedChunk[],
): VerificationResult {
  const normChunks = selected.map((c) => normalize(c.content))

  // ── Quote support ────────────────────────────────────────────────────────
  const quotes = extractQuotes(answer)
  const unsupportedQuotes: string[] = []
  for (const quote of quotes) {
    const normQuote = normalize(quote)
    const supported = normChunks.some((h) => isSupportedBy(normQuote, h))
    if (!supported) unsupportedQuotes.push(quote)
  }

  // ── Citation validity ────────────────────────────────────────────────────
  const citationIssues: string[] = []
  for (const n of extractCitationNumbers(answer)) {
    if (n < 1 || n > selected.length) {
      citationIssues.push(
        `Citation [${n}] is out of range (1–${selected.length}).`,
      )
    }
  }

  return {
    verified: unsupportedQuotes.length === 0 && citationIssues.length === 0,
    quotesChecked: quotes.length,
    unsupportedQuotes,
    citationIssues,
  }
}
