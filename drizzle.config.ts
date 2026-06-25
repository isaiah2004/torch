import { defineConfig } from "drizzle-kit"

/**
 * drizzle-kit configuration.
 *   pnpm db:generate  → emit SQL migrations from lib/db/schema.ts
 *   pnpm db:migrate   → apply migrations to DATABASE_URL
 *   pnpm db:push      → push schema directly (dev convenience)
 */
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  // pgvector is enabled via a migration prelude (see lib/db/migrations/0000_*).
  extensionsFilters: ["postgis"],
  verbose: true,
  strict: true,
})
