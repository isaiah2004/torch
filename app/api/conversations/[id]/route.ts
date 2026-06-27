/**
 * /api/conversations/[id] — read or delete a single conversation.
 *
 * Both handlers are owner-scoped: a conversation that doesn't exist or isn't
 * owned by the caller returns 404 (never leaking another user's data). Next 16
 * delivers route params asynchronously, so `params` is awaited.
 */
import { getUserId } from "@/lib/auth"
import { db } from "@/lib/db"
import { conversations } from "@/lib/db/schema"
import {
  ensureLocalUserId,
  getConversation,
  getMessages,
} from "@/lib/db/queries/conversations"
import { and, eq } from "drizzle-orm"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clerkUserId = await getUserId()
  if (!clerkUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = await ensureLocalUserId(clerkUserId)
  if (!userId) return Response.json({ error: "Not found" }, { status: 404 })

  const { id } = await params
  const conversation = await getConversation(id, userId)
  if (!conversation) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  const messages = await getMessages(id)
  return Response.json({ conversation, messages })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const clerkUserId = await getUserId()
  if (!clerkUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = await ensureLocalUserId(clerkUserId)
  if (!userId) return Response.json({ error: "Not found" }, { status: 404 })

  const { id } = await params
  const conversation = await getConversation(id, userId)
  if (!conversation) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Messages cascade-delete via the FK on conversation_id.
  await db
    .delete(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))

  return Response.json({ ok: true })
}
