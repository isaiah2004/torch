/**
 * Parser for `protestant-theology-knowledge-base.md` → seedable `sources` rows.
 *
 * The knowledge base is two numbered lists ("Part 1 — 30 Books", "Part 2 — 30
 * Websites"). Books look like `**Author — *Title*** (TRAD). description…`;
 * websites look like `**Title** — domain.tld (TRAD; Person). description…`.
 * This is a pure function (no DB) so it can be unit-tested; the seed script
 * (scripts/seed-sources.ts) handles idempotent persistence.
 */

export interface SourceSeed {
  title: string
  author?: string
  url?: string
  tradition?: string
  sourceType: "book" | "website"
  trustTier: number
}

const EM_DASH = /\s*[—–-]\s*/

/** Reduce a tradition annotation (e.g. "BAP/REF" or "REF; John Piper") to a single tag. */
function primaryTradition(raw?: string): string | undefined {
  if (!raw) return undefined
  const first = raw.split(/[/,;]/)[0].trim()
  return first ? first.slice(0, 32) : undefined
}

function normalizeUrl(token?: string): string | undefined {
  if (!token) return undefined
  const cleaned = token.replace(/[.,;]+$/, "").trim()
  if (!cleaned || !/[a-z0-9]\.[a-z]{2,}/i.test(cleaned)) return undefined
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`
}

function parseBook(text: string): SourceSeed | null {
  const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(text)
  if (!m) return null
  const bold = m[1]
  const rest = m[2]
  const paren = /\(([^)]*)\)/.exec(rest)?.[1]

  const parts = bold.split(EM_DASH)
  let author: string | undefined
  let titleRaw: string
  if (parts.length >= 2) {
    author = parts[0].trim()
    titleRaw = parts.slice(1).join(" — ")
  } else {
    titleRaw = parts[0]
  }
  const title = titleRaw
    .replace(/\*/g, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
  if (!title) return null

  return {
    title,
    author: author || undefined,
    tradition: primaryTradition(paren),
    sourceType: "book",
    trustTier: 1,
  }
}

function parseWebsite(text: string): SourceSeed | null {
  const m = /^\*\*(.+?)\*\*\s*(.*)$/.exec(text)
  if (!m) return null
  const title = m[1].trim()
  const rest = m[2]
  if (!title) return null

  const urlToken = /^[—–-]\s*([^\s(]+)/.exec(rest)?.[1]
  const paren = /\(([^)]*)\)/.exec(rest)?.[1]
  let tradition: string | undefined
  let author: string | undefined
  if (paren) {
    const [trad, person] = paren.split(";")
    tradition = primaryTradition(trad)
    author = person?.trim() || undefined
  }

  return {
    title,
    author,
    url: normalizeUrl(urlToken),
    tradition,
    sourceType: "website",
    trustTier: 2,
  }
}

export function parseKnowledgeBase(md: string): SourceSeed[] {
  const lines = md.split(/\r?\n/)
  let mode: "book" | "website" | null = null
  let current: string | null = null
  const seeds: SourceSeed[] = []

  const flush = () => {
    if (current && mode) {
      const seed = mode === "book" ? parseBook(current.trim()) : parseWebsite(current.trim())
      if (seed) seeds.push(seed)
    }
    current = null
  }

  for (const line of lines) {
    if (/^##\s+Part\s+1/i.test(line)) {
      flush()
      mode = "book"
      continue
    }
    if (/^##\s+Part\s+2/i.test(line)) {
      flush()
      mode = "website"
      continue
    }

    const itemStart = /^\d+\.\s+(.*)$/.exec(line)
    if (itemStart) {
      flush()
      current = itemStart[1]
      continue
    }

    if (current != null) {
      // Indented, non-empty lines continue the current item; anything else ends it.
      if (/^\s+\S/.test(line)) current += " " + line.trim()
      else flush()
    }
  }
  flush()

  return seeds
}
