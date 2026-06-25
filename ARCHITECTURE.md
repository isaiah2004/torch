# Torch — System Architecture

> **Status:** Blueprint for review (no implementation code yet).
> **Guiding principle:** Every engineering decision optimizes for one question —
> *"Will this help someone receive a trustworthy, biblically grounded answer
> supported by real sources?"* When forced to choose between speed, convenience,
> and correctness, **always choose correctness.**

Torch is a biblically faithful AI research assistant built on Retrieval-Augmented
Generation. It is **not** a generic chatbot — it is a trustworthy theological
research system that retrieves from respected Christian sources, quotes them
verbatim, cites them precisely, verifies every citation before answering, and is
honest about uncertainty and disagreement between traditions.

---

## 1. Decisions locked for this phase

| Concern | Decision | Rationale |
|---|---|---|
| App framework | **Next.js 16 (App Router) + TypeScript (strict)** | Already the codebase; SSR + route handlers + streaming. |
| Styling / UI | **Tailwind v4 + shadcn/ui (`radix-rhea`)** | Reuse existing components, sidebar, dashboard. |
| Auth | **Clerk** | No custom auth. Reuse ChatGPT-style auth layout. |
| Database | **Railway PostgreSQL + `pgvector`** | One DB for everything: app data, embeddings, logs. |
| ORM / migrations | **Drizzle ORM + drizzle-kit** | Typed schema, SQL-first, pgvector support. |
| Embeddings | **OpenAI `text-embedding-3-small`** (1536-dim) | Quality/cost balance; `-large` (3072) configurable. |
| Answer model provider | **Provider abstraction**: OpenRouter (primary) → OpenAI (secondary) | Swap models/providers by **config only**, never code. |
| Orchestration | **LangGraph** (graph) + **LangChain** (loaders/splitters/retrievers only) | Structured reasoning, not a naive chatbot. |
| Runtime | **Node.js runtime** (not edge) | LangGraph + multi-pass verification need Node. |
| Deploy target | **Railway** now; Cloudflare deferred to Phase 5 | Keep LangGraph full-featured; revisit edge later. |
| Testing | **Vitest** (unit/integration) + **Playwright** (e2e) | TDD-first for critical systems. |

### Deferred / revisit later
- **Cloudflare deployment** (Workers bundle limits + Hyperdrive for Railway PG) → Phase 5.
- **Reranker**: start with a hosted reranker via the provider layer (e.g. an
  OpenRouter/Cohere rerank model); a cross-encoder container is optional later.
- **Heavy ingestion** (large PDF/EPUB batches) may move to a dedicated Railway
  worker + queue if request-time parsing proves too slow.

---

## 2. High-level architecture

```
                          ┌────────────────────────────────────────┐
   Browser (Next.js UI)   │  Clerk-authenticated React app         │
   ─ chat / sources /     │  shadcn/ui · streaming chat · citations │
     library / admin      └───────────────┬────────────────────────┘
                                          │  (fetch, SSE/stream)
                          ┌───────────────▼────────────────────────┐
   Next.js Route Handlers │  /api/chat  /api/ingest  /api/admin/*  │
   (Node runtime)         │  Clerk middleware · zod validation      │
                          └───────┬───────────────┬─────────────────┘
                                  │               │
                    ┌─────────────▼───┐     ┌─────▼───────────────────┐
                    │  LangGraph      │     │  Ingestion pipeline      │
                    │  reasoning graph│     │  parse→clean→chunk→embed │
                    └───┬─────────┬───┘     └───────────┬─────────────┘
                        │         │                     │
          ┌─────────────▼──┐  ┌───▼──────────┐   ┌──────▼───────────────┐
          │ Provider layer │  │ Retriever    │   │ Provider layer       │
          │ chat/stream/   │  │ (pgvector)   │   │ embeddings           │
          │ tools/struct.  │  └───┬──────────┘   └──────┬───────────────┘
          └───────┬────────┘      │                     │
                  │               ▼                     ▼
          OpenRouter/OpenAI   ┌─────────────────────────────────────┐
                              │  PostgreSQL (Railway) + pgvector     │
                              │  app data · vectors · structured logs│
                              └─────────────────────────────────────┘
```

