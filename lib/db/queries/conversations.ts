/**
 * Typed data-access helpers for conversation persistence.
 *
 * Conversations and their messages are owned by a local `users` row (the mirror
 * of the Clerk identity). Callers pass the *local* users.id; map a Clerk id with
 * `ensureLocalUserId` first. Private turns are never written — that invariant is
 * enforced by the chat route, not here.
 */
import { and, asc, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  conversations,
  messages,
  users,
  type Citation,
  type Confidence,
  type RetrievalMeta,
} from "@/lib/db/schema"

/** A persisted message row. */
export type Message = typeof messages.$inferSelect

/** A persisted conversation row. */
export type Conversation = typeof conversations.$inferSelect

/**
 * Resolve a Clerk user id to the local users.id. Does NOT create the row when
 * absent (that is `syncCurrentUser`'s job) — returns null so callers can skip
 * persistence gracefully.
 */
export async function ensureLocalUserId(
  clerkUserId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1)
  return row?.id ?? null
}

/** Create a conversation and return its id. */
export async function createConversation({
  userId,
  title,
  isPrivate = false,
}: {
  userId: string
  title?: string
  isPrivate?: boolean
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(conversations)
    .values({ userId, title: title ?? null, isPrivate })
    .returning({ id: conversations.id })
  return { id: row.id }
}

/** List a user's conversations, most recently updated first. */
export async function listConversations(userId: string): Promise<
  {
    id: string
    title: string | null
    updatedAt: Date
    createdAt: Date
  }[]
> {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
}

/** Fetch a single conversation scoped to its owner (null when not found). */
export async function getConversation(
  id: string,
  userId: string,
): Promise<Conversation | null> {
  const [row] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
    .limit(1)
  return row ?? null
}

/** Fetch a conversation's messages in chronological order. */
export async function getMessages(
  conversationId: string,
): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
}

/** Append a message and bump the conversation's updatedAt. */
export async function addMessage({
  conversationId,
  role,
  content,
  citations,
  retrievalMeta,
  confidence,
}: {
  conversationId: string
  role: "user" | "assistant" | "system"
  content: string
  citations?: Citation[]
  retrievalMeta?: RetrievalMeta
  confidence?: Confidence
}): Promise<void> {
  await db.insert(messages).values({
    conversationId,
    role,
    content,
    citations: citations ?? [],
    retrievalMeta,
    confidence,
  })
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))
}

/** Derive a short conversation title from the opening question. */
export function autoTitleFrom(question: string): string {
  const normalized = question.trim().replace(/\s+/g, " ")
  const words = normalized.split(" ").slice(0, 6).join(" ")
  const title = words.length > 60 ? words.slice(0, 60).trimEnd() : words
  return title || "New conversation"
}
