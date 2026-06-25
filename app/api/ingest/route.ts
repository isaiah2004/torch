/**
 * POST /api/ingest — admin-gated document upload.
 *
 * Accepts a multipart form (`file` + `sourceId`), runs the ingestion pipeline
 * (parse → clean → chunk → embed → store), and returns the resulting document
 * id and chunk count. See ARCHITECTURE.md §11/§14.
 */
import { randomUUID } from "node:crypto"

import { ForbiddenError, requireAdmin, UnauthorizedError } from "@/lib/auth"
import { logger } from "@/lib/logging"
import { ingestDocument } from "@/lib/ingestion/pipeline"
import { ingestRequestSchema } from "@/lib/validation/ingest"

export const runtime = "nodejs"
// Parsing/embedding a document can take a while; don't cut it short.
export const maxDuration = 300

export async function POST(req: Request) {
  let userId: string
  try {
    userId = await requireAdmin()
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    if (err instanceof ForbiddenError)
      return Response.json({ error: "Forbidden" }, { status: 403 })
    throw err
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 })
  }

  const file = form.get("file")
  const parsed = ingestRequestSchema.safeParse({
    sourceId: form.get("sourceId"),
    filename: file instanceof File ? file.name : undefined,
  })
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 })
  }
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const requestId = randomUUID()
  const log = logger.child({ requestId, userId })
  const data = new Uint8Array(await file.arrayBuffer())
  log.info("ingest.request.received", {
    data: { filename: file.name, bytes: data.byteLength, sourceId: parsed.data.sourceId },
  })

  try {
    const result = await ingestDocument(
      {
        sourceId: parsed.data.sourceId,
        filename: file.name,
        mimeType: file.type || undefined,
        data,
      },
      { requestId },
    )
    return Response.json(result, { status: result.deduped ? 200 : 201 })
  } catch (err) {
    const message = (err as Error).message
    log.error("ingest.request.failed", { data: { error: message } })
    return Response.json({ error: "Ingestion failed", message }, { status: 500 })
  }
}
