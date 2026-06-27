/**
 * Pull scripture references out of free text and resolve them to verse text
 * (ARCHITECTURE.md §8 — the "Biblical References" panel of the trust layer).
 *
 * `extractScriptureReferences` scans an answer for reference-like strings
 * ("John 3:16", "Romans 8:28-30", "Psalm 23") and validates each through the
 * canonical `parseReference`. `resolveScriptureReferences` then looks up the
 * verses (BSB by default) and joins them into a single display string.
 */
import { lookupByReference } from "./lookup"
import { formatReference, parseReference, type ScriptureReference } from "./reference"

/** Default translation for the references panel (Berean Standard Bible). */
const DEFAULT_TRANSLATION = "BSB"
/** Cap how many references we surface per answer, to keep the panel tidy. */
const MAX_REFERENCES = 6

// Scanner for reference-like spans anywhere in prose. Mirrors the shape that
// `parseReference` accepts (optional leading 1-3/I-III, book words, ch[:v[-v]])
// but is *unanchored* so it can find matches mid-sentence. Each candidate is
// re-validated through parseReference, so over-matching here is harmless.
const SCAN =
  /\b((?:[1-3]\s*|I{1,3}\s+)?[A-Z][a-zA-Z.]*(?:\s+(?:of\s+)?[A-Z][a-zA-Z.]*)*)\s+(\d+)(?::\d+(?:\s*[-–]\s*\d+)?)?\b/g

export function extractScriptureReferences(text: string): ScriptureReference[] {
  const seen = new Set<string>()
  const refs: ScriptureReference[] = []

  let m: RegExpExecArray | null
  while ((m = SCAN.exec(text)) !== null) {
    const ref = parseReference(m[0])
    if (!ref) continue
    // Dedupe on the canonical rendering so "Jn 3:16" and "John 3:16" collapse.
    const key = formatReference(ref)
    if (seen.has(key)) continue
    seen.add(key)
    refs.push(ref)
    if (refs.length >= MAX_REFERENCES) break
  }

  return refs
}

export interface ResolvedReference {
  reference: string
  translation: string
  text: string
}

/**
 * Resolve parsed references to their verse text. References that resolve to
 * nothing (translation/passage not loaded) are skipped rather than surfaced
 * empty. Lookups run against the lazy db inside `lookupByReference`.
 */
export async function resolveScriptureReferences(
  refs: ScriptureReference[],
  opts: { translation?: string } = {},
): Promise<ResolvedReference[]> {
  const translation = opts.translation ?? DEFAULT_TRANSLATION
  const resolved: ResolvedReference[] = []

  for (const ref of refs) {
    let result
    try {
      result = await lookupByReference(ref, { translation })
    } catch {
      // A missing/unconfigured table must not break the panel.
      continue
    }
    const text = result.verses
      .map((v) => v.text.trim())
      .filter(Boolean)
      .join(" ")
    if (!text) continue
    resolved.push({
      reference: formatReference(ref),
      translation: result.translation,
      text,
    })
  }

  return resolved
}
