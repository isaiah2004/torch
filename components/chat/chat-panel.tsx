"use client"

import { useRef, useState } from "react"
import { FlameIcon } from "lucide-react"

import { parseEvents } from "@/lib/chat/protocol"
import { MessageBubble } from "./message-bubble"
import { Composer } from "./composer"
import type { ChatMessage } from "./types"

const STATUS_LABELS: Record<string, string> = {
  intent_analysis: "Understanding the question",
  retrieval_planning: "Planning source retrieval",
  source_retrieval: "Searching trusted sources",
  reranking: "Ranking the best evidence",
  citation_verification: "Verifying every citation",
}

const SUGGESTIONS = [
  "Why does God allow suffering?",
  "How should Romans 9 be interpreted?",
  "What do Reformed and Arminian theologians disagree on?",
  "What are the strongest historical arguments for the resurrection?",
]

function uid() {
  return Math.random().toString(36).slice(2)
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isPrivate, setIsPrivate] = useState(false)
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      })
    })
  }

  async function send(text: string) {
    if (busy) return
    setBusy(true)

    const userMsg: ChatMessage = { id: uid(), role: "user", content: text }
    const assistantId = uid()
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    }
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    scrollToBottom()

    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)))

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, isPrivate }),
      })
      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const { events, rest } = parseEvents(buffer)
        buffer = rest
        for (const event of events) {
          switch (event.type) {
            case "token":
              patch((m) => ({ ...m, content: m.content + event.value }))
              break
            case "status":
              patch((m) => ({
                ...m,
                statusNode: event.node,
                statusLabel: STATUS_LABELS[event.node] ?? event.message,
              }))
              break
            case "citations":
              patch((m) => ({ ...m, citations: event.citations }))
              break
            case "done":
              patch((m) => ({
                ...m,
                streaming: false,
                statusLabel: undefined,
                confidence: event.confidence,
              }))
              break
            case "error":
              patch((m) => ({
                ...m,
                streaming: false,
                content: m.content || `⚠ ${event.message}`,
              }))
              break
          }
        }
        scrollToBottom()
      }
    } catch (err) {
      patch((m) => ({
        ...m,
        streaming: false,
        content:
          m.content ||
          `⚠ ${(err as Error).message}. Please try again.`,
      }))
    } finally {
      setBusy(false)
      scrollToBottom()
    }
  }

  const empty = messages.length === 0

  return (
    <div className="flex h-[calc(100svh-var(--header-height))] flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {empty ? (
          <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FlameIcon className="size-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold">Ask Torch</h2>
              <p className="text-sm text-muted-foreground">
                Trustworthy, well-sourced answers grounded in respected
                Christian resources.
              </p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-xl border bg-card p-3 text-left text-sm transition-colors hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 lg:px-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
        )}
      </div>

      <Composer
        onSend={send}
        disabled={busy}
        isPrivate={isPrivate}
        onPrivateChange={setIsPrivate}
      />
    </div>
  )
}
