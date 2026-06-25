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

> **Status (2026-06-26):** core code complete and green (`pnpm typecheck`/`lint`/
> `test` 43 passing/`build`). Remaining boxes need live infra (a Postgres with
> pgvector + an embedding key) and the admin UI hookups — see the per-item notes.

### 2.0 Dependencies
- [x] PDF parser — `unpdf` (serverless-friendly)
- [x] EPUB parser — `jszip` + `node-html-parser` (parse OPF spine + XHTML; avoids fragile epub libs)
- [x] HTML → text — `node-html-parser`
- [x] Text splitter — hand-rolled, token-aware (see `lib/ingestion/chunk.ts`)
- [x] Token counter — `js-tiktoken` (`cl100k_base`, see `lib/ingestion/tokenize.ts`)
- [ ] (dev) ephemeral Postgres for integration tests — `@testcontainers/postgresql` or docker pg+pgvector (not yet added; DB-touching code is unit-tested with injected fakes)

### 2.1 Loaders — `lib/ingestion/loaders/`
- [x] `pdf.ts` — text + per-page boundaries (page spans → page numbers on chunks)
- [x] `epub.ts` — spine order, cross-document heading offsets
- [x] `markdown.ts` — ATX heading offsets (ignores fenced code)
- [x] `html.ts` — strips nav/boilerplate, keeps heading offsets (shared `html-extract.ts`)
- [x] `text.ts` — plain passthrough (line-ending normalize)
- [x] Common return type `{ text, pages?, headings? }` + dispatcher (`detectFormat`/`loadDocument`); unit tests per loader (`tests/unit/ingestion-loaders.test.ts`)

### 2.2 Clean — `lib/ingestion/clean.ts`
- [~] Strip running headers/footers, page furniture (standalone page-number lines + boilerplate tags done; cross-page running-header detection deferred)
- [x] Normalize whitespace; de-hyphenate line-break splits
- [x] Preserve paragraph + heading boundaries (clean runs per-chunk, after offsets are derived)
- [x] Unit tests (`tests/unit/ingestion-chunk.test.ts`)

### 2.3 Chunk — `lib/ingestion/chunk.ts`
- [x] Heading/section-aware, token-windowed with overlap (paragraph-granular; never cuts across a heading)
- [x] Attach `ChunkMeta` (chapter, section, pageStart/End, headingPath) per chunk
- [x] Compute `tokenCount`
- [x] Unit tests: boundary correctness, overlap, metadata carry-through

### 2.4 Embed — `lib/ingestion/embed.ts`
- [x] Batch embed via `getEmbeddingModel()` (batched; order preserved)
- [x] Assert vector length === model `dimensions`
- [x] Unit test with a mocked provider (`tests/unit/ingestion-pipeline.test.ts`)

### 2.5 Pipeline — `lib/ingestion/pipeline.ts`
- [x] Orchestrate parse → clean → chunk → embed → store (`prepareDocument` pure core + `ingestDocument` persistence)
- [x] `sha256` dedupe against `documents.sha256`
- [x] Insert `documents` + `chunks`; update `documents.status` transitions
- [x] Create/track `ingestion_jobs` (chunks_total/done, model, timing, error)
- [x] Structured logs at every step (`ingestion.*` event family)
- [ ] Integration test against ephemeral pg (deferred — `prepareDocument` unit-tested with a fake embedder; `ingestDocument` accepts an injected `db` for a future integration test)

### 2.6 Retrieval — `lib/retrieval/`
- [x] `search.ts` — embed query → pgvector cosine ANN via Drizzle (`cosineDistance`, HNSW order)
- [x] Metadata filters (tradition, sourceType, year range, source allow-list)
- [x] `rerank.ts` — hosted reranker through the provider layer (**Cohere `rerank-v3.5`**, `getReranker()`); LLM-free vector-score fallback when no key
- [x] Return `{ selected, rejected }` (both logged for the inspector)
- [x] Avoid over-large context — top-K candidates, top-N after rerank, drop below `minScore`
- [ ] Integration test: ranking order on a seeded corpus (deferred — needs pg; rerank/selection logic unit-tested)

### 2.7 Seed sources — `scripts/seed-sources.ts`
- [x] Parse `protestant-theology-knowledge-base.md` → `sources` rows (parser in `lib/ingestion/knowledge-base.ts`, unit-tested: 30 books + 30 sites)
- [x] Idempotent upsert (skip by title); `pnpm seed:sources`
- [ ] Surface seeded sources in `/library` (page still a shell — Phase 4 UX)

### 2.8 Ingest entry points
- [x] `app/api/ingest/route.ts` — admin-gated multipart upload → pipeline → returns `{documentId, chunkCount, deduped}`
- [x] `scripts/ingest-cli.ts` — local batch ingest (`tsx scripts/ingest-cli.ts <sourceId> <file…>`)
- [ ] Admin "ingest" page hookup (upload + job status) — Phase 4 UX

### 2.9 Wire `/api/chat` to real retrieval
- [x] Retrieve evidence → grounded prompt (system rules from ARCHITECTURE §8, `lib/chat/grounded.ts`)
- [x] Stream answer tokens + real `citations` events (NDJSON contract unchanged); honest "no reliable source" path when retrieval is empty
- [x] Record `ai_requests` (non-private only, `lib/chat/record.ts`); private mode never persisted
- [ ] Manual check: ask against an ingested book, verify quotes are real (needs live DB + keys)

**✅ Phase 2 acceptance:** ingest a book → ask a question → streamed answer with
verbatim quotes + author/work/page citations rendered in the existing chat UI;
ingestion + retrieval covered by tests.

**Where it stands:** all code paths implemented and unit-tested (43 tests, gate
green). The end-to-end acceptance run + the two integration tests are blocked
only on provisioning Postgres/pgvector + an embedding key; the code is structured
to drop straight into them (injectable `db` + embedder).

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
> **Infra ready (2026-06-26):** data layer built ahead of the graph. Source =
> `scrollmapper/bible_databases`. Public-domain to load: KJV, ASV, WEB, YLT,
> Geneva 1599. NIV/NKJV are **quote-only** via api.bible (copies coming).
- [x] New tables `bible_verses` + `bible_translations` (`canRedistribute`/license flag) + migration `0001_*`
- [x] `scripts/load-bible.ts` importer (`pnpm load:bible`; tolerates scrollmapper array/nested JSON shapes) — `normalizeVerseRecords` unit-tested
- [x] Reference parser + canonical 66-book resolver (`lib/scripture/`, unit-tested) and DB-backed `lookupPassage`
- [x] api.bible client for quote-only licensed translations (`API_BIBLE_KEY`, `lib/scripture/api-bible.ts`)
- [ ] Back the `scripture_lookup` **tool** with `lookupPassage` (Phase 3.1 graph) and render in "Biblical References"
- [ ] Load the actual translation files once provided (public-domain via `load:bible`; NIV/NKJV via api.bible)

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
