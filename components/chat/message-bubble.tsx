import { FlameIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ConfidenceBadge } from "./confidence-badge"
import { SourcePanel } from "./source-panel"
import type { ChatMessage } from "./types"

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

        {(message.confidence || message.statusNode) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {message.confidence && (
              <ConfidenceBadge confidence={message.confidence} />
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
