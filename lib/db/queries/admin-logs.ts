/**
 * Admin query helpers for the structured logs table.
 *
 * Used by the admin/retrieval and admin/graph server-component pages.
 * These are read-only helpers — they never mutate data.
 */
import { and, desc, eq, ilike, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { logs } from "@/lib/db/schema"

type LogLevel = "debug" | "info" | "warn" | "error"

const VALID_LEVELS = new Set<string>(["debug", "info", "warn", "error"])

// ── Retrieval inspector ──────────────────────────────────────────────────────

/**
 * Recent `retrieval.search` and `retrieval.rerank` events, newest first.
 *
 * Data shapes:
 *   retrieval.search  → { topK, returned, filters, topScore }
 *   retrieval.rerank  → { reranked, candidates, selected, rejected, selectedScores }
 */
export async function listRetrievalEvents({
  limit = 100,
}: { limit?: number } = {}) {
  return db
    .select({
      ts: logs.ts,
      event: logs.event,
      requestId: logs.requestId,
      data: logs.data,
    })
    .from(logs)
    .where(inArray(logs.event, ["retrieval.search", "retrieval.rerank"]))
    .orderBy(desc(logs.ts))
    .limit(limit)
}

// ── Per-request trace ────────────────────────────────────────────────────────

/**
 * All log rows for a single request, in chronological order.
 * Useful for drilling into a full pipeline trace.
 */
export async function getRequestTrace(requestId: string) {
  return db
    .select()
    .from(logs)
    .where(eq(logs.requestId, requestId))
    .orderBy(logs.ts)
}

// ── General log explorer ─────────────────────────────────────────────────────

export interface ListLogsOptions {
  limit?: number
  /** Exact log level: debug | info | warn | error. */
  level?: string
  /** Substring match on event name (case-insensitive). */
  event?: string
}

/**
 * Recent logs, newest first, with optional level + event-substring filters.
 * Returns id for stable React keys in addition to the display fields.
 */
export async function listLogs({
  limit = 200,
  level,
  event,
}: ListLogsOptions = {}) {
  return db
    .select({
      id: logs.id,
      ts: logs.ts,
      level: logs.level,
      event: logs.event,
      requestId: logs.requestId,
      data: logs.data,
    })
    .from(logs)
    .where(
      and(
        level && VALID_LEVELS.has(level)
          ? eq(logs.level, level as LogLevel)
          : undefined,
        event ? ilike(logs.event, `%${event}%`) : undefined,
      ),
    )
    .orderBy(desc(logs.ts))
    .limit(limit)
}
