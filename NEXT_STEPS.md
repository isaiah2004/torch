# Torch — Next Steps (full backlog)

An exhaustive, tickable task list for everything after Phase 1. Pairs with
[`HANDOVER.md`](./HANDOVER.md) (orientation) and [`ARCHITECTURE.md`](./ARCHITECTURE.md)
(design). Work top-to-bottom; each phase ends with an acceptance check.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done. Keep these boxes updated as
you go so the branch reflects live state.

---

## Phase 2 — RAG core (ingestion + retrieval)

**Outcome:** ingest a real book and get a streamed answer with genuine quotes +
citations, wired straight into `/api/chat` (no graph yet).

### 2.0 Dependencies
- [ ] PDF parser — `unpdf` (serverless-friendly) or `pdf-parse`
- [ ] EPUB parser — e.g. `epub2` / `@gxl/epub-parser`
- [ ] HTML → text — `node-html-parser` or `cheerio`
- [ ] Text splitter — `@langchain/textsplitters` (or hand-rolled)
- [ ] Token counter — `js-tiktoken`
- [ ] (dev) ephemeral Postgres for integration tests — `@testcontainers/postgresql` or a docker-compose pg with pgvector

### 2.1 Loaders — `lib/ingestion/loaders/`
- [ ] `pdf.ts` — text + per-page boundaries (capture page numbers)
- [ ] `epub.ts` — chapters/sections + structure
- [ ] `markdown.ts` — heading tree preserved
- [ ] `html.ts` — strip nav/boilerplate, keep headings
- [ ] `text.ts` — plain passthrough
- [ ] Common return type `{ text, pages?, headings? }`; unit tests per loader on small fixtures

### 2.2 Clean — `lib/ingestion/clean.ts`
- [ ] Strip running headers/footers, page furniture
- [ ] Normalize whitespace; de-hyphenate line-break splits
- [ ] Preserve paragraph + heading boundaries
- [ ] Unit tests on messy fixtures

### 2.3 Chunk — `lib/ingestion/chunk.ts`
- [ ] Heading/section-aware, token-windowed with overlap (preserve theological context — never arbitrary cuts)
- [ ] Attach `ChunkMeta` (chapter, section, pageStart/End, headingPath) per chunk
- [ ] Compute `tokenCount`
- [ ] Unit tests: boundary correctness, overlap, metadata carry-through

### 2.4 Embed — `lib/ingestion/embed.ts`
- [ ] Batch embed via `getEmbeddingModel()` (respect batch limits + retries)
- [ ] Assert vector length === `AI_EMBEDDING_DIMENSIONS`
- [ ] Unit test with a mocked provider

### 2.5 Pipeline — `lib/ingestion/pipeline.ts`
- [ ] Orchestrate parse → clean → chunk → embed → store
- [ ] `sha256` dedupe against `documents.sha256`
- [ ] Insert `documents` + `chunks`; update `documents.status` transitions
- [ ] Create/track `ingestion_jobs` (chunks_total/done, model, timing, error)
- [ ] Structured logs at every step (ingestion event family)
- [ ] Integration test against ephemeral pg (ingest a fixture, assert rows + vectors)

### 2.6 Retrieval — `lib/retrieval/`
- [ ] `search.ts` — embed query → pgvector cosine ANN via Drizzle (`embedding <=> $q`, `vector_cosine_ops`)
- [ ] Metadata filters (tradition, sourceType, year range, source allow-list)
- [ ] `rerank.ts` — hosted reranker through the provider layer (`Reranker`)
- [ ] Return `{ selected, rejected }` (both logged for the inspector)
- [ ] Avoid over-large context — top-K after rerank, drop low scores
- [ ] Integration test: ranking order on a seeded corpus

### 2.7 Seed sources — `scripts/seed-sources.ts`
- [ ] Parse `protestant-theology-knowledge-base.md` → `sources` rows (title, author, tradition, type, url, year)
- [ ] Idempotent upsert; `pnpm seed:sources`
- [ ] Surface seeded sources in `/library`

### 2.8 Ingest entry points
- [ ] `app/api/ingest/route.ts` — admin-gated upload (multipart), enqueue pipeline, return job id
- [ ] `scripts/ingest-cli.ts` — local batch ingest (`tsx`)
- [ ] Admin "ingest" page hookup (upload + job status)

### 2.9 Wire `/api/chat` to real retrieval
- [ ] Retrieve evidence → build grounded prompt (system rules from ARCHITECTURE §8)
- [ ] Stream answer tokens + real `citations` events (keep NDJSON contract)
- [ ] Record `ai_requests` (non-private only); never persist private mode
- [ ] Manual check: ask against an ingested book, verify quotes are real

**✅ Phase 2 acceptance:** ingest a book → ask a question → streamed answer with
verbatim quotes + author/work/page citations rendered in the existing chat UI;
ingestion + retrieval covered by tests.

---

## Phase 3 — Grounded answers (LangGraph + verifier)

**Outcome:** the controlled reasoning graph replaces the direct call, and no
answer ships unless every citation/quote/page is verified.

### 3.0 Dependencies
- [ ] `@langchain/langgraph`, `@langchain/core`

