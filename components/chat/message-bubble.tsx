import { BookOpenIcon, FlameIcon, ShieldCheckIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ConfidenceBadge } from "./confidence-badge"
import { SourcePanel } from "./source-panel"
import type { ChatMessage } from "./types"

/** Resolved scripture references for an answer (the verse text behind each ref). */
function BiblicalReferences({
  references,
}: {
  references: NonNullable<ChatMessage["references"]>
}) {
  if (references.length === 0) return null

  return (
    <div className="mt-3 flex flex-col gap-2">
      <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Biblical references ({references.length})
      </h4>
      {references.map((r, i) => (
        <Card key={`${r.reference}-${i}`} className="border-l-2 border-l-primary/50">
          <CardContent className="flex flex-col gap-1.5 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BookOpenIcon className="size-3.5 shrink-0" />
              <span className="truncate">
                {r.reference} ({r.translation})
              </span>
            </div>
            <blockquote className="text-sm leading-relaxed italic">
              {r.text}
            </blockquote>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <FlameIcon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
          {message.streaming && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-foreground/60 align-middle" />
          )}
        </div>

        {message.citations && <SourcePanel citations={message.citations} />}

        {message.references && message.references.length > 0 && (
          <BiblicalReferences references={message.references} />
        )}

        {(message.confidence || message.statusNode) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {message.confidence && (
              <ConfidenceBadge confidence={message.confidence} />
            )}
            {message.verified && (
              <span
                className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"
                title="Every quote and citation was checked against the cited sources."
              >
                <ShieldCheckIcon className="size-3.5" />
                Verified
              </span>
            )}
            {message.streaming && message.statusLabel && (
              <span
                className={cn(
                  "text-xs text-muted-foreground",
                  "animate-pulse",
                )}
              >
                {message.statusLabel}…
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
