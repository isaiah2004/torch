/**
 * Structured logger.
 *
 * Objective (ARCHITECTURE.md §10): no unexpected behavior occurs without a
 * trace explaining why. Every event is written to the console (always) and,
 * when a database is configured and the context is not private, persisted to
 * the `logs` table for the admin debugging dashboards.
 *
 * Private mode: pass `private: true` in the context and nothing is persisted.
 */
import { serverEnv } from "@/lib/env"

export type LogLevel = "debug" | "info" | "warn" | "error"

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export interface LogContext {
  requestId?: string
  userId?: string
  conversationId?: string
  documentId?: string
  /** When true, this event is never persisted (private mode). */
  private?: boolean
}

export interface LogFields extends LogContext {
  severity?: number
  data?: Record<string, unknown>
}

function enabled(level: LogLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[serverEnv.LOG_LEVEL]
}

/**
 * Persist a log row. Imported lazily so that the logger has no hard dependency
 * on the database (keeps it usable in tests and when DATABASE_URL is unset).
 */
async function persist(
  level: LogLevel,
  event: string,
  fields: LogFields,
): Promise<void> {
  if (fields.private || !serverEnv.DATABASE_URL) return
  try {
    const { db } = await import("@/lib/db")
    const { logs } = await import("@/lib/db/schema")
    await db.insert(logs).values({
      level,
      event,
      requestId: fields.requestId ?? null,
      userId: fields.userId ?? null,
      conversationId: fields.conversationId ?? null,
      documentId: fields.documentId ?? null,
      severity: fields.severity ?? 0,
      data: fields.data ?? {},
    })
  } catch (err) {
    // Never let logging failures break a request.
    console.error("[logger] failed to persist log", err)
  }
}

function emit(level: LogLevel, event: string, fields: LogFields = {}): void {
  if (!enabled(level)) return
  const line = {
    level,
    event,
    requestId: fields.requestId,
    userId: fields.userId,
    conversationId: fields.conversationId,
    documentId: fields.documentId,
    ...fields.data,
  }
  const fn =
    level === "error"
      ? console.error
      : level === "warn"
        ? console.warn
        : console.log
  fn(`[${level}] ${event}`, line)
  // Fire-and-forget DB persistence.
  void persist(level, event, fields)
}

export const logger = {
  debug: (event: string, fields?: LogFields) => emit("debug", event, fields),
  info: (event: string, fields?: LogFields) => emit("info", event, fields),
  warn: (event: string, fields?: LogFields) => emit("warn", event, fields),
  error: (event: string, fields?: LogFields) => emit("error", event, fields),
  /** Bind a context (e.g. requestId, private) returned for repeated use. */
  child(ctx: LogContext) {
    const merge = (fields?: LogFields): LogFields => ({ ...ctx, ...fields })
    return {
      debug: (event: string, fields?: LogFields) =>
        emit("debug", event, merge(fields)),
      info: (event: string, fields?: LogFields) =>
        emit("info", event, merge(fields)),
      warn: (event: string, fields?: LogFields) =>
        emit("warn", event, merge(fields)),
      error: (event: string, fields?: LogFields) =>
        emit("error", event, merge(fields)),
    }
  },
}

export type Logger = typeof logger
