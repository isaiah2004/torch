/**
 * Admin query helpers — overview stats and AI request listing.
 *
 * These run on the server only; never import from a client component.
 */
import { desc, eq, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  aiRequests,
  bibleTranslations,
  bibleVerses,
  chunks,
  conversations,
  documents,
  messages,
  sources,
  users,
} from "@/lib/db/schema"

// ── Overview stats ───────────────────────────────────────────────────────────

export interface OverviewStats {
  sources: number
  documents: number
  chunks: number
  conversations: number
  messages: number
  aiRequests: number
  bibleVerses: number
  /** Distinct translations loaded into bible_translations. */
  bibleTranslations: number
}

/**
 * Parallel count queries across the main tables.
 * Uses `::int` cast so Postgres returns a JS number, not a string.
 */
export async function getOverviewStats(): Promise<OverviewStats> {
  const countStar = sql<number>`count(*)::int`

  const [
    sourcesRes,
    documentsRes,
    chunksRes,
    conversationsRes,
    messagesRes,
    aiRequestsRes,
    bibleVersesRes,
    bibleTranslationsRes,
  ] = await Promise.all([
    db.select({ count: countStar }).from(sources),
    db.select({ count: countStar }).from(documents),
    db.select({ count: countStar }).from(chunks),
    db.select({ count: countStar }).from(conversations),
    db.select({ count: countStar }).from(messages),
    db.select({ count: countStar }).from(aiRequests),
    db.select({ count: countStar }).from(bibleVerses),
    db.select({ count: countStar }).from(bibleTranslations),
  ])

  return {
    sources: sourcesRes[0]?.count ?? 0,
    documents: documentsRes[0]?.count ?? 0,
    chunks: chunksRes[0]?.count ?? 0,
    conversations: conversationsRes[0]?.count ?? 0,
    messages: messagesRes[0]?.count ?? 0,
    aiRequests: aiRequestsRes[0]?.count ?? 0,
    bibleVerses: bibleVersesRes[0]?.count ?? 0,
    bibleTranslations: bibleTranslationsRes[0]?.count ?? 0,
  }
}

// ── AI request listing ───────────────────────────────────────────────────────

export interface AiRequestRow {
  id: string
  createdAt: Date
  /** null when the user row has been deleted or the request was anonymous */
  userEmail: string | null
  /** Full question text — callers truncate for display */
  question: string
  provider: string | null
  model: string | null
  latencyMs: number | null
  tokensPrompt: number | null
  tokensCompletion: number | null
  retrievalCount: number | null
  verified: boolean | null
}

/**
 * Most-recent AI requests, joined to the users table for the email address.
 * Left join so rows without a linked user (deleted / anonymous) are included.
 */
export async function listAiRequests({
  limit = 100,
}: { limit?: number } = {}): Promise<AiRequestRow[]> {
  return db
    .select({
      id: aiRequests.id,
      createdAt: aiRequests.createdAt,
      userEmail: users.email,
      question: aiRequests.question,
      provider: aiRequests.provider,
      model: aiRequests.model,
      latencyMs: aiRequests.latencyMs,
      tokensPrompt: aiRequests.tokensPrompt,
      tokensCompletion: aiRequests.tokensCompletion,
      retrievalCount: aiRequests.retrievalCount,
      verified: aiRequests.verified,
    })
    .from(aiRequests)
    .leftJoin(users, eq(aiRequests.userId, users.id))
    .orderBy(desc(aiRequests.createdAt))
    .limit(limit)
}
