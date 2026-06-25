/**
 * Drizzle client backed by postgres.js, pooled for the Node runtime.
 *
 * A single shared connection pool is reused across hot reloads in dev via a
 * global, and created once per worker in production.
 */
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { serverEnv } from "@/lib/env"
import * as schema from "./schema"

declare global {
  var __torchSql: ReturnType<typeof postgres> | undefined
}

function createClient() {
  if (!serverEnv.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment to use the database.",
    )
  }
  return postgres(serverEnv.DATABASE_URL, {
    max: 10,
    prepare: false,
  })
}

const client = globalThis.__torchSql ?? createClient()
if (process.env.NODE_ENV !== "production") {
  globalThis.__torchSql = client
}

export const db = drizzle(client, { schema })
export { schema }
export type Database = typeof db
