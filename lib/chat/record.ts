/**
 * Record one non-private question to `ai_requests` for admin observability
 * (ARCHITECTURE.md §4/§10). Private-mode turns are NEVER recorded — that
 * invariant is enforced here and at the logger. DB access is lazy so importing
 * the chat route never opens a connection.
 */
import { logger } from "@/lib/logging"

export interface AiRequestRecord {
  requestId: string
  userId?: string
  conversationId?: string
  question: string
  provider?: string
  model?: string
  latencyMs?: number
  tokensPrompt?: number
  tokensCompletion?: number
  retrievalCount?: number
  verified?: boolean
  isPrivate: boolean
}

export async function recordAiRequest(rec: AiRequestRecord): Promise<void> {
  if (rec.isPrivate || !process.env.DATABASE_URL) return
  try {
    const { db } = await import("@/lib/db")
    const { aiRequests, users } = await import("@/lib/db/schema")
    const { eq } = await import("drizzle-orm")

    // ai_requests.user_id is the local users.id (FK); map from the Clerk id.
    let localUserId: string | undefined
    if (rec.userId) {
      const [u] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkUserId, rec.userId))
        .limit(1)
      localUserId = u?.id
    }

    await db.insert(aiRequests).values({
      requestId: rec.requestId,
      userId: localUserId,
      conversationId: rec.conversationId,
      question: rec.question,
      provider: rec.provider,
      model: rec.model,
      latencyMs: rec.latencyMs,
      tokensPrompt: rec.tokensPrompt,
      tokensCompletion: rec.tokensCompletion,
      retrievalCount: rec.retrievalCount,
      verified: rec.verified ?? false,
    })
  } catch (err) {
    // Observability must never break a request.
    logger.error("ai_request.record.failed", {
      requestId: rec.requestId,
      data: { error: (err as Error).message },
    })
  }
}
