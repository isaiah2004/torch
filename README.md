# Torch

A biblically faithful AI research assistant built on Retrieval-Augmented
Generation. Torch retrieves from respected Christian sources, quotes them
verbatim, cites them precisely, verifies every citation before answering, and is
honest about uncertainty and disagreement between traditions.

> **Guiding principle:** every decision optimizes for one question — *"Will this
> help someone receive a trustworthy, biblically grounded answer supported by
> real sources?"* See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design.

## Stack

- **Next.js 16** (App Router) · TypeScript (strict) · Tailwind v4 · shadcn/ui
- **Clerk** authentication (ChatGPT-style login)
- **Railway PostgreSQL + pgvector** (one DB: app data, embeddings, logs)
- **Drizzle ORM** for schema + migrations
- **OpenRouter → OpenAI** provider abstraction (swap models by config only)
- **LangGraph** reasoning graph (Phases 2–3) · **OpenAI** embeddings
- Node.js runtime · deploys to Railway (Cloudflare path deferred)

## Project status — Phase 1 (Foundation)

Implemented: Clerk auth + login UI, full Drizzle schema + pgvector migration,
the app shell (Torch sidebar/header), the streaming chat UI, the AI provider
abstraction, and the structured logging skeleton. Retrieval, ingestion, the
LangGraph pipeline, and the admin dashboards land in later phases.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
```

Required to run end-to-end: Clerk keys, a `DATABASE_URL` (Railway Postgres),
and an `OPENROUTER_API_KEY` / `OPENAI_API_KEY`. See `.env.example`.

### Database

```bash
pnpm db:generate   # generate SQL migrations from lib/db/schema.ts
pnpm db:migrate    # apply migrations (enables pgvector, creates tables + HNSW index)
```

### Develop

```bash
pnpm dev           # http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` / `build` / `start` | Next.js dev / production build / serve |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright e2e (needs a running server) |
| `pnpm db:generate` / `db:migrate` / `db:push` | Drizzle migrations |

## Layout

```
app/(auth)        Clerk sign-in / sign-up (centered-card layout)
app/(app)         Authenticated shell: chat, history, library, settings, admin
app/api           Route handlers (chat streaming, health)
lib/db            Drizzle schema, client, migrations
lib/providers     AI provider abstraction (OpenRouter / OpenAI)
lib/logging       Structured logger (console + Postgres)
lib/auth          Clerk helpers + role checks
components/chat    Chat UI (panel, composer, citations, sources)
```
