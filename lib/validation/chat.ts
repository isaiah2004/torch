/**
 * Shared zod schemas for chat API request/response validation.
 * Used for server-side validation of all /api/chat traffic.
 */
import { z } from "zod"

export const askRequestSchema = z.object({
  question: z.string().min(1, "Question is required").max(4000),
  conversationId: z.string().uuid().optional(),
  /** Recent conversation turns (most recent last) for context-aware answers. */
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(20)
    .optional()
    .default([]),
  /** Private mode: nothing about this turn is persisted. */
  isPrivate: z.boolean().default(false),
  /** Optional retrieval filters surfaced from the UI. */
  filters: z
    .object({
      traditions: z.array(z.string()).optional(),
      sourceTypes: z.array(z.string()).optional(),
      yearFrom: z.number().int().optional(),
      yearTo: z.number().int().optional(),
    })
    .optional(),
})

export type AskRequest = z.infer<typeof askRequestSchema>

export const citationSchema = z.object({
  chunkId: z.string(),
  sourceId: z.string(),
  author: z.string().optional(),
  work: z.string().optional(),
  page: z.number().optional(),
  quote: z.string().optional(),
  url: z.string().optional(),
})

export type Citation = z.infer<typeof citationSchema>