Everything persists to **one** Postgres instance: user/app data, document
chunks + embeddings, and structured logs. No additional databases.

---

## 3. Folder structure

```
torch/
├─ app/
│  ├─ (auth)/                     # Clerk auth — ChatGPT-style layout (reused)
│  │  ├─ sign-in/[[...rest]]/page.tsx
│  │  └─ sign-up/[[...rest]]/page.tsx
│  ├─ (app)/                      # Authenticated app shell (sidebar layout)
│  │  ├─ layout.tsx               # SidebarProvider + AppSidebar + SiteHeader
│  │  ├─ chat/[conversationId]/page.tsx
│  │  ├─ chat/page.tsx            # new conversation
│  │  ├─ history/page.tsx
│  │  ├─ library/page.tsx         # source library (read)
│  │  ├─ settings/page.tsx
│  │  └─ admin/                   # admin/debug dashboards (role-gated)
│  │     ├─ page.tsx              # overview
│  │     ├─ requests/page.tsx     # AI requests log
│  │     ├─ embeddings/page.tsx   # embedding/ingestion jobs
│  │     ├─ retrieval/page.tsx    # retrieval inspector
│  │     ├─ graph/page.tsx        # LangGraph execution viewer
│  │     ├─ sessions/page.tsx     # session viewer (no private-mode)
│  │     └─ ingest/page.tsx       # upload + monitor ingestion
│  ├─ api/
│  │  ├─ chat/route.ts            # POST: run graph, stream answer (Node)
│  │  ├─ conversations/route.ts   # CRUD
│  │  ├─ conversations/[id]/route.ts
│  │  ├─ ingest/route.ts          # POST: enqueue/parse a document (admin)
│  │  ├─ documents/route.ts       # list/metadata
│  │  └─ admin/                   # admin data endpoints (role-gated)
│  │     ├─ requests/route.ts
│  │     ├─ embeddings/route.ts
│  │     ├─ retrieval/route.ts
│  │     └─ logs/route.ts
│  ├─ layout.tsx                  # root (fonts, ThemeProvider, ClerkProvider)
│  └─ globals.css
├─ components/
│  ├─ ui/                         # shadcn primitives (existing)
│  ├─ chat/                       # MessageList, MessageBubble, Composer,
│  │                              # CitationCard, SourcePanel, ViewsBlock,
│  │                              # ConfidenceBadge, PrivateModeToggle
│  ├─ admin/                      # GraphTrace, RetrievalTable, JobsTable…
│  ├─ app-sidebar.tsx             # rebranded → Torch nav
│  └─ …                           # existing dashboard components, reused
├─ lib/
│  ├─ db/
│  │  ├─ schema.ts                # Drizzle tables (see §4)
│  │  ├─ index.ts                 # pooled client (postgres.js)
│  │  ├─ queries/                 # typed query modules
│  │  └─ migrations/              # drizzle-kit output
│  ├─ providers/                  # AI provider abstraction (see §5)
│  │  ├─ types.ts                 # ChatModel, EmbeddingModel, Reranker…
│  │  ├─ index.ts                 # factory: env → provider instance
│  │  ├─ openrouter.ts
│  │  └─ openai.ts
│  ├─ graph/                      # LangGraph reasoning workflow (see §6)
│  │  ├─ state.ts                 # graph state schema
│  │  ├─ graph.ts                 # node wiring + compile
│  │  ├─ nodes/                   # one file per node
│  │  └─ tools/                   # approved agent tools (see §7)
│  ├─ ingestion/                  # parse → clean → chunk → embed → store
│  │  ├─ loaders/                 # pdf, epub, md, html, txt
│  │  ├─ clean.ts
│  │  ├─ chunk.ts                 # context-preserving chunker
│  │  ├─ embed.ts
│  │  └─ pipeline.ts
│  ├─ retrieval/                  # vector search + rerank + evidence select
│  ├─ verification/               # citation/quote/page verifier (see §8)
│  ├─ logging/                    # structured logger → console + Postgres
│  ├─ auth/                       # Clerk helpers, role checks
│  ├─ validation/                 # zod schemas shared client/server
│  └─ utils.ts                    # existing cn() etc.
├─ tests/
│  ├─ unit/                       # mirrors lib/ modules
│  ├─ integration/                # db + graph + api (testcontainers/pg)
│  └─ e2e/                        # Playwright
├─ scripts/
│  ├─ seed-sources.ts             # seed from protestant-theology-knowledge-base.md
│  └─ ingest-cli.ts               # local ingestion for batches
├─ drizzle.config.ts
├─ vitest.config.ts
├─ playwright.config.ts
└─ ARCHITECTURE.md                # this file
```

