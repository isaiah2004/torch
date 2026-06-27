/**
 * Drizzle client backed by postgres.js, pooled for the Node runtime.
 *
 * The connection is created LAZILY on first query — importing this module never
 * opens a socket. That keeps build-time page-data collection (which has no
 * DATABASE_URL) from crashing when route/query modules import `db` at the top
 * level. A single pool is reused across hot reloads in dev via a global.
 */
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import { serverEnv } from "@/lib/env"
import * as schema from "./schema"

declare global {
  var __torchSql: ReturnType<typeof postgres> | undefined
}

function connect() {
  if (!serverEnv.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your environment to use the database.",
    )
  }
  const client =
    globalThis.__torchSql ??
    postgres(serverEnv.DATABASE_URL, { max: 10, prepare: false })
  if (process.env.NODE_ENV !== "production") globalThis.__torchSql = client
  return drizzle(client, { schema })
}

type Db = ReturnType<typeof connect>

let cached: Db | undefined
function getDb(): Db {
  return (cached ??= connect())
}

/**
 * Lazy DB handle. First property access initializes the pool; until then,
 * importing `db` is side-effect free (safe at build time without DATABASE_URL).
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb() as object
    const value = Reflect.get(real, prop, receiver)
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value
  },
}) as Db

export { schema }
export type Database = Db
