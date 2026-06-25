/**
 * Embed loaded Bible translations into the RAG `chunks` corpus so verses are
 * semantically retrievable by /api/chat (alongside the theology sources).
 *
 *   pnpm embed:bible              # all translations present in bible_verses
 *   pnpm embed:bible BSB KJV      # only these codes
 *
 * Reference lookup (bible_verses) is unaffected — this is the semantic-search
 * copy. Each translation becomes one `source` + `document`; verses are grouped
 * into passages, embedded, and inserted into `chunks`. Idempotent per
 * translation (re-running replaces that translation's chunks). Requires
 * DATABASE_URL + an embedding key. Run `pnpm bibles:public` first.
 */
import { createHash } from "node:crypto"

import { config } from "dotenv"

config({ path: ".env.local" })
config()

async function main() {
  const { db } = await import("@/lib/db")
  const { bibleVerses, chunks, documents, sources, bibleTranslations } = await import(
    "@/lib/db/schema"
  )
  const { asc, eq } = await import("drizzle-orm")
  const { chunkVerses } = await import("@/lib/scripture/chunk-verses")
  const { embedTexts } = await import("@/lib/ingestion/embed")

  const onlyCodes = process.argv.slice(2).map((s) => s.toUpperCase())

  // Which translations to embed: requested, else everything in bible_verses.
  const present = await db
    .selectDistinct({ code: bibleVerses.translation })
    .from(bibleVerses)
  let codes = present.map((r) => r.code)
  if (onlyCodes.length) codes = codes.filter((c) => onlyCodes.includes(c))
  if (codes.length === 0) {
    console.error("No matching translations in bible_verses. Run `pnpm bibles:public` first.")
    process.exit(1)
  }
  console.log(`Embedding translations: ${codes.join(", ")}`)

  for (const code of codes) {
    const meta = await db
      .select({ name: bibleTranslations.name })
      .from(bibleTranslations)
      .where(eq(bibleTranslations.code, code))
      .limit(1)
    const title = meta[0]?.name ?? code

    // 1) Source (idempotent by title).
    const existingSource = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.title, title))
      .limit(1)
    const sourceId =
      existingSource[0]?.id ??
      (
        await db
          .insert(sources)
          .values({ title, sourceType: "scripture", trustTier: 1 })
          .returning({ id: sources.id })
      )[0].id

    // 2) Document (idempotent by sha256 of the translation code).
    const sha256 = createHash("sha256").update(`bible:${code}`).digest("hex")
    const existingDoc = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.sha256, sha256))
      .limit(1)
    const documentId =
      existingDoc[0]?.id ??
      (
        await db
          .insert(documents)
          .values({
            sourceId,
            filename: `${code}.bible`,
            mimeType: "application/x-scripture",
            sha256,
            status: "embedding",
          })
          .returning({ id: documents.id })
      )[0].id

    // Replace any prior chunks for this translation's document.
    await db.delete(chunks).where(eq(chunks.documentId, documentId))

    // 3) Pull verses in canonical order and chunk into passages.
    const verses = await db
      .select({
        book: bibleVerses.book,
        bookNumber: bibleVerses.bookNumber,
        chapter: bibleVerses.chapter,
        verse: bibleVerses.verse,
        text: bibleVerses.text,
      })
      .from(bibleVerses)
      .where(eq(bibleVerses.translation, code))
      .orderBy(asc(bibleVerses.bookNumber), asc(bibleVerses.chapter), asc(bibleVerses.verse))

    const passages = chunkVerses(verses)
    console.log(`  ${code}: ${verses.length} verses → ${passages.length} passages`)

    // 4) Embed + insert in batches.
    const embedBatch = 256
    let inserted = 0
    for (let i = 0; i < passages.length; i += embedBatch) {
      const slice = passages.slice(i, i + embedBatch)
      const vectors = await embedTexts(slice.map((p) => p.content))
      await db.insert(chunks).values(
        slice.map((p, j) => ({
          documentId,
          sourceId,
          ordinal: p.ordinal,
          content: p.content,
          tokenCount: p.tokenCount,
          meta: p.meta,
          embedding: vectors[j],
        })),
      )
      inserted += slice.length
      process.stdout.write(`\r  ${code}: embedded ${inserted}/${passages.length}`)
    }
    process.stdout.write("\n")

    await db
      .update(documents)
      .set({ status: "done", charCount: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId))
    console.log(`  ↳ ${code} done`)
  }
  console.log("Done.")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("embed:bible failed:", err)
    process.exit(1)
  })
