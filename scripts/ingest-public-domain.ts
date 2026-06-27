/**
 * Ingest a small, curated set of public-domain Protestant theology texts into the
 * RAG corpus so answers have commentary/confessional depth beyond the Bible.
 *
 *   DATABASE_URL="postgres://torch:torch@localhost:5433/torch" \
 *     pnpm tsx scripts/ingest-public-domain.ts
 *
 * Each work: ensure a `sources` row (reuse one matched by title, else insert),
 * fetch its plaintext/HTML, then hand the bytes to the existing ingestion
 * pipeline (parse → clean → chunk → embed → store). The pipeline sha256-dedupes,
 * so re-running is safe; we additionally skip any source that already has chunks.
 *
 * Requires DATABASE_URL (from the environment) and OPENAI_API_KEY (embeddings).
 * Every work here is verified public domain (Reformed confessions / Project
 * Gutenberg). Long texts are capped to keep embedding cost/time bounded.
 */
import { config } from "dotenv"

config({ path: ".env.local" })
config() // fall back to .env

/** ~200 KB cap for any single work, to bound embedding cost/time. */
const MAX_BYTES = 200 * 1024
const USER_AGENT = "Mozilla/5.0 (compatible; TorchIngest/1.0; +https://torch.app)"

interface Work {
  slug: string
  title: string
  author?: string
  /** REF | LUT | BAP | ANG | … (single tag, matches sources.tradition). */
  tradition: string
  sourceType: "book" | "confession"
  url: string
  filename: string
  mimeType: string
}

// Curated, short, clearly public-domain Protestant works with reliable sources.
// URLs were verified to return text/plain (HTTP 200) at authoring time.
const WORKS: Work[] = [
  {
    slug: "westminster-shorter-catechism",
    title: "The Westminster Shorter Catechism",
    author: "Westminster Assembly",
    tradition: "REF",
    sourceType: "confession",
    url: "https://ccel.org/creeds/westminster-shorter-cat.txt",
    filename: "westminster-shorter-catechism.txt",
    mimeType: "text/plain",
  },
  {
    slug: "heidelberg-catechism",
    title: "The Heidelberg Catechism",
    author: "Zacharias Ursinus and Caspar Olevianus",
    tradition: "REF",
    sourceType: "confession",
    url: "https://ccel.org/creeds/heidelberg-cat-ext.txt",
    filename: "heidelberg-catechism.txt",
    mimeType: "text/plain",
  },
  {
    slug: "pilgrims-progress",
    title: "The Pilgrim's Progress",
    author: "John Bunyan",
    tradition: "BAP",
    sourceType: "book",
    url: "https://www.gutenberg.org/files/131/131-0.txt",
    filename: "pilgrims-progress.txt",
    mimeType: "text/plain",
  },
  {
    slug: "around-the-wicket-gate",
    title: "Around the Wicket Gate",
    author: "Charles H. Spurgeon",
    tradition: "BAP",
    sourceType: "book",
    url: "https://www.gutenberg.org/cache/epub/60669/pg60669.txt",
    filename: "around-the-wicket-gate.txt",
    mimeType: "text/plain",
  },
]

async function main() {
  const { db } = await import("@/lib/db")
  const { sources, chunks } = await import("@/lib/db/schema")
  const { ingestDocument } = await import("@/lib/ingestion/pipeline")
  const { eq, sql } = await import("drizzle-orm")

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.")
  }

  /** Find a seeded source by exact title, else insert a new one; return its id. */
  async function ensureSource(work: Work): Promise<string> {
    const found = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.title, work.title))
      .limit(1)
    if (found.length) return found[0].id

    const [row] = await db
      .insert(sources)
      .values({
        title: work.title,
        author: work.author,
        tradition: work.tradition,
        sourceType: work.sourceType,
        url: work.url,
        license: "Public Domain",
        trustTier: 1,
      })
      .returning({ id: sources.id })
    console.log(`  + inserted source "${work.title}" (${row.id})`)
    return row.id
  }

  async function sourceChunkCount(sourceId: string): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(chunks)
      .where(eq(chunks.sourceId, sourceId))
    return row?.n ?? 0
  }

  const ingestedDocumentIds: string[] = []
  let totalChunksAdded = 0
  const summary: { title: string; status: string }[] = []

  for (const work of WORKS) {
    console.log(`\n▸ ${work.title} — ${work.author ?? "anon"}`)
    try {
      const sourceId = await ensureSource(work)

      const existingChunks = await sourceChunkCount(sourceId)
      if (existingChunks > 0) {
        console.log(`  ↳ skip: source already has ${existingChunks} chunks`)
        summary.push({ title: work.title, status: `skipped (${existingChunks} chunks)` })
        continue
      }

      process.stdout.write(`  fetching ${work.url} … `)
      const res = await fetch(work.url, { headers: { "User-Agent": USER_AGENT } })
      if (!res.ok) {
        console.log(`✗ HTTP ${res.status}`)
        summary.push({ title: work.title, status: `fetch failed (HTTP ${res.status})` })
        continue
      }
      let data = new Uint8Array(await res.arrayBuffer())
      const fullBytes = data.length
      if (data.length > MAX_BYTES) {
        data = data.slice(0, MAX_BYTES)
        console.log(`${fullBytes}B → capped to ${data.length}B`)
      } else {
        console.log(`${data.length}B`)
      }

      const result = await ingestDocument({
        sourceId,
        filename: work.filename,
        mimeType: work.mimeType,
        data,
      })

      if (result.deduped) {
        console.log(`  ↳ deduped (identical file already ingested): ${result.documentId}`)
        summary.push({ title: work.title, status: "deduped" })
      } else {
        console.log(`  ↳ ingested ${result.chunkCount} chunks (document ${result.documentId})`)
        ingestedDocumentIds.push(result.documentId)
        totalChunksAdded += result.chunkCount
        summary.push({ title: work.title, status: `${result.chunkCount} chunks` })
      }
    } catch (err) {
      console.warn(`  ✗ error: ${(err as Error).message}`)
      summary.push({ title: work.title, status: `error: ${(err as Error).message}` })
    }
  }

  console.log("\n──────────── summary ────────────")
  for (const s of summary) console.log(`  ${s.title}: ${s.status}`)
  console.log(`\nTotal new chunks added: ${totalChunksAdded}`)

  if (ingestedDocumentIds.length) {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(chunks)
      .where(
        sql`${chunks.documentId} in (${sql.join(
          ingestedDocumentIds.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})`,
      )
    console.log(
      `select count(*) from chunks where document_id in (${ingestedDocumentIds.length} new docs) = ${row?.n ?? 0}`,
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("ingest:public-domain failed:", err)
    process.exit(1)
  })
