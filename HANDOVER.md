# Torch — Handover

This branch hands off Torch after **Phase 1 (Foundation)** so you can continue
locally. It contains everything on the feature branch plus this document.

- **Architecture / source of truth:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Full task backlog (every next step, tickable):** [`NEXT_STEPS.md`](./NEXT_STEPS.md)
- **Phase 1 PR:** https://github.com/isaiah2004/torch/pull/1
- **Feature branch:** `claude/torch-theological-rag-81wp27`
- **This handover branch:** `claude/torch-handover`

---

## 1. Where things stand

**Done (Phase 1):** Clerk auth + ChatGPT-style login, Drizzle schema + pgvector
migration, Torch app shell (sidebar/header), streaming chat UI (NDJSON), AI
provider abstraction (OpenRouter→OpenAI, env-only swaps), structured logging
skeleton, zod validation, Vitest/Playwright setup.

**Quality gate (all green):** `pnpm typecheck` · `pnpm lint` · `pnpm test` (7/7)
· `pnpm build`.

**Stubbed on purpose:** `/api/chat` streams an honest placeholder over the real
protocol — retrieval/LLM are not wired yet. History/Library/Admin pages are
shells. No ingestion, no LangGraph, no verifier yet.

---

## 2. Run it locally

**Prereqs:** Node ≥ 20.9, pnpm 10, a Railway (or any) Postgres, a Clerk app,
and an OpenRouter and/or OpenAI key.

```bash
git clone https://github.com/isaiah2004/torch.git
cd torch
git checkout claude/torch-handover     # or the feature branch
pnpm install
cp .env.example .env.local             # fill in values (see below)
pnpm db:migrate                        # enables pgvector + creates tables
pnpm dev                               # http://localhost:3000
```

`pnpm approve-builds` once if you want esbuild's postinstall (optional; not
required for dev/build/test).

### Environment (`.env.local`)
| Var | Notes |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | From the Clerk dashboard. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `_SIGN_UP_URL` | `/sign-in` / `/sign-up`. |
| `DATABASE_URL` | Railway Postgres connection string. |
| `AI_PROVIDER` | `openrouter` (default) or `openai`. |
| `AI_CHAT_MODEL` | e.g. `openai/gpt-4o-mini`, `anthropic/claude-3.5-sonnet`, or a MiniMax id on OpenRouter. |
| `AI_EMBEDDING_MODEL` / `AI_EMBEDDING_DIMENSIONS` | `text-embedding-3-small` / `1536` (keep in sync with the schema). |
| `OPENROUTER_API_KEY`, `OPENAI_API_KEY` | OpenAI key also powers embeddings. |
| `LOG_LEVEL`, `RATE_LIMIT_CHAT_PER_MIN` | Ops. |

### Clerk setup
1. Create an app; copy keys into `.env.local`.
2. Set the sign-in/up paths to `/sign-in` and `/sign-up` (and "after auth" → `/chat`).
3. **Admin:** either give yourself an org role of `org:admin`, **or** add
   `role: "admin"` to your user's public metadata **and** add a `metadata` claim
   to the session token (Clerk → Sessions → customize the session token:
   `{ "metadata": "{{user.public_metadata}}" }`). `lib/auth/isAdmin()` checks both.

