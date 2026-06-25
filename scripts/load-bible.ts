/**
 * Load a public-domain Bible translation into `bible_verses` and register it in
 * `bible_translations`.
 *
 *   pnpm tsx scripts/load-bible.ts --code KJV --file ./KJV.json \
 *     --name "King James Version" --license "Public Domain" --redistribute
 *
 * Accepts the common scrollmapper/bible_databases JSON export shapes (array of
 * verse objects, or nested book→chapter→verse). For copyrighted translations
 * (NIV/NKJV) do NOT bulk-load — quote them via api.bible instead (see
 * lib/scripture/api-bible.ts).
 */
import { readFileSync } from "node:fs"

import { config } from "dotenv"

config({ path: ".env.local" })
config()

interface Args {
  code?: string
  file?: string
  name?: string
  license?: string
  copyright?: string
  provider: string
  redistribute: boolean
}

function parseArgs(argv: string[]): Args {
  const flags: Record<string, string> = {}
  let redistribute = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--redistribute") redistribute = true
    else if (a.startsWith("--")) flags[a.slice(2)] = argv[++i]
  }
  return {
    code: flags.code,
    file: flags.file,
    name: flags.name,
    license: flags.license,
    copyright: flags.copyright,
    provider: flags.provider ?? "scrollmapper/bible_databases",
    redistribute,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.code || !args.file) {
    console.error(
      "Usage: tsx scripts/load-bible.ts --code <CODE> --file <data.json> " +
        "[--name <name>] [--license <license>] [--copyright <c>] [--redistribute]",
    )
    process.exit(2)
  }

  const { db } = await import("@/lib/db")
  const { bibleVerses, bibleTranslations } = await import("@/lib/db/schema")
  const { sql } = await import("drizzle-orm")
  const { normalizeVerseRecords } = await import("@/lib/scripture/import")

  const raw = JSON.parse(readFileSync(args.file, "utf8"))
  const rows = normalizeVerseRecords(raw, args.code)
  console.log(`Parsed ${rows.length} verses for ${args.code}.`)

  await db
    .insert(bibleTranslations)
    .values({
      code: args.code,
      name: args.name ?? args.code,
      license: args.license,
      copyright: args.copyright,
      provider: args.provider,
      canRedistribute: args.redistribute,
    })
    .onConflictDoUpdate({
      target: bibleTranslations.code,
      set: {
        name: args.name ?? args.code,
        license: args.license,
        canRedistribute: args.redistribute,
      },
    })

  // Replace any existing verses for this translation, then bulk insert.
  await db.delete(bibleVerses).where(sql`${bibleVerses.translation} = ${args.code}`)
  const batchSize = 1000
  for (let i = 0; i < rows.length; i += batchSize) {
    await db.insert(bibleVerses).values(rows.slice(i, i + batchSize))
  }
  console.log(`Loaded ${rows.length} verses for ${args.code}.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("load-bible failed:", err)
    process.exit(1)
  })
