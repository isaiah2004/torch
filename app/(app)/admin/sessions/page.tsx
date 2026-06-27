export const dynamic = "force-dynamic"

import Link from "next/link"
import { MessagesSquareIcon, ShieldAlertIcon } from "lucide-react"

import { isAdmin } from "@/lib/auth"
import {
  getSession,
  listSessions,
  type SessionMessage,
} from "@/lib/db/queries/admin-sessions"
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: SessionMessage["confidence"]
}) {
  if (!confidence) return null
  const variant =
    confidence.level === "high"
      ? "default"
      : confidence.level === "medium"
        ? "secondary"
        : "destructive"
  return (
    <Badge variant={variant} className="capitalize">
      {confidence.level}
    </Badge>
  )
}

function CitationList({
  citations,
}: {
  citations: SessionMessage["citations"]
}) {
  if (!citations.length) return null
  return (
    <ul className="mt-2 space-y-0.5 border-t pt-2 text-xs text-muted-foreground">
      {citations.map((c, i) => (
        <li key={i} className="flex flex-wrap gap-x-1.5">
          <span className="font-medium text-foreground/60">[{i + 1}]</span>
          {c.author && <span>{c.author}</span>}
          {c.work && <span className="italic">{c.work}</span>}
          {c.page != null && <span>p.{c.page}</span>}
          {c.quote && (
            <span className="line-clamp-1 text-foreground/50">
              &ldquo;{c.quote}&rdquo;
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
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

  const params = await searchParams
  const selectedId =
    typeof params.id === "string" && params.id.length > 0
      ? params.id
      : undefined

  // Both queries run in parallel when a session is selected.
  const [sessions, selectedSession] = await Promise.all([
    listSessions({ limit: 100 }),
    selectedId ? getSession(selectedId) : Promise.resolve(null),
  ])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <MessagesSquareIcon className="size-5 shrink-0 text-primary" />
        <div>
          <h1 className="text-lg font-semibold">Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Non-private conversations and their full message transcripts. Private
            sessions are never shown.
          </p>
        </div>
      </div>

      {/* ── Conversation list ─────────────────────────────────────────────── */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Conversations</CardTitle>
          <CardDescription>
            {sessions.length === 0
              ? "No conversations recorded yet."
              : `${sessions.length} session${sessions.length !== 1 ? "s" : ""} (latest 100) — click a title to inspect its transcript.`}
          </CardDescription>
        </CardHeader>

        {sessions.length > 0 && (
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Title</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="pr-4">Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => {
                  const isActive = s.id === selectedId
                  return (
                    <TableRow
                      key={s.id}
                      data-state={isActive ? "selected" : undefined}
                    >
                      <TableCell className="max-w-[280px] pl-4">
                        <Link
                          href={`/admin/sessions?id=${s.id}`}
                          className="block truncate font-medium underline-offset-4 hover:underline"
                        >
                          {s.title ?? (
                            <span className="font-normal italic text-muted-foreground">
                              Untitled
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {s.userEmail ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {s.messageCount}
                      </TableCell>
                      <TableCell className="pr-4 text-sm text-muted-foreground">
                        {formatDate(s.updatedAt)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>

      {/* ── Session transcript ────────────────────────────────────────────── */}
      {selectedId && (
        <div>
          {selectedSession === null ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                This session is not available. It may be private or may no
                longer exist.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {selectedSession.title ?? "Untitled session"}
                </CardTitle>
                <CardDescription>
                  {selectedSession.userEmail ?? "Unknown user"} &middot; started{" "}
                  {formatDate(selectedSession.createdAt)}
                  {selectedSession.messages.length > 0 && (
                    <> &middot; {selectedSession.messages.length} message{selectedSession.messages.length !== 1 ? "s" : ""}</>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {selectedSession.messages.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No messages in this session.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedSession.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={[
                          "rounded-md border p-3",
                          msg.role === "user"
                            ? "bg-muted/40"
                            : msg.role === "assistant"
                              ? "bg-background"
                              : "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20",
                        ].join(" ")}
                      >
                        {/* Message header */}
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            {msg.role}
                          </span>
                          <ConfidenceBadge confidence={msg.confidence} />
                          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>

                        {/* Content */}
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {msg.content}
                        </p>

                        {/* Citations */}
                        <CitationList citations={msg.citations} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