### 3.1 Graph — `lib/graph/`
- [ ] `state.ts` — typed graph state (requestId, question, intent, plannedQueries, retrieved, reranked, selected/rejected, draftAnswer, citations, verification, confidence)
- [ ] `nodes/` one file each: intent_analysis, retrieval_planning, source_retrieval, reranking, evidence_validation, answer_generation, citation_verification, response_review, stream_response
- [ ] Conditional edges: insufficient evidence → "no reliable source" path; verify fail → bounded regenerate → safer hedged answer
- [ ] `graph.ts` — wire + compile
- [ ] Emit `status` events per node (UI status line already consumes them)
- [ ] Integration test: full run with a mocked provider

### 3.2 Agent tools — `lib/graph/tools/` (allow-listed, typed I/O + zod + logging)
- [ ] `scripture_lookup` (see 3.4)
- [ ] `retrieval_search`
- [ ] `citation_lookup`
- [ ] `metadata_lookup`
- [ ] `conversation_history` (excludes private)
- [ ] `user_preferences`
- [ ] `search_filters`
- [ ] Per-tool unit tests; deny anything not allow-listed

### 3.3 Verifier — `lib/verification/`
- [ ] Confirm every quoted span exists verbatim (normalized) in selected evidence
- [ ] Confirm every citation maps to a retrieved `chunkId`/`sourceId`; author/work/page agree
- [ ] Flag unsupported claims; fail → regenerate (bounded) or hedge
- [ ] **Regression suite:** fabricated quote/page/citation fixtures that MUST be rejected
- [ ] Set `ai_requests.verified` accordingly

### 3.4 Scripture — load your copy into Postgres
- [ ] New table `bible_verses` (translation, book, chapter, verse, text) + migration
- [ ] `scripts/load-bible.ts` importer for your file
- [ ] Back `scripture_lookup` with it; render in "Biblical References"
- [ ] **Needs from you:** the Scripture file + format + translation/license

**✅ Phase 3 acceptance:** answers flow through the graph; the verifier provably
rejects fabricated citations (regression suite green); Scripture references
resolve from the DB.

---

## Phase 4 — Observability & UX

**Outcome:** history, private mode end-to-end, settings, and live admin dashboards.

### 4.1 Conversation history
- [ ] Persist conversations/messages (non-private) on each turn
- [ ] `app/api/conversations` + `[id]` CRUD
- [ ] `/history` lists real conversations; `/chat/[conversationId]` resumes
- [ ] Auto-title conversations

### 4.2 Private mode (end-to-end)
- [ ] Ensure no messages/ai_requests/logs persist when `isPrivate`
- [ ] Not resumable/recoverable; excluded from all admin views by construction
- [ ] Test asserting zero rows after a private turn

### 4.3 Settings
- [ ] Preferred traditions + default translation → `users.preferences`
- [ ] Feed prefs into `user_preferences` tool / retrieval filters

### 4.4 Admin dashboards — `app/(app)/admin/*`
- [ ] `requests` — `ai_requests`: ts, user, latency, provider, tokens, retrieval count
- [ ] `embeddings` — `ingestion_jobs` + document/chunk counts, vector stats
- [ ] `retrieval` — retrieved chunks, scores, selected vs rejected
- [ ] `graph` — LangGraph state/nodes/timing/tool calls/validation (execution viewer)
- [ ] `sessions` — conversations/messages/citations (never private)
- [ ] Backing `app/api/admin/*` routes (role-gated); reuse shadcn `data-table`/`chart`/`section-cards` (removed earlier — re-add from shadcn)
- [ ] Filters: user / conversation / request / document / timestamp / severity

**✅ Phase 4 acceptance:** real history + resumable chats; private turns leave no
trace; admins can inspect requests, embeddings, retrieval, and graph runs.

---

## Phase 5 — Hardening & deploy

- [ ] Rate limiting on `/api/chat` + `/api/ingest` (`RATE_LIMIT_CHAT_PER_MIN`)
- [ ] Security pass: authz on every route, input validation, secrets server-only, dependency audit
- [ ] Perf: streaming tuning, vector index/query tuning (HNSW params), embedding batch sizing
- [ ] Raise test coverage on all critical systems; add e2e happy-path (sign-in → ask → cited answer)
- [ ] CI: typecheck + lint + test + build on PRs
- [ ] **Mega review gate** (ARCHITECTURE §17): static analysis → types → lint → unit → integration → e2e → perf → security → citation verification → architecture review
- [ ] Railway deploy config (Dockerfile/Nixpacks, migrations on release, env)
- [ ] (Optional, deferred) Cloudflare Workers + Hyperdrive path if edge is wanted later

**✅ Phase 5 acceptance:** secured, tested, observable, and deployed on Railway
with the full review gate passing.

---

## Inputs still needed from you
- [ ] Scripture file + format + translation/license (Phase 3.4)
- [ ] Reranker model choice (Cohere / Voyage / BGE via OpenRouter) (Phase 2.6)
- [ ] Preferred `AI_CHAT_MODEL` (OpenRouter id — MiniMax / Claude / GPT)

## Standing rules (apply to every task)
- Route AI calls through `lib/providers`; never import the SDK directly in features.
- Keep the NDJSON streaming contract (`lib/chat/protocol.ts`) stable.
- Private-mode events are never persisted — preserve the invariant.
- Never cite/quote anything not retrieved; prefer "I could not find a reliable source."
- TDD: failing test first for retrieval, embeddings, chunking, verifier, graph, db, API.
