/**
 * Scripture lookup against the `bible_verses` table — the data layer that will
 * back the `scripture_lookup` agent tool (Phase 3.7). Resolves a free-text
 * reference + translation to its verses. DB access is lazy so importing this
 * module never opens a connection.
 *
 * Licensing: lookups return whatever has been loaded. Whether a translation may
 * be served wholesale vs only quoted is recorded on `bible_translations`
 * (`canRedistribute`); callers that surface large spans should check it.
 */
import { and, asc, eq, gte, lte } from "drizzle-orm"

import { parseReference, type ScriptureReference } from "./reference"
import type { Database } from "@/lib/db"

export interface ScriptureVerse {
  translation: string
  book: string
  chapter: number
  verse: number
  text: string
}

export interface PassageResult {
  reference: ScriptureReference
  translation: string
  verses: ScriptureVerse[]
}

export interface LookupOptions {
  translation?: string
  db?: Database
}

const DEFAULT_TRANSLATION = "KJV"

async function resolveDb(injected?: Database): Promise<Database> {
  if (injected) return injected
  return (await import("@/lib/db")).db
}

/** Look up a passage by free-text reference (e.g. "Romans 8:28-30"). */
export async function lookupPassage(
  reference: string,
  options: LookupOptions = {},
): Promise<PassageResult | null> {
  const ref = parseReference(reference)
  if (!ref) return null
  return lookupByReference(ref, options)
}

/** Look up a passage from an already-parsed, canonical reference. */
export async function lookupByReference(
  ref: ScriptureReference,
  options: LookupOptions = {},
): Promise<PassageResult> {
  const translation = options.translation ?? DEFAULT_TRANSLATION
  const database = await resolveDb(options.db)
  const { bibleVerses } = await import("@/lib/db/schema")

  const conds = [
    eq(bibleVerses.translation, translation),
    eq(bibleVerses.book, ref.book),
    eq(bibleVerses.chapter, ref.chapter),
  ]
  if (ref.verseStart !== undefined) {
    conds.push(gte(bibleVerses.verse, ref.verseStart))
    conds.push(lte(bibleVerses.verse, ref.verseEnd ?? ref.verseStart))
  }

  const rows = await database
    .select({
      translation: bibleVerses.translation,
      book: bibleVerses.book,
      chapter: bibleVerses.chapter,
      verse: bibleVerses.verse,
      text: bibleVerses.text,
    })
    .from(bibleVerses)
    .where(and(...conds))
    .orderBy(asc(bibleVerses.verse))

  return { reference: ref, translation, verses: rows }
}
