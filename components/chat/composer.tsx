"use client"

import { useState } from "react"
import { ArrowUpIcon, LockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"

export function Composer({
  onSend,
  disabled,
  isPrivate,
  onPrivateChange,
}: {
  onSend: (text: string) => void
  disabled?: boolean
  isPrivate: boolean
  onPrivateChange: (value: boolean) => void
}) {
  const [text, setText] = useState("")

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText("")
  }

  return (
    <div className="border-t bg-background/80 px-4 py-3 backdrop-blur lg:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex flex-col gap-2 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="Ask a theological or biblical question…"
            className="min-h-11 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
            rows={1}
          />
          <div className="flex items-center justify-between gap-2 px-1">
            <Toggle
              pressed={isPrivate}
              onPressedChange={onPrivateChange}
              size="sm"
              variant="outline"
              className={cn(
                "h-8 gap-1.5 text-xs",
                isPrivate && "border-primary text-primary",
              )}
              aria-label="Toggle private mode"
            >
              <LockIcon className="size-3.5" />
              Private
            </Toggle>
            <Button
              size="icon"
              className="size-8 rounded-full"
              onClick={submit}
              disabled={disabled || text.trim().length === 0}
              aria-label="Send"
            >
              <ArrowUpIcon className="size-4" />
            </Button>
          </div>
        </div>
        <p className="mt-1.5 px-2 text-center text-xs text-muted-foreground">
          {isPrivate
            ? "Private mode: this conversation is never stored or logged."
            : "Torch grounds answers in retrieved sources and cites them. It says so when unsure."}
        </p>
      </div>
    </div>
  )
}
