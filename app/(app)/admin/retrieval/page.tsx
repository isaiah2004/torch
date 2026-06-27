/**
 * Admin › Retrieval inspector
 *
 * Shows recent retrieval.search + retrieval.rerank events grouped by requestId,
 * cross-referenced with chat.query.analyzed so the originating query/type is
 * visible alongside the similarity and rerank scores.
 */
import { SearchCheckIcon, ShieldAlertIcon } from "lucide-react"
import { and, eq, inArray } from "drizzle-orm"

import { isAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { logs } from "@/lib/db/schema"
import { listRetrievalEvents } from "@/lib/db/queries/admin-logs"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const dynamic = "force-dynamic"

// ── Typed data shapes ─────────────────────────────────────────────────────────

interface SearchData {
  topK?: number
  returned?: number
  filters?: unknown
  topScore?: number
}

interface RerankData {
  reranked?: number
  candidates?: number
  selected?: number
  rejected?: number
  selectedScores?: number[]
}

interface QueryAnalyzedData {
  type?: string
  retrievalQuery?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortId(id: string | null): string {
  if (!id) return "—"
  return id.slice(0, 8)
}

function fmtTs(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC"
}

function fmtNum(n: number | undefined, decimals = 3): string {
  if (n == null) return "—"
  return n.toFixed(decimals)
}

function fmtScores(scores: number[] | undefined): string {
  if (!scores || scores.length === 0) return "—"
  return scores.map((s) => s.toFixed(3)).join(" · ")
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function RetrievalPage() {
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

  // Retrieval pipeline events
  const events = await listRetrievalEvents({ limit: 100 })

  // Unique requestIds so we can fetch associated chat.query.analyzed rows
  const reqIds = [
    ...new Set(events.flatMap((e) => (e.requestId ? [e.requestId] : []))),
  ]

  const queryRows =
    reqIds.length > 0
      ? await db
          .select({ requestId: logs.requestId, data: logs.data })
          .from(logs)
          .where(
            and(
              eq(logs.event, "chat.query.analyzed"),
              inArray(logs.requestId, reqIds),
            ),
          )
      : []

  const queryMap = new Map<string, QueryAnalyzedData>(
    queryRows
      .filter((r): r is typeof r & { requestId: string } => r.requestId != null)
      .map((r) => [r.requestId, (r.data ?? {}) as QueryAnalyzedData]),
  )

  // Group retrieval events by requestId, preserving newest-first order
  type EventRow = (typeof events)[number]
  type Group = {
    key: string
    requestId: string | null
    ts: Date
    search?: EventRow
    rerank?: EventRow
  }

  const groupMap = new Map<string, Group>()
  for (const row of events) {
    const key = row.requestId ?? `__anon_${row.ts.getTime()}`
    if (!groupMap.has(key)) {
      groupMap.set(key, { key, requestId: row.requestId, ts: row.ts })
    }
    const g = groupMap.get(key)!
    if (row.event === "retrieval.search") g.search = row
    else if (row.event === "retrieval.rerank") g.rerank = row
  }

  const groups = Array.from(groupMap.values())

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <SearchCheckIcon className="size-5 text-primary" />
        <div>
          <h1 className="text-lg font-semibold">Retrieval inspector</h1>
          <p className="text-sm text-muted-foreground">
            Recent retrieval pipeline events — vector search + reranking, grouped
            by request. Showing the last 100 events (~50 requests).
          </p>
        </div>
      </div>

      {/* Empty state */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed px-8 py-14 text-center text-sm text-muted-foreground">
          No retrieval events yet. Send a chat query to populate this view.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const sd = (g.search?.data ?? {}) as SearchData
            const rd = (g.rerank?.data ?? {}) as RerankData
            const qd = g.requestId ? (queryMap.get(g.requestId) ?? {}) : {}

            return (
              <Card key={g.key} size="sm">
                {/* Request header */}
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {shortId(g.requestId)}
                      </span>
                      {qd.type && (
                        <Badge variant="secondary">{qd.type}</Badge>
                      )}
                    </CardTitle>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmtTs(g.ts)}
                    </span>
                  </div>
                  {qd.retrievalQuery && (
                    <CardDescription className="truncate">
                      {qd.retrievalQuery}
                    </CardDescription>
                  )}
                </CardHeader>

                {/* Two-column body: Search + Rerank */}
                <CardContent>
                  <div className="grid gap-6 sm:grid-cols-2">
                    {/* Vector search */}
                    <div className={!g.search ? "opacity-40" : ""}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Vector search
                      </p>
                      {g.search ? (
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm">
                          <dt className="text-muted-foreground">topK</dt>
                          <dd className="font-mono">{sd.topK ?? "—"}</dd>
                          <dt className="text-muted-foreground">returned</dt>
                          <dd className="font-mono">{sd.returned ?? "—"}</dd>
                          <dt className="text-muted-foreground">topScore</dt>
                          <dd className="font-mono">{fmtNum(sd.topScore)}</dd>
                        </dl>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No search event recorded
                        </p>
                      )}
                    </div>

                    {/* Rerank */}
                    <div className={!g.rerank ? "opacity-40" : ""}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Rerank
                      </p>
                      {g.rerank ? (
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm">
                          <dt className="text-muted-foreground">candidates</dt>
                          <dd className="font-mono">{rd.candidates ?? "—"}</dd>
                          <dt className="text-muted-foreground">selected</dt>
                          <dd className="font-mono">{rd.selected ?? "—"}</dd>
                          <dt className="text-muted-foreground">rejected</dt>
                          <dd className="font-mono">{rd.rejected ?? "—"}</dd>
                          <dt className="col-span-2 mt-1 text-muted-foreground">
                            scores
                          </dt>
                          <dd className="col-span-2 break-all font-mono text-xs leading-relaxed">
                            {fmtScores(rd.selectedScores)}
                          </dd>
                        </dl>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No rerank event recorded
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