### Railway Postgres
Provision Postgres on Railway, set `DATABASE_URL`, run `pnpm db:migrate`. The
first migration runs `CREATE EXTENSION vector` and builds the HNSW index — make
sure the image supports pgvector (Railway's Postgres does).

---

## 3. Conventions & gotchas (read before coding)

- **Next.js 16 specifics** (this is NOT the Next.js in your training data — read
  `node_modules/next/dist/docs/` when unsure):
  - Middleware is renamed to **`proxy.ts`** (nodejs runtime; no edge). Clerk lives there.
  - Turbopack is the default builder; `params`/`searchParams` are async.
  - The authed shell is `export const dynamic = "force-dynamic"` (don't prerender per-user pages).
- **Provider layer:** never import the `openai` SDK directly in features — go
  through `lib/providers` (`getProvider()`, `getEmbeddingModel()`). Swapping
  models = env change only.
- **Streaming contract:** `lib/chat/protocol.ts` defines the NDJSON events
  (`token`/`status`/`citations`/`done`/`error`). Keep `/api/chat` and the UI on
  this contract as you add the real pipeline — the UI already renders all of it.
- **Logging:** use `logger`/`logger.child({ requestId, private })`. Private-mode
  events are never persisted — preserve that invariant everywhere.
- **Hallucination rule (non-negotiable, ARCHITECTURE §8):** never cite/quote
  anything not in the retrieved set; prefer "I could not find a reliable source."
- **TDD:** write the failing test first for retrieval/embeddings/chunking/
  verifier/graph/db/API. `tests/unit` is wired; add `tests/integration` for DB.

---

## 4. Next steps — the plan

### ▶ Phase 2 — RAG core (start here)
Goal: ingest documents and retrieve real evidence. No graph yet — wire
retrieval into `/api/chat` directly to prove the loop end-to-end.

1. **Add deps:** a PDF parser (`unpdf` is serverless-friendly), an EPUB parser,
   `@langchain/textsplitters` (or hand-rolled splitter), and a token counter
   (`js-tiktoken`).
2. **Loaders** (`lib/ingestion/loaders/`): `pdf`, `epub`, `md`, `html`, `txt` →
   normalized `{ text, structure }`. Capture page numbers where the format allows.
3. **Clean** (`lib/ingestion/clean.ts`): strip headers/footers/boilerplate,
   normalize whitespace, de-hyphenate line breaks.
4. **Chunk** (`lib/ingestion/chunk.ts`): heading/section-aware, token-windowed
   with overlap — **preserve theological context**, never arbitrary cuts. Carry
   `ChunkMeta` (chapter/section/page/headingPath) onto each chunk.
5. **Embed** (`lib/ingestion/embed.ts`): batch via `getEmbeddingModel()`.
6. **Pipeline** (`lib/ingestion/pipeline.ts`): parse→clean→chunk→embed→store;
   `sha256` dedupe; write `documents` + `chunks`; track `ingestion_jobs` +
   `documents.status`. Log every step.
7. **Retrieval** (`lib/retrieval/`): embed query → pgvector cosine ANN via
   Drizzle (`embedding <=> $query` with `vector_cosine_ops`), apply metadata
   filters, then **hosted rerank** through the provider layer; return selected +
   rejected evidence (both logged for the inspector).
8. **Seed** (`scripts/seed-sources.ts`): parse `protestant-theology-knowledge-base.md`
   into `sources` rows (title/author/tradition/type/url). `pnpm seed:sources`.
9. **Admin ingest route + CLI:** `app/api/ingest/route.ts` (admin-gated upload)
   and `scripts/ingest-cli.ts` for local batches.
10. **Wire `/api/chat`:** retrieve → build grounded prompt → stream the answer +
    real `citations` events. Keep the protocol unchanged.
11. **Tests:** chunker boundaries, retrieval ranking, ingestion against an
    ephemeral Postgres (pgvector).

**Phase 2 exit:** ingest a real book, ask a question, get a streamed answer with
genuine quotes + citations rendered in the existing UI.

### ▶ Phase 3 — Grounded answers (LangGraph + verifier)
1. Add `@langchain/langgraph` + `@langchain/core`.
2. Build the graph (`lib/graph/`): intent → retrieval planning → retrieval →
   rerank → evidence validation → generation → **citation verification** →
   review → stream. Typed state in `state.ts`; one file per node; emit `status`
   events per node so the UI status line goes live.
3. Allow-listed **agent tools** (`lib/graph/tools/`): `scripture_lookup`,
   `retrieval_search`, `citation_lookup`, `metadata_lookup`,
   `conversation_history`, `user_preferences`, `search_filters` — typed I/O +
   zod + logging.
4. **Verifier** (`lib/verification/`): confirm every quote exists verbatim in
   evidence, every citation/page maps to a retrieved chunk; fail → regenerate or
   return a safer hedged answer. Add a regression suite of fabricated-citation
   fixtures that must be rejected.
5. **Scripture:** load your copy into Postgres (new `bible_verses` table) and
   back `scripture_lookup` with it. **← I need your Scripture file/format.**

### ▶ Phase 4 — Observability & UX
Conversation history (persist messages, list in History), private-mode wiring
end-to-end, settings (preferred traditions/translation → `users.preferences`),
and the admin dashboards (`/admin/requests|embeddings|retrieval|graph|sessions`)
reading live `logs`/`ai_requests`. The old template components
(`section-cards`, `chart`, `data-table`) were removed — re-add from shadcn if you
want them for these dashboards.

### ▶ Phase 5 — Hardening
Test-coverage push, rate limiting on `/api/chat` + `/api/ingest`, perf (stream
tuning, vector query/index tuning), security review, and — if you later want
edge — the Cloudflare Workers + Hyperdrive path (deferred; Railge/Node now).

---

## 5. Open decisions / inputs needed
- **Scripture source** (Phase 3): you said you have a copy to load — send the
  file + format (which translation, JSON/CSV/XML?) so `scripture_lookup` can be built.
- **Reranker model:** confirm which hosted rerank model (Cohere / Voyage / a
  BGE reranker via OpenRouter) to use; it plugs into the provider layer.
- **Default chat model:** set `AI_CHAT_MODEL` to your preferred OpenRouter id
  (MiniMax / Claude / GPT) — no code change needed.

---

## 6. File map (today)
```
ARCHITECTURE.md            full design + roadmap
proxy.ts                   Clerk auth (Next 16 middleware replacement)
app/(auth)/                sign-in / sign-up + centered-card layout
app/(app)/                 authed shell: chat, history, library, settings, admin
app/api/chat/route.ts      streaming endpoint (placeholder → wire Phase 2)
app/api/health/route.ts    public health check
lib/env.ts                 zod-validated env (server + public)
lib/db/                    schema.ts, index.ts (client), migrations/
lib/providers/             types.ts, index.ts (factory), openai-compatible.ts
lib/logging/               structured logger (console + Postgres)
lib/auth/                  Clerk helpers + role checks
lib/chat/protocol.ts       NDJSON stream contract (shared client/server)
lib/validation/chat.ts     zod request schemas
components/chat/           chat-panel, composer, message-bubble, source-panel, confidence-badge
tests/unit, tests/e2e      Vitest + Playwright
```

Happy to keep driving any phase from here — just say which.
