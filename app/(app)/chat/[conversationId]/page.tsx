import { notFound } from "next/navigation"

import { ChatPanel } from "@/components/chat/chat-panel"
import type { ChatMessage } from "@/components/chat/types"
import { getUserId } from "@/lib/auth"
import {
  ensureLocalUserId,
  getConversation,
  getMessages,
} from "@/lib/db/queries/conversations"

// Per-user and always live — never statically prerender.
export const dynamic = "force-dynamic"

/**
 * A persisted conversation, owner-scoped. Loads the prior messages and seeds the
 * chat panel so the thread can be continued. `notFound()` for anything the
 * caller doesn't own (never leaks another user's conversation).
 */
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params

  const clerkUserId = await getUserId()
  const userId = clerkUserId ? await ensureLocalUserId(clerkUserId) : null
  if (!userId) notFound()

  const conversation = await getConversation(conversationId, userId)
  if (!conversation) notFound()

  const rows = await getMessages(conversationId)
  // Map persisted rows → the UI message shape (system turns aren't shown).
  const initialMessages: ChatMessage[] = rows
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      citations: m.citations ?? undefined,
      confidence: m.confidence ?? undefined,
    }))

  return (
    <ChatPanel
      initialMessages={initialMessages}
      initialConversationId={conversation.id}
    />
  )
}
