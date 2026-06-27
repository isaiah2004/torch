/**
 * Admin-only data-access helpers for the sessions viewer.
 *
 * INVARIANT: private conversations (is_private = true) are EXCLUDED by
 * construction in every query — they are never surfaced here.
 */
import { and, asc, desc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  conversations,
  messages,
  users,
  type Citation,
  type Confidence,
} from "@/lib/db/schema"

// ── Return types ──────────────────────────────────────────────────────────────

export interface SessionSummary {
  id: string
  title: string | null
  userEmail: string | null
  messageCount: number
  updatedAt: Date
  createdAt: Date
}

export interface SessionMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  citations: Citation[]
  confidence: Confidence | null
  createdAt: Date
}

export interface SessionDetail {
  id: string
  title: string | null
  userEmail: string | null
  createdAt: Date
  updatedAt: Date
  messages: SessionMessage[]
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Return up to `limit` non-private conversations, most-recently-active first,
 * joined to the owner's email and annotated with a message count.
 *
 * Private conversations are excluded by the WHERE clause — this is the
 * authoritative enforcement point for that invariant.
 */
export async function listSessions({
  limit = 100,
}: {
  limit?: number
} = {}): Promise<SessionSummary[]> {
  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      userEmail: users.email,
      messageCount:
        sql<number>`(SELECT COUNT(*) FROM ${messages} WHERE ${messages.conversationId} = ${conversations.id})::int`,
      updatedAt: conversations.updatedAt,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .where(eq(conversations.isPrivate, false))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit)

  return rows
}

/**
 * Fetch a single non-private conversation and its messages in chronological
 * order.
 *
 * Returns null when the conversation does not exist OR is private — callers
 * must treat null as "not available" without revealing which case applies.
 */
export async function getSession(
  conversationId: string,
): Promise<SessionDetail | null> {
  const [conv] = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      userEmail: users.email,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .innerJoin(users, eq(conversations.userId, users.id))
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.isPrivate, false),
      ),
    )
    .limit(1)

  if (!conv) return null

  const msgs = await db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      citations: messages.citations,
      confidence: messages.confidence,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))

  return {
    ...conv,
    messages: msgs.map((m) => ({
      ...m,
      citations: m.citations ?? [],
      confidence: m.confidence ?? null,
    })),
  }
}
