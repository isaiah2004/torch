/** Zod schema for the admin document-ingestion endpoint. */
import { z } from "zod"

export const ingestRequestSchema = z.object({
  /** The source (work/publication) this document belongs to. */
  sourceId: z.string().uuid("sourceId must be a source UUID"),
  filename: z.string().min(1).optional(),
})

export type IngestRequest = z.infer<typeof ingestRequestSchema>
