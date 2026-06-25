/**
 * Apply Drizzle migrations using the runtime (zero-dependency) drizzle-orm
 * migrator — no drizzle-kit / tsx needed, so it runs inside the slim standalone
 * container. Used by docker-entrypoint.sh (RUN_MIGRATIONS=true) and the compose
 * `migrate` service. Migration 0000 enables pgvector before any vector columns.
 */
import postgres from "postgres"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL is not set — cannot run migrations.")
  process.exit(1)
}

const sql = postgres(url, { max: 1 })
try {
  await migrate(drizzle(sql), { migrationsFolder: "./lib/db/migrations" })
  console.log("Migrations applied.")
} catch (err) {
  console.error("Migration failed:", err)
  process.exitCode = 1
} finally {
  await sql.end()
}
