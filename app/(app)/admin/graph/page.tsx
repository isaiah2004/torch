/**
 * Admin › Graph execution log
 *
 * Structured event-log explorer. The full LangGraph execution view (node
 * timelines, tool-call traces, state diffs) arrives in Phase 3; this page
 * exposes the live event table that will power that view.
 *
 * Accepts ?level= and ?event= URL search params as filters.
 * Next.js 16: searchParams is a Promise and must be awaited.
 */
import { ShieldAlertIcon, WorkflowIcon } from "lucide-react"

import { isAdmin } from "@/lib/auth"
import { listLogs } from "@/lib/db/queries/admin-logs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

// ── Level badge styling ───────────────────────────────────────────────────────

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const LEVEL_VARIANT: Record<string, BadgeVariant> = {
  debug: "secondary",
  info: "outline",
  warn: "outline",
  error: "destructive",
}

const LEVEL_CLASS: Record<string, string> = {
  warn: "border-amber-400 text-amber-600 dark:text-amber-400",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortId(id: string | null): string {
  if (!id) return "—"
  return id.slice(0, 8)
}

function fmtTs(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19)
}

/** Compact one-liner preview of the first few jsonb fields. */
function dataPreview(data: Record<string, unknown> | null): string {
  if (!data) return ""
  const entries = Object.entries(data).slice(0, 4)
  if (entries.length === 0) return ""
  return entries
    .map(([k, v]) => {
      const raw =
        typeof v === "object" && v !== null
          ? Array.isArray(v)
            ? `[${(v as unknown[]).length}]`
            : "{…}"
          : String(v).slice(0, 48)
      return `${k}: ${raw}`
    })
    .join("  ·  ")
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; event?: string }>
}) {
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

  const { level, event } = await searchParams
  const rows = await listLogs({ level, event })
  const isFiltered = Boolean(level || event)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <WorkflowIcon className="size-5 text-primary" />
        <div>
          <h1 className="text-lg font-semibold">Graph execution log</h1>
          <p className="text-sm text-muted-foreground">
            Live structured event log. Full LangGraph execution view (node
            timelines, tool calls, state diffs) arrives in Phase 3.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          name="level"
          placeholder="level (debug | info | warn | error)"
          defaultValue={level ?? ""}
          className="w-60"
        />
        <Input
          name="event"
          placeholder="event contains…"
          defaultValue={event ?? ""}
          className="w-60"
        />
        <Button type="submit" variant="secondary" size="sm">
          Filter
        </Button>
        {isFiltered && (
          <Button variant="ghost" size="sm" asChild>
            <a href="/admin/graph">Clear</a>
          </Button>
        )}
      </form>

      {/* Log table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {rows.length.toLocaleString()} event
            {rows.length !== 1 ? "s" : ""}
            {isFiltered ? " (filtered)" : ""}
          </CardTitle>
          <CardDescription>
            Up to 200 most-recent events
            {level ? `, level = ${level}` : ""}
            {event ? `, event ~ "${event}"` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
              No events match the current filter.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44">Timestamp (UTC)</TableHead>
                  <TableHead className="w-20">Level</TableHead>
                  <TableHead className="w-56">Event</TableHead>
                  <TableHead className="w-24">Request</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const lvl = row.level ?? "info"
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {fmtTs(row.ts)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={LEVEL_VARIANT[lvl] ?? "outline"}
                          className={LEVEL_CLASS[lvl]}
                        >
                          {lvl}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.event}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {shortId(row.requestId)}
                      </TableCell>
                      <TableCell className="max-w-sm truncate text-xs text-muted-foreground">
                        {dataPreview(row.data)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-muted-foreground">
        Phase 3 will layer a visual LangGraph execution view on top of this data —
        node timelines, tool-call traces, and per-step state diffs. The events
        logged here are the raw source for that view.
      </p>
    </div>
  )
}
