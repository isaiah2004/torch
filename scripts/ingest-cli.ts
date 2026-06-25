/**
 * Local batch ingestion for documents belonging to a source.
 *
 *   pnpm tsx scripts/ingest-cli.ts <sourceId> <file> [moreFiles...]
 *
 * Each file is parsed → cleaned → chunked → embedded → stored, with sha256
 * dedupe. Requires DATABASE_URL and an embedding key (OPENAI_API_KEY).
 */
import { basename } from "node:path"
import { readFileSync } from "node:fs"

import { config } from "dotenv"

config({ path: ".env.local" })
config()

async function main() {
  const [sourceId, ...files] = process.argv.slice(2)
  if (!sourceId || files.length === 0) {
    console.error("Usage: tsx scripts/ingest-cli.ts <sourceId> <file> [moreFiles...]")
    process.exit(2)
  }

  const { ingestDocument } = await import("@/lib/ingestion/pipeline")

  for (const file of files) {
    const data = new Uint8Array(readFileSync(file))
    const filename = basename(file)
    console.log(`Ingesting ${filename} (${data.byteLength} bytes)…`)
    try {
      const result = await ingestDocument({ sourceId, filename, data })
      console.log(
        result.deduped
          ? `  ↳ already ingested (document ${result.documentId})`
          : `  ↳ stored ${result.chunkCount} chunks (document ${result.documentId})`,
      )
    } catch (err) {
      console.error(`  ✗ failed: ${(err as Error).message}`)
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ingest-cli failed:", err)
    process.exit(1)
  })
