/**
 * Torch database schema (PostgreSQL + pgvector).
 *
 * One instance holds everything: app data, document chunks + embeddings, and
 * structured logs. See ARCHITECTURE.md §4. Embedding dimension is 1536
 * (OpenAI text-embedding-3-small); change here + re-embed to switch models.
 */
import { sql } from "drizzle-orm"
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  vector,
  boolean,
} from "drizzle-orm/pg-core"

export const EMBEDDING_DIMENSIONS = 1536

// ── Enums ───────────────────────────────────────────────────────────────────
export const userRole = pgEnum("user_role", ["user", "admin"])
export const documentStatus = pgEnum("document_status", [
  "pending",
  "parsing",
  "chunking",
  "embedding",
  "done",
  "failed",
])
export const messageRole = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
])
export const ingestionKind = pgEnum("ingestion_kind", [
  "parse",
  "embed",
  "reembed",
])
export const logLevel = pgEnum("log_level", ["debug", "info", "warn", "error"])

// ── Users (mirror of Clerk identity) ─────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: varchar("clerk_user_id", { length: 191 }).notNull(),
    email: varchar("email", { length: 320 }),
    displayName: varchar("display_name", { length: 191 }),
    role: userRole("role").notNull().default("user"),
    preferences: jsonb("preferences").$type<UserPreferences>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_clerk_user_id_idx").on(t.clerkUserId)],
)

// ── Sources (a work / publication — the citation root) ───────────────────────
export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  publication: text("publication"),
  publisher: text("publisher"),
  year: integer("year"),
  /** REF | LUT | WES | BAP | ANG | ECU | … */
  tradition: varchar("tradition", { length: 32 }),
  /** book | commentary | confession | father | article | website */
  sourceType: varchar("source_type", { length: 32 }),
  url: text("url"),
  license: text("license"),
  trustTier: integer("trust_tier").default(2),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ── Documents (an ingested file belonging to a source) ───────────────────────
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    mimeType: varchar("mime_type", { length: 128 }),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    status: documentStatus("status").notNull().default("pending"),
    error: text("error"),
    pageCount: integer("page_count"),
    charCount: integer("char_count"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("documents_sha256_idx").on(t.sha256)],
)

// ── Chunks (retrievable unit; context-preserving) ────────────────────────────
export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    /** Denormalized for fast citation rendering without a join. */
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),
    meta: jsonb("meta").$type<ChunkMeta>().default({}),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("chunks_document_id_idx").on(t.documentId),
    // HNSW ANN index for cosine similarity search.
    index("chunks_embedding_hnsw_idx").using(
      "hnsw",
      t.embedding.op("vector_cosine_ops"),
    ),
  ],
)

// ── Conversations & messages ─────────────────────────────────────────────────
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  /** Private conversations never persist messages, ai_requests, or logs. */
  isPrivate: boolean("is_private").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    citations: jsonb("citations").$type<Citation[]>().default([]),
    retrievalMeta: jsonb("retrieval_meta").$type<RetrievalMeta>(),
    confidence: jsonb("confidence").$type<Confidence>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("messages_conversation_id_idx").on(t.conversationId)],
)

// ── Ingestion jobs (observable embedding work) ───────────────────────────────
export const ingestionJobs = pgTable("ingestion_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  kind: ingestionKind("kind").notNull(),
  status: documentStatus("status").notNull().default("pending"),
  chunksTotal: integer("chunks_total").default(0),
  chunksDone: integer("chunks_done").default(0),
  model: varchar("model", { length: 128 }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  error: text("error"),
})

// ── AI requests (one row per non-private question) ───────────────────────────
export const aiRequests = pgTable(
  "ai_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "set null",
    }),
    requestId: uuid("request_id").notNull(),
    question: text("question").notNull(),
    provider: varchar("provider", { length: 64 }),
    model: varchar("model", { length: 128 }),
    latencyMs: integer("latency_ms"),
    tokensPrompt: integer("tokens_prompt"),
    tokensCompletion: integer("tokens_completion"),
    retrievalCount: integer("retrieval_count"),
    verified: boolean("verified").default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("ai_requests_request_id_idx").on(t.requestId),
    index("ai_requests_created_at_idx").on(t.createdAt),
  ],
)

