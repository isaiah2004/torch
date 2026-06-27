import Link from "next/link"
import { HistoryIcon, MessageSquareIcon } from "lucide-react"

import { Card } from "@/components/ui/card"
import { getUserId } from "@/lib/auth"
import {
  ensureLocalUserId,
  listConversations,
} from "@/lib/db/queries/conversations"

// Per-user and always live — never statically prerender.
export const dynamic = "force-dynamic"

/** Compact relative time, e.g. "just now", "3h ago", "2d ago". */
function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default async function HistoryPage() {
  const clerkUserId = await getUserId()
  const userId = clerkUserId ? await ensureLocalUserId(clerkUserId) : null
  const conversations = userId ? await listConversations(userId) : []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <h1 className="text-lg font-semibold">Conversation history</h1>
      <p className="text-sm text-muted-foreground">
        Your past conversations. Private chats are never saved here.
      </p>

      {conversations.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <HistoryIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No conversations yet. Start one from the chat to see it here.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {conversations.map((c) => (
            <Link key={c.id} href={`/chat/${c.id}`} className="group">
              <Card
                size="sm"
                className="transition-colors group-hover:ring-primary/40"
              >
                <div className="flex items-center gap-3 px-(--card-spacing)">
                  <MessageSquareIcon className="size-4 shrink-0 text-primary" />
                  <span className="flex-1 truncate text-sm font-medium">
                    {c.title ?? "Untitled conversation"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {relativeTime(c.updatedAt)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
