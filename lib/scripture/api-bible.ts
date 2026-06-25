/**
 * Thin api.bible client (https://docs.api.bible) for licensed translations we may
 * quote but not redistribute (e.g. NIV, NKJV). Infrastructure is ready now;
 * supply `API_BIBLE_KEY` and the per-translation Bible id to enable it.
 *
 * Quote-only: callers must keep returned spans short and attributed — do not
 * bulk-import copyrighted translations into `bible_verses`.
 */
import { serverEnv } from "@/lib/env"
import { logger } from "@/lib/logging"
import { OSIS_BY_NUMBER } from "./books"
import type { ScriptureReference } from "./reference"

const API_BIBLE_BASE = "https://api.scripture.api.bible/v1"

/** Build an api.bible passage id from a canonical reference (e.g. "ROM.8.28-ROM.8.30"). */
export function toPassageId(ref: ScriptureReference): string {
  const osis = OSIS_BY_NUMBER[ref.bookNumber]
  if (!osis) throw new Error(`No OSIS code for book number ${ref.bookNumber}`)
  if (ref.verseStart === undefined) return `${osis}.${ref.chapter}`
  const start = `${osis}.${ref.chapter}.${ref.verseStart}`
  if (ref.verseEnd === undefined || ref.verseEnd === ref.verseStart) return start
  return `${start}-${osis}.${ref.chapter}.${ref.verseEnd}`
}

/** Resolve a translation code (e.g. "NIV") to its api.bible Bible id from API_BIBLE_IDS. */
export function getApiBibleId(code: string): string | undefined {
  if (!serverEnv.API_BIBLE_IDS) return undefined
  try {
    const map = JSON.parse(serverEnv.API_BIBLE_IDS) as Record<string, string>
    return map[code]
  } catch {
    logger.warn("scripture.api_bible.bad_ids_env", { data: { value: "API_BIBLE_IDS is not valid JSON" } })
    return undefined
  }
}

export interface ApiBiblePassage {
  reference: string
  content: string
  copyright?: string
}

export function isApiBibleConfigured(): boolean {
  return Boolean(serverEnv.API_BIBLE_KEY)
}

/**
 * Fetch a passage by api.bible verse/passage id (e.g. "JHN.3.16" or "ROM.8.28-ROM.8.30").
 * `bibleId` is the translation's api.bible id. Returns plain text content.
 */
export async function fetchApiBiblePassage(
  bibleId: string,
  passageId: string,
): Promise<ApiBiblePassage> {
  const key = serverEnv.API_BIBLE_KEY
  if (!key) throw new Error("API_BIBLE_KEY is not set.")

  const url = new URL(`${API_BIBLE_BASE}/bibles/${bibleId}/passages/${passageId}`)
  url.searchParams.set("content-type", "text")
  url.searchParams.set("include-notes", "false")
  url.searchParams.set("include-titles", "false")
  url.searchParams.set("include-verse-numbers", "true")

  const res = await fetch(url, { headers: { "api-key": key } })
  if (!res.ok) {
    throw new Error(`api.bible request failed: ${res.status} ${await res.text()}`)
  }
  const json = (await res.json()) as {
    data?: { reference?: string; content?: string; copyright?: string }
  }
  logger.info("scripture.api_bible.fetch", { data: { bibleId, passageId } })
  return {
    reference: json.data?.reference ?? passageId,
    content: (json.data?.content ?? "").trim(),
    copyright: json.data?.copyright,
  }
}

/**
 * Quote a passage for a licensed translation by code (e.g. "NIV") + canonical
 * reference. Requires API_BIBLE_KEY and an API_BIBLE_IDS entry for the code.
 * Returns null when the translation isn't configured, so callers can fall back
 * to a public-domain translation rather than fail.
 */
export async function quotePassage(
  code: string,
  ref: ScriptureReference,
): Promise<ApiBiblePassage | null> {
  const bibleId = getApiBibleId(code)
  if (!bibleId || !serverEnv.API_BIBLE_KEY) return null
  return fetchApiBiblePassage(bibleId, toPassageId(ref))
}