---

## 4. Database schema (PostgreSQL + pgvector)

One instance. `CREATE EXTENSION IF NOT EXISTS vector;` Embedding columns use
`vector(1536)` (configurable). HNSW index on the embedding for fast ANN search.

```
users                 # mirror of Clerk identity (clerk_user_id PK-linked)
 ├─ id, clerk_user_id (unique), email, display_name, role (user|admin),
 │  created_at, preferences (jsonb)

sources               # a work / publication (citation root)
 ├─ id, title, author, publication, publisher, year,
 │  tradition (REF|LUT|WES|BAP|ANG|ECU|…), source_type (book|commentary|
 │  confession|father|article|website), url, license, trust_tier,
 │  created_at

documents             # an ingested file belonging to a source
 ├─ id, source_id → sources, filename, mime_type, sha256 (dedupe),
 │  status (pending|parsing|chunking|embedding|done|failed),
 │  error, page_count, char_count, created_at, updated_at

chunks                # retrievable unit (context-preserving)
 ├─ id, document_id → documents, source_id (denormalized for fast cite),
 │  ordinal, content (text), token_count,
 │  meta (jsonb: chapter, section, page_start, page_end, heading_path),
 │  embedding vector(1536),
 │  created_at
 └─ INDEX hnsw (embedding vector_cosine_ops)

conversations
 ├─ id, user_id → users, title, is_private (bool),
 │  created_at, updated_at
 │  -- is_private=true rows are NEVER written for messages/logs (see §9)

messages
 ├─ id, conversation_id → conversations, role (user|assistant|system),
 │  content (text), created_at,
 │  citations (jsonb[]), retrieval_meta (jsonb), confidence (jsonb)

ingestion_jobs        # observable embedding/ingestion work
 ├─ id, document_id → documents, kind (parse|embed|reembed),
 │  status, chunks_total, chunks_done, model, started_at, finished_at, error

ai_requests           # one row per non-private question (admin observability)
 ├─ id, user_id, conversation_id, request_id (uuid),
 │  question, provider, model, latency_ms, tokens_prompt, tokens_completion,
 │  retrieval_count, verified (bool), created_at
 │  -- private-mode requests are NOT recorded here

logs                  # structured, searchable event log (see §10)
 ├─ id, ts, level (debug|info|warn|error), event (string),
 │  request_id, user_id, conversation_id, document_id, severity,
 │  data (jsonb)
 └─ INDEXes on (request_id), (conversation_id), (level), (ts)
```

**Citation integrity rule:** a citation rendered to the user must reference a
`chunk.id` that was actually retrieved for that `request_id`. The verifier (§8)
enforces this against `messages.citations` ↔ `logs`/retrieval set.

---

## 5. AI provider abstraction

**Requirement:** changing providers is configuration-only — never an app-code
change. The provider layer exposes chat, embeddings, streaming, structured
output, and tool calling behind one interface.

