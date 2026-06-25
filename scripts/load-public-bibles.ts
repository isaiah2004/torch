/**
 * Turnkey loader for the freely-redistributable (public-domain) translations
 * Torch ships in v1, fetched from scrollmapper/bible_databases (MIT-licensed
 * data) and loaded into `bible_verses` + `bible_translations`.
 *
 *   pnpm bibles:public
 *
 * Idempotent: re-running replaces each translation's verses. Requires
 * DATABASE_URL. Copyrighted translations (NIV/NKJV) are NOT loaded here — they
 * are quote-only via api.bible (see lib/scripture/api-bible.ts).
 */
import { config } from "dotenv"

config({ path: ".env.local" })
config()

const RAW =
  "https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/"

interface PublicBible {
  code: string
  file: string
  name: string
  license: string
}

// Freely redistributable, 66-book English translations available in scrollmapper.
const PUBLIC_BIBLES: PublicBible[] = [
  { code: "KJV", file: "KJV", name: "King James Version (1769)", license: "Public Domain" },
  { code: "ASV", file: "ASV", name: "American Standard Version (1901)", license: "Public Domain" },
  { code: "YLT", file: "YLT", name: "Young's Literal Translation (1898)", license: "Public Domain" },
  { code: "BSB", file: "BSB", name: "Berean Standard Bible", license: "Public Domain (Berean dedication)" },
  { code: "GEN", file: "Geneva1599", name: "Geneva Bible (1599)", license: "Public Domain" },
]

async function main() {
  const { db } = await import("@/lib/db")
  const { bibleVerses, bibleTranslations } = await import("@/lib/db/schema")
  const { sql } = await import("drizzle-orm")
  const { normalizeVerseRecords } = await import("@/lib/scripture/import")

  // Allow loading a subset: `pnpm bibles:public KJV ASV`.
  const only = new Set(process.argv.slice(2).map((s) => s.toUpperCase()))
  const targets = only.size
    ? PUBLIC_BIBLES.filter((b) => only.has(b.code))
    : PUBLIC_BIBLES

  for (const bible of targets) {
    process.stdout.write(`Fetching ${bible.code} (${bible.file}.json)… `)
    const res = await fetch(`${RAW}${bible.file}.json`)
    if (!res.ok) {
      console.error(`✗ download failed: ${res.status}`)
      continue
    }
    const raw = await res.json()
    const rows = normalizeVerseRecords(raw, bible.code, { skipUnknownBooks: true })
    console.log(`${rows.length} verses`)

    await db
      .insert(bibleTranslations)
      .values({
        code: bible.code,
        name: bible.name,
        license: bible.license,
        provider: "scrollmapper/bible_databases",
        canRedistribute: true,
      })
      .onConflictDoUpdate({
        target: bibleTranslations.code,
        set: { name: bible.name, license: bible.license, canRedistribute: true },
      })

    await db.delete(bibleVerses).where(sql`${bibleVerses.translation} = ${bible.code}`)
    const batchSize = 1000
    for (let i = 0; i < rows.length; i += batchSize) {
      await db.insert(bibleVerses).values(rows.slice(i, i + batchSize))
    }
    console.log(`  ↳ loaded ${bible.code}`)
  }
  console.log("Done.")
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("bibles:public failed:", err)
    process.exit(1)
  })
