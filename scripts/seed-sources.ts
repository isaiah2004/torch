/**
 * Seed the `sources` table from protestant-theology-knowledge-base.md.
 *
 *   pnpm seed:sources
 *
 * Idempotent: existing sources (matched by title) are left untouched, so it is
 * safe to re-run after editing the knowledge base. Requires DATABASE_URL.
 */
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { config } from "dotenv"

config({ path: ".env.local" })
config() // fall back to .env

async function main() {
  const { db } = await import("@/lib/db")
  const { sources } = await import("@/lib/db/schema")
  const { parseKnowledgeBase } = await import("@/lib/ingestion/knowledge-base")

  const kbPath = fileURLToPath(
    new URL("../protestant-theology-knowledge-base.md", import.meta.url),
  )
  const seeds = parseKnowledgeBase(readFileSync(kbPath, "utf8"))
  console.log(`Parsed ${seeds.length} sources from the knowledge base.`)

  const existing = await db.select({ title: sources.title }).from(sources)
  const have = new Set(existing.map((e) => e.title))
  const toInsert = seeds.filter((s) => !have.has(s.title))

  if (toInsert.length === 0) {
    console.log("Nothing to insert — all sources already present.")
  } else {
    await db.insert(sources).values(
      toInsert.map((s) => ({
        title: s.title,
        author: s.author,
        tradition: s.tradition,
        sourceType: s.sourceType,
        url: s.url,
        trustTier: s.trustTier,
      })),
    )
    console.log(`Inserted ${toInsert.length} new sources (skipped ${have.size}).`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("seed:sources failed:", err)
    process.exit(1)
  })