```ts
// lib/providers/types.ts (shape only — illustrative)
interface ChatModel {
  generate(req: ChatRequest): Promise<ChatResult>;            // non-stream
  stream(req: ChatRequest): AsyncIterable<ChatChunk>;          // streaming
  structured<T>(req: ChatRequest, schema: ZodType<T>): Promise<T>; // typed JSON
  // tool calling expressed via ChatRequest.tools + ChatResult.toolCalls
}
interface EmbeddingModel { embed(texts: string[]): Promise<number[][]>; dims: number; }
interface Reranker { rerank(query: string, docs: Doc[]): Promise<Scored[]>; }
interface AIProvider { chat(model: string): ChatModel; embeddings(model: string): EmbeddingModel;
                       reranker?(model: string): Reranker; name: string; }
```

- `lib/providers/index.ts` reads env (`AI_PROVIDER`, `AI_CHAT_MODEL`,
  `AI_EMBEDDING_MODEL`, `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, …) and returns
  the configured provider, with automatic **fallback** primary→secondary on
  hard failures.
- Both `openrouter.ts` and `openai.ts` use the OpenAI-compatible wire format
  (LangChain `ChatOpenAI`/`OpenAIEmbeddings` pointed at the right `baseURL`),
  so adding MiniMax/Claude/etc. = an OpenRouter model id, nothing more.
- Every provider request/response is logged (model, tokens, latency, retries).

---

## 6. LangGraph reasoning workflow

Not a chatbot — a controlled graph with explicit states. Each node has typed
inputs/outputs and emits trace logs (§10) for the execution viewer.

```
question
  → intent_analysis        # classify: topical? exegetical? comparative?
  → retrieval_planning     # build queries, filters (tradition, source_type)
  → source_retrieval       # pgvector ANN search per planned query
  → reranking              # reorder by relevance; drop low scores
  → evidence_validation    # is evidence sufficient & on-topic? gate
  → answer_generation      # grounded answer + structured citations
  → citation_verification  # §8 — every quote/cite/page exists in evidence
  → response_review        # tone, fairness across traditions, humility check
  → stream_response        # SSE to client
```

**Graph state** (`lib/graph/state.ts`) threads: `requestId`, `userId`,
`isPrivate`, `question`, `intent`, `plannedQueries[]`, `retrieved[]`
(chunk + score), `reranked[]`, `selectedEvidence[]`, `rejectedEvidence[]`,
`draftAnswer`, `citations[]`, `verification`, `confidence`, `messages[]`.

**Conditional edges:**
- `evidence_validation` → if insufficient → emit *"I could not find a reliable
  source"* path (no fabrication) instead of generation.
- `citation_verification` → if any citation/quote/page fails → loop back to
  `answer_generation` (bounded retries) → else fall through to a safer,
  hedged answer. **Accuracy over speed.**

---

## 7. Agent tools (allow-listed)

The model may call **only** these, each with typed I/O, zod validation, and
detailed logging. No unrestricted execution.

| Tool | Input | Output |
|---|---|---|
| `scripture_lookup` | book, chapter, verse range, translation | passage text + ref |
| `retrieval_search` | query, filters (tradition, source_type, year) | chunks + scores |
| `citation_lookup` | chunk_id | source/author/work/page metadata |
| `metadata_lookup` | source_id / document_id | full source metadata |
| `conversation_history` | conversation_id | prior messages (non-private) |
| `user_preferences` | user_id | preferred traditions, translation, etc. |
| `search_filters` | natural-language constraints | structured filter object |

---

## 8. Hallucination prevention & verification pipeline

Hallucinations are **critical failures**. Rules enforced in code, not just prompt:

- Never cite a source that was not retrieved for this request.
- Never quote text not present in retrieved chunks (verbatim substring / fuzzy
  match within tolerance against `chunk.content`).
- Never fabricate page numbers — a rendered page must exist in `chunk.meta`.
- Never claim certainty when evidence is mixed → emit a "Different Views" block.
- Prefer **"I do not know / additional sources needed"** over invention.

**Verifier** (`lib/verification/`) runs as the `citation_verification` node:
1. Parse the draft's structured citations + quoted spans.
2. For each quote → confirm it exists in the selected evidence (normalized match).
3. For each citation → confirm `chunk_id`/`source_id` ∈ retrieved set; confirm
   author/work/page agree with `sources`/`chunks.meta`.
4. Flag any claim with no supporting evidence span.
5. **Fail → regenerate** (bounded) **or return safer hedged answer.** Pass →
   ship. Result is logged and surfaced in the admin retrieval/graph viewers.

---

## 9. Private mode

- Toggle in the composer. A private conversation **never** persists messages,
  `ai_requests`, or `logs` tied to its content.
- `is_private` conversations store only the minimal shell (or nothing
  recoverable); after completion the session is **not** recoverable or
  debuggable. Admin session/request/retrieval viewers exclude private sessions
  by construction (they are never written).

---

## 10. Logging, tracing & observability

> Objective: *no unexpected behavior occurs without a trace explaining why.*

- One structured logger writes to **console** (dev) and the **`logs` table**
  (always, except private mode), with levels `debug|info|warn|error`,
  configurable in production.
- Every important event logs with a correlating `request_id`:
  retrieval decisions, rerank scores, tool execution, prompt construction,
  embedding generation, DB writes, graph transitions, validation failures,
  citation verification, response generation, provider req/resp, token usage,
  latency, errors, retries.
- Logs filterable by user / conversation / request / document / timestamp /
  severity (indexed columns + jsonb `data`).

### Admin / debug dashboards (`/admin/*`, role-gated)
- **AI Requests** — every non-private question: ts, user, latency, provider,
  tokens, retrieval count.
- **Embedding dashboard** — jobs (completed/failed), document/chunk counts,
  embedding model, vector stats, ingestion status.
- **Retrieval inspector** — retrieved chunks, similarity scores, reranked
  order, selected vs rejected evidence.
- **Agent execution viewer** — LangGraph state, executed/skipped nodes, timing,
  tool calls, validation results (a full debugging interface).
- **Session viewer** — conversations/messages/citations/retrieval/graph
  execution. **Excludes private mode.**

---

## 11. Ingestion pipeline

Formats now: **PDF, EPUB, Markdown, HTML, plain text** (LangChain loaders).
Future: websites, sermons, journal articles.

`parse → clean → chunk → embed → store → index`

- **Chunking preserves theological context** — split on semantic/heading
  boundaries (chapter/section aware), target a token window with overlap, never
  arbitrary paragraph cuts. Carry structural metadata into each chunk.
- **Per-chunk metadata:** source title, author, publication, chapter, section,
  page number (when available), denomination/tradition, publication year.
- `sha256` dedupe; status tracked in `documents` + `ingestion_jobs`; failures
  surfaced in the admin embedding dashboard with reprocess action.
- Seeded initially from `protestant-theology-knowledge-base.md` (30 curated
  sources, tradition-tagged) via `scripts/seed-sources.ts`.

---

## 12. Retrieval

- Embed query → pgvector ANN (cosine, HNSW) with metadata filters
  (tradition, source_type, year, source allow-list).
- **Rerank** the candidate set; **drop low scores**; pass only the best
  evidence to the LLM. Quality over quantity — avoid bloated context windows.
- Selected and rejected evidence are both logged for the retrieval inspector.

---

## 13. AI response format (rendered in chat)

Each assistant answer renders structured sections:
- **Answer** — clear natural-language explanation.
- **Biblical References** — relevant Scripture (via `scripture_lookup`).
- **Supporting Sources** — verbatim quoted material from retrieved chunks.
- **Citations** — author · work · chapter/page when available, linking to the
  source in the library when a URL exists.
- **Different Views** — when traditions disagree, present each fairly (humility,
  no false consensus).
- **Confidence** — surfaced when appropriate, derived from evidence strength +
  verifier result.

---

## 14. Auth & security

- **Clerk** via `ClerkProvider` (root) + middleware protecting `(app)` and
  `/api/*`. Reuse the existing ChatGPT-style auth layout (centered card, top
  image, left-aligned copy, compact box).
- Admin routes gated by `users.role = 'admin'` (server-checked, not just UI).
- All API routes: server-side **zod** validation, authenticated access, rate
  limiting on `/api/chat` and `/api/ingest`, secrets via **env vars only**.
- No secret material in client bundles; provider keys server-only.

---

## 15. Testing strategy (TDD-first)

Write failing tests → implement → pass → refactor. No feature complete without
tests. **Vitest** (unit/integration) + **Playwright** (e2e).

Critical systems requiring comprehensive tests: retrieval, embeddings,
reranking, prompt generation, graph execution, verification, DB operations,
API routes.

- **Unit:** chunker boundaries, provider adapters (mocked wire), verifier
  match logic, zod schemas, query builders.
- **Integration:** ephemeral Postgres (pgvector) — ingestion end-to-end,
  retrieval ranking, graph run with mocked provider, private-mode non-persistence.
- **E2e:** sign-in → ask → streamed answer with citations → inspect sources;
  admin dashboards render real logged data.
- **Verification regression suite:** known-good Q→evidence fixtures asserting
  the verifier rejects fabricated quotes/pages/citations.

---

## 16. Environment variables

```
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database (Railway)
DATABASE_URL=postgres://…

# AI providers (config-only swap)
AI_PROVIDER=openrouter          # openrouter | openai
AI_CHAT_MODEL=…                 # e.g. an OpenRouter model id
AI_EMBEDDING_MODEL=text-embedding-3-small
AI_RERANK_MODEL=…               # optional
OPENROUTER_API_KEY=
OPENAI_API_KEY=                 # secondary + embeddings

# Ops
LOG_LEVEL=info                  # debug|info|warn|error
RATE_LIMIT_CHAT_PER_MIN=…
```

---

## 17. Multi-agent development workflow

Implementation is parallelized across specialized subagents with clear scopes,
then integrated and reviewed:

- **Architecture** — system design, dependency management, schema.
- **Frontend** — auth UI, dashboard rebrand, chat interface, admin views.
- **Backend** — API routes, Clerk integration, DB queries.
- **RAG** — ingestion, embeddings, retrieval, reranking.
- **AI** — LangGraph, prompts, reasoning, verification.
- **Testing** — unit/integration/regression suites.
- **Infrastructure** — Railway deploy, Docker, Postgres, env config.

### Mega review gate (every feature, no single-pass acceptance)
1. Static analysis → 2. Type check → 3. Lint → 4. Unit tests →
5. Integration tests → 6. E2e tests → 7. Performance → 8. Security →
9. Citation verification → 10. Architecture review. **All must pass.**

---

## 18. Phased roadmap

| Phase | Deliverables |
|---|---|
| **1 — Foundation** | Clerk auth + ChatGPT-style login; Drizzle schema + pgvector migration; dashboard rebrand → Torch nav; chat UI shell; provider abstraction skeleton; structured logging skeleton; Vitest/Playwright setup. |
| **2 — RAG core** | Ingestion pipeline (PDF/EPUB/MD/HTML/TXT); OpenAI embeddings; pgvector retrieval + rerank; seed from knowledge base. |
| **3 — Grounded answers** | LangGraph graph; agent tools; citation/quote/page **verifier**; structured response format (Answer/References/Sources/Citations/Views/Confidence); source inspection UI. |
| **4 — Observability & UX** | Conversation history; private mode; admin dashboards (requests/embeddings/retrieval/graph/sessions); settings; DB logging end-to-end. |
| **5 — Hardening** | TDD coverage push; perf (streaming, vector query tuning); security/rate-limit; Cloudflare deployment path (Workers + Hyperdrive) revisited. |

---

## 19. Open questions for product sign-off

1. **Reranker**: hosted rerank model via provider layer (default) vs a
   self-hosted cross-encoder container later?
2. **Scripture source**: which Bible API/translations are licensed for
   `scripture_lookup` (ESV API, public-domain KJV/WEB, etc.)?
3. **Admin bootstrapping**: how is the first `admin` user designated (env
   allow-list of Clerk emails vs manual DB flag)?
4. **Default visible traditions**: ship neutral across REF/LUT/WES/BAP/ANG/ECU,
   or let users pick a default lens in settings?
5. **Embedding dims**: `text-embedding-3-small` (1536, cheaper) vs `-large`
   (3072, higher quality) as the default?
```
