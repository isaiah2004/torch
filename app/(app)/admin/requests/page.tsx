import Link from "next/link"
import { ArrowLeftIcon, ShieldAlertIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { isAdmin } from "@/lib/auth"
import { listAiRequests } from "@/lib/db/queries/admin-requests"

export const dynamic = "force-dynamic"

// ── Helpers ──────────────────────────────────────────────────────────────────

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

function fmtTime(d: Date): string {
  return DATE_FMT.format(d)
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

function dash(v: string | number | null | undefined): React.ReactNode {
  if (v == null || v === "") return <span className="text-muted-foreground/50">—</span>
  return v
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function RequestsPage() {
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

  const requests = await listAiRequests({ limit: 100 })

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start gap-3">
        <Link
          href="/admin"
          className="mt-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Back to admin"
        >
          <ArrowLeftIcon className="size-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">AI Requests</h1>
          <p className="text-sm text-muted-foreground">
            Every non-private question logged to the system — most recent first.
            Showing up to 100 rows.
          </p>
        </div>
      </div>

      {/* Empty state */}
      {requests.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No requests logged yet.
          </p>
        </div>
      ) : (
        /* Table */
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Time</TableHead>
                <TableHead className="w-[160px]">User</TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="w-[160px]">Model</TableHead>
                <TableHead className="w-[90px] text-right">Latency</TableHead>
                <TableHead className="w-[110px] text-right">
                  Tokens P&nbsp;/&nbsp;C
                </TableHead>
                <TableHead className="w-[80px] text-right">
                  Retrieved
                </TableHead>
                <TableHead className="w-[80px]">Verified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  {/* Time */}
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtTime(r.createdAt)}
                  </TableCell>

                  {/* User email */}
                  <TableCell className="max-w-[160px] truncate text-xs">
                    {dash(r.userEmail)}
                  </TableCell>

                  {/* Question (truncated, full text in title tooltip) */}
                  <TableCell className="max-w-[340px] text-xs">
                    <span title={r.question}>{truncate(r.question, 90)}</span>
                  </TableCell>

                  {/* Provider + model */}
                  <TableCell className="text-xs">
                    {r.model ? (
                      <span className="font-mono">
                        {r.provider ? `${r.provider}/` : ""}
                        {r.model}
                      </span>
                    ) : (
                      dash(null)
                    )}
                  </TableCell>

                  {/* Latency */}
                  <TableCell className="text-right text-xs tabular-nums">
                    {r.latencyMs != null ? `${r.latencyMs} ms` : dash(null)}
                  </TableCell>

                  {/* Tokens prompt / completion */}
                  <TableCell className="text-right text-xs tabular-nums font-mono">
                    {r.tokensPrompt != null || r.tokensCompletion != null ? (
                      <>
                        {(r.tokensPrompt ?? 0).toLocaleString()}&nbsp;/&nbsp;
                        {(r.tokensCompletion ?? 0).toLocaleString()}
                      </>
                    ) : (
                      dash(null)
                    )}
                  </TableCell>

                  {/* Retrieval count */}
                  <TableCell className="text-right text-xs tabular-nums">
                    {dash(r.retrievalCount)}
                  </TableCell>

                  {/* Verified badge */}
                  <TableCell>
                    {r.verified ? (
                      <Badge variant="default" className="text-[10px]">
                        Yes
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        No
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