// ── Structured logs (searchable event log) ───────────────────────────────────
export const logs = pgTable(
  "logs",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    ts: timestamp("ts", { withTimezone: true }).notNull().defaultNow(),
    level: logLevel("level").notNull().default("info"),
    event: varchar("event", { length: 128 }).notNull(),
    requestId: uuid("request_id"),
    userId: uuid("user_id"),
    conversationId: uuid("conversation_id"),
    documentId: uuid("document_id"),
    severity: integer("severity").default(0),
    data: jsonb("data").$type<Record<string, unknown>>().default({}),
  },
  (t) => [
    index("logs_request_id_idx").on(t.requestId),
    index("logs_conversation_id_idx").on(t.conversationId),
    index("logs_level_idx").on(t.level),
    index("logs_ts_idx").on(t.ts),
  ],
)

// ── Scripture (backs the scripture_lookup tool) ──────────────────────────────
// Translation-agnostic. Public-domain translations (KJV/ASV/WEB/YLT/Geneva) are
// redistributable; copyrighted ones (NIV/NKJV) are quote-only — `canRedistribute`
// records that distinction so the app never serves text it isn't licensed to.
export const bibleTranslations = pgTable("bible_translations", {
  id: uuid("id").defaultRandom().primaryKey(),
  /** Short code, e.g. KJV, ASV, WEB, YLT, GEN, NIV, NKJV. */
  code: varchar("code", { length: 16 }).notNull(),
  name: text("name").notNull(),
  language: varchar("language", { length: 8 }).notNull().default("en"),
  license: text("license"),
  copyright: text("copyright"),
  /** Source of the text, e.g. "scrollmapper/bible_databases" or "api.bible". */
  provider: varchar("provider", { length: 64 }),
  /** False for copyrighted translations we may quote but not serve wholesale. */
  canRedistribute: boolean("can_redistribute").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (t) => [uniqueIndex("bible_translations_code_idx").on(t.code)])

export const bibleVerses = pgTable(
  "bible_verses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Translation code (FK by value to bible_translations.code). */
    translation: varchar("translation", { length: 16 }).notNull(),
    /** Canonical book name, e.g. "Genesis", "1 Corinthians". */
    book: varchar("book", { length: 32 }).notNull(),
    /** Canonical 1..66 ordering for range queries / sorting. */
    bookNumber: integer("book_number").notNull(),
    chapter: integer("chapter").notNull(),
    verse: integer("verse").notNull(),
    text: text("text").notNull(),
  },
  (t) => [
    uniqueIndex("bible_verses_ref_idx").on(
      t.translation,
      t.book,
      t.chapter,
      t.verse,
    ),
    index("bible_verses_order_idx").on(
      t.translation,
      t.bookNumber,
      t.chapter,
      t.verse,
    ),
  ],
)

// ── JSONB payload types ──────────────────────────────────────────────────────
export interface UserPreferences {
  preferredTraditions?: string[]
  defaultTranslation?: string
}

export interface ChunkMeta {
  chapter?: string
  section?: string
  pageStart?: number
  pageEnd?: number
  headingPath?: string[]
  /** Scripture chunks only: structured verse range for precise citation. */
  book?: string
  chapterNumber?: number
  verseStart?: number
  verseEnd?: number
}

export interface Citation {
  chunkId: string
  sourceId: string
  author?: string
  work?: string
  page?: number
  quote?: string
  url?: string
}

export interface RetrievalMeta {
  query: string
  retrievedChunkIds: string[]
  scores: number[]
}

export interface Confidence {
  level: "high" | "medium" | "low"
  reason?: string
}

/** Convenience: raw SQL to enable pgvector (used by the migration prelude). */
export const enablePgVector = sql`CREATE EXTENSION IF NOT EXISTS vector;`
