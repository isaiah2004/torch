/**
 * /api/conversations — list and create the signed-in user's conversations.
 *
 * GET returns the caller's conversations (most recently updated first). POST
 * creates a new one. Conversations are scoped to the local `users` row mirroring
 * the Clerk identity; signed-out callers get a 401.
 */
import { getUserId } from "@/lib/auth"
import {
  autoTitleFrom,
  createConversation,
  ensureLocalUserId,
  listConversations,
} from "@/lib/db/queries/conversations"

export const runtime = "nodejs"

export async function GET() {
  const clerkUserId = await getUserId()
  if (!clerkUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = await ensureLocalUserId(clerkUserId)
  if (!userId) return Response.json({ conversations: [] })

  const conversations = await listConversations(userId)
  return Response.json({ conversations })
}

export async function POST(req: Request) {
  const clerkUserId = await getUserId()
  if (!clerkUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = await ensureLocalUserId(clerkUserId)
  if (!userId) {
    return Response.json({ error: "No local user" }, { status: 404 })
  }

  let body: { title?: unknown; isPrivate?: unknown } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    // An empty/absent body is fine — fall back to defaults.
  }

  const title =
    typeof body.title === "string" ? autoTitleFrom(body.title) : undefined
  const isPrivate = body.isPrivate === true

  const { id } = await createConversation({ userId, title, isPrivate })
  return Response.json({ id }, { status: 201 })
}
