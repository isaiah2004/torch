/**
 * Admin — Embeddings & Ingestion dashboard.
 *
 * Server component; force-dynamic so stats are always live.
 * Gated by isAdmin() from @/lib/auth (same pattern as /admin/page.tsx).
 */
import { DatabaseIcon, ShieldAlertIcon } from "lucide-react"

import { isAdmin } from "@/lib/auth"
import {
  getEmbeddingStats,
  listDocuments,
  listIngestionJobs,
  type DocumentRow,
  type IngestionJobRow,
} from "@/lib/db/queries/admin-embeddings"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const dynamic = "force-dynamic"

// ── Constants ─────────────────────────────────────────────────────────────────

const DOC_STATUSES = [
  "pending",
  "parsing",
  "chunking",
  "embedding",
  "done",
  "failed",
] as const

type DocStatus = (typeof DOC_STATUSES)[number]

const STATUS_BADGE: Record<
  DocStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  done: "default",
  embedding: "secondary",
  chunking: "secondary",
  parsing: "secondary",
  pending: "outline",
  failed: "destructive",
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const variant =
    STATUS_BADGE[status as DocStatus] ?? ("outline" as const)
  return <Badge variant={variant}>{status}</Badge>
}

function fmt(n: number) {
  return n.toLocaleString("en-US")
}

function fmtDate(d: Date | null) {
  if (!d) return "—"
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d)
}

// Shared container for edge-to-edge tables (matches Card visual style).
function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 overflow-hidden rounded-[min(var(--radius-4xl),24px)] bg-card text-sm text-card-foreground shadow-sm ring-1 ring-foreground/5 dark:ring-foreground/10">
      {children}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="px-5 py-10 text-center text-sm text-muted-foreground">
      {message}
    </p>
  )
}

// ── Section: Ingestion Jobs ───────────────────────────────────────────────────

function JobsTable({ jobs }: { jobs: IngestionJobRow[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState message="No ingestion jobs found. Start ingesting documents to see pipeline activity here." />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Kind</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Progress</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Finished</TableHead>
          <TableHead>Error</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {jobs.map((job) => (
          <TableRow key={job.id}>
            <TableCell className="max-w-[180px] truncate font-mono text-xs">
              {job.filename}
            </TableCell>
            <TableCell className="max-w-[140px] truncate text-xs">
              {job.sourceTitle}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{job.kind}</Badge>
            </TableCell>
            <TableCell>
              <StatusBadge status={job.status} />
            </TableCell>
            <TableCell className="text-right text-xs tabular-nums">
              {job.chunksDone ?? 0}&nbsp;/&nbsp;{job.chunksTotal ?? 0}
            </TableCell>
            <TableCell className="max-w-[120px] truncate font-mono text-xs text-muted-foreground">
              {job.model ?? "—"}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {fmtDate(job.startedAt)}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {fmtDate(job.finishedAt)}
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-xs text-destructive">
              {job.error ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ── Section: Documents ────────────────────────────────────────────────────────

function DocumentsTable({ docs }: { docs: DocumentRow[] }) {
  if (docs.length === 0) {
    return (
      <EmptyState message="No documents found. Ingest a PDF or text file to see it here." />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>File</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Pages</TableHead>
          <TableHead className="text-right">Chars</TableHead>
          <TableHead className="text-right">Chunks</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="max-w-[220px] truncate font-mono text-xs">
              {doc.filename}
            </TableCell>
            <TableCell className="max-w-[160px] truncate text-xs">
              {doc.sourceTitle}
            </TableCell>
            <TableCell>
              <StatusBadge status={doc.status} />
            </TableCell>
            <TableCell className="text-right text-xs tabular-nums">
              {doc.pageCount ?? "—"}
            </TableCell>
            <TableCell className="text-right text-xs tabular-nums">
              {doc.charCount != null ? fmt(doc.charCount) : "—"}
            </TableCell>
            <TableCell className="text-right text-xs tabular-nums">
              {fmt(doc.chunkCount)}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {fmtDate(doc.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function EmbeddingsPage() {
  // Admin gate — matches the pattern in /admin/page.tsx
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-4 py-20 text-center">
        <ShieldAlertIcon className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          This area is restricted to administrators. Admin is granted via Clerk
          org/role metadata.
        </p>
      </div>
    )
  }

  const [stats, jobs, docs] = await Promise.all([
    getEmbeddingStats(),
    listIngestionJobs(),
    listDocuments(),
  ])

  const docStatusMap = Object.fromEntries(
    stats.docsByStatus.map((r) => [r.status, r.count]),
  )
  const totalDocs = stats.docsByStatus.reduce((s, r) => s + r.count, 0)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <DatabaseIcon className="size-5 text-primary" />
        <h1 className="text-lg font-semibold">Embeddings &amp; Ingestion</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Document ingestion pipeline status, chunk corpus statistics, and Bible
        verse counts.
      </p>

      {/* ── Summary cards ── */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Documents by status */}
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>{fmt(totalDocs)} total</CardDescription>
          </CardHeader>
          <CardContent>
            {totalDocs === 0 ? (
              <p className="text-xs text-muted-foreground">
                No documents ingested yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                {DOC_STATUSES.filter((s) => (docStatusMap[s] ?? 0) > 0).map(
                  (s) => (
                    <span key={s} className="flex items-center gap-1">
                      <StatusBadge status={s} />
                      <span className="text-xs text-muted-foreground">
                        {fmt(docStatusMap[s]!)}
                      </span>
                    </span>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chunks */}
        <Card>
          <CardHeader>
            <CardTitle>Chunks</CardTitle>
            <CardDescription>{fmt(stats.totalChunks)} total</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.avgChunkTokens !== null ? (
              <p className="text-xs text-muted-foreground">
                Avg&nbsp;{stats.avgChunkTokens}&nbsp;tokens&nbsp;/ chunk
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No chunks embedded yet.
              </p>
            )}
            {stats.chunksBySourceType.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {stats.chunksBySourceType.map((r) => (
                  <div
                    key={r.sourceType ?? "__none__"}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      {r.sourceType ?? "untyped"}
                    </span>
                    <span className="tabular-nums">{fmt(r.count)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
            <CardDescription>
              {fmt(stats.totalSources)} registered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Works and publications linked to ingested documents.
            </p>
          </CardContent>
        </Card>

        {/* Scripture */}
        <Card>
          <CardHeader>
            <CardTitle>Scripture</CardTitle>
            <CardDescription>
              {fmt(stats.totalBibleVerses)} verses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.distinctBibleTranslations > 0 ? (
              <p className="text-xs text-muted-foreground">
                {stats.distinctBibleTranslations}&nbsp;
                {stats.distinctBibleTranslations === 1
                  ? "translation"
                  : "translations"}&nbsp;loaded
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No translations loaded yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Ingestion Jobs ── */}
      <section className="mt-10">
        <h2 className="text-base font-medium">Ingestion Jobs</h2>
        <p className="text-sm text-muted-foreground">
          Most recent 100 jobs, newest first.
        </p>
        <TableCard>
          <JobsTable jobs={jobs} />
        </TableCard>
      </section>

      {/* ── Documents ── */}
      <section className="mt-10 pb-12">
        <h2 className="text-base font-medium">Documents</h2>
        <p className="text-sm text-muted-foreground">
          Most recent 100 documents with their live chunk counts, newest first.
        </p>
        <TableCard>
          <DocumentsTable docs={docs} />
        </TableCard>
      </section>
    </div>
  )
}
