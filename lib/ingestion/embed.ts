/**
 * Batch embedding for ingestion. Goes through the provider layer
 * (`getEmbeddingModel`) so swapping the embedding model is config-only, and
 * asserts every returned vector matches the model's declared dimensionality —
 * a wrong-width vector would silently break the pgvector column / ANN index.
 */
import { logger } from "@/lib/logging"
import { getEmbeddingModel } from "@/lib/providers"
import type { EmbeddingModel } from "@/lib/providers/types"

export interface EmbedOptions {
  /** Inject a model (tests) or override the default; defaults to the configured one. */
  model?: EmbeddingModel
  /** Texts per provider request. Default 96. */
  batchSize?: number
  /** Correlates embedding logs with an ingestion job / request. */
  requestId?: string
}

export async function embedTexts(
  texts: string[],
  options: EmbedOptions = {},
): Promise<number[][]> {
  if (texts.length === 0) return []
  const model = options.model ?? getEmbeddingModel()
  const batchSize = Math.max(1, options.batchSize ?? 96)
  const out: number[][] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const vectors = await model.embed(batch)
    if (vectors.length !== batch.length) {
      throw new Error(
        `Embedding count mismatch: requested ${batch.length}, received ${vectors.length}.`,
      )
    }
    for (const v of vectors) {
      if (v.length !== model.dimensions) {
        throw new Error(
          `Embedding dimension mismatch: got ${v.length}, expected ${model.dimensions} ` +
            `(model ${model.model}). Check AI_EMBEDDING_MODEL / AI_EMBEDDING_DIMENSIONS.`,
        )
      }
    }
    out.push(...vectors)
    logger.debug("ingestion.embed.batch", {
      requestId: options.requestId,
      data: { from: i, count: batch.length, dims: model.dimensions },
    })
  }

  return out
}
