/**
 * Centralized, validated environment access.
 *
 * Secrets are read server-side only. Importing this module in client code that
 * touches `serverEnv` will fail the build (good — it keeps keys off the client).
 * Public values live under `publicEnv` and are safe to ship to the browser.
 */
import { z } from "zod"

/** Server-only secrets and connection strings. Never import into client bundles. */
const serverSchema = z.object({
  // Database (Railway Postgres + pgvector)
  DATABASE_URL: z.string().url().optional(),

  // Clerk
  CLERK_SECRET_KEY: z.string().optional(),

  // AI provider abstraction — config-only swaps (see lib/providers)
  AI_PROVIDER: z.enum(["openrouter", "openai"]).default("openrouter"),
  AI_CHAT_MODEL: z.string().default("openai/gpt-4o-mini"),
  AI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
  AI_EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),
  AI_RERANK_MODEL: z.string().default("rerank-v3.5"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  // Hosted reranker (Cohere). When unset, retrieval falls back to vector-score order.
  COHERE_API_KEY: z.string().optional(),
  // api.bible — for quote-only licensed translations (NIV/NKJV). See lib/scripture.
  API_BIBLE_KEY: z.string().optional(),
  // JSON map of translation code → api.bible Bible id, e.g. {"NIV":"<id>"}.
  API_BIBLE_IDS: z.string().optional(),

  // Ops
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  RATE_LIMIT_CHAT_PER_MIN: z.coerce.number().int().positive().default(20),
})

const publicSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
})

/**
 * Parse lazily so that missing optional vars during build/preview don't crash,
 * while still giving typed, validated access at call sites.
 */
function parseServer() {
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${parsed.error.toString()}`,
    )
  }
  return parsed.data
}

export const serverEnv = parseServer()

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
})

export type ServerEnv = typeof serverEnv
export type PublicEnv = typeof publicEnv
