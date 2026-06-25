import { HistoryIcon } from "lucide-react"

export default function HistoryPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <h1 className="text-lg font-semibold">Conversation history</h1>
      <p className="text-sm text-muted-foreground">
        Your past conversations will appear here.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <HistoryIcon className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No conversations yet. Persisted history arrives in Phase 4.
        </p>
      </div>
    </div>
  )
}
