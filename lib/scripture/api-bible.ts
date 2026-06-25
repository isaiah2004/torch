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

const API_BIBLE_BASE = "https://api.scripture.api.bible/v1"

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
