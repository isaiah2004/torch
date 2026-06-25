/**
 * Provider factory.
 *
 * Reads configuration from the environment and returns the active provider.
 * Swapping OpenRouter ↔ OpenAI (or any model they expose) is done entirely
 * through env vars — no call site changes. See ARCHITECTURE.md §5.
 */
import OpenAI from "openai"

import { serverEnv } from "@/lib/env"
import { CohereReranker } from "./cohere-rerank"
import { LlmReranker } from "./llm-rerank"
import {
  OpenAICompatibleChatModel,
  OpenAICompatibleEmbeddingModel,
  type AdapterConfig,
} from "./openai-compatible"
import type { AIProvider, ChatModel, EmbeddingModel, Reranker } from "./types"

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

function buildConfig(name: "openrouter" | "openai"): AdapterConfig {
  if (name === "openrouter") {
    const apiKey = serverEnv.OPENROUTER_API_KEY
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set.")
    return {
      providerName: "openrouter",
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      defaultHeaders: {
        "HTTP-Referer": "https://torch.app",
        "X-Title": "Torch",
      },
      defaultChatModel: serverEnv.AI_CHAT_MODEL,
      defaultEmbeddingModel: serverEnv.AI_EMBEDDING_MODEL,
      embeddingDimensions: serverEnv.AI_EMBEDDING_DIMENSIONS,
    }
  }
  const apiKey = serverEnv.OPENAI_API_KEY
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.")
  return {
    providerName: "openai",
    apiKey,
    defaultChatModel: serverEnv.AI_CHAT_MODEL,
    defaultEmbeddingModel: serverEnv.AI_EMBEDDING_MODEL,
    embeddingDimensions: serverEnv.AI_EMBEDDING_DIMENSIONS,
  }
}

function makeProvider(name: "openrouter" | "openai"): AIProvider {
  const cfg = buildConfig(name)
  const client = new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
    defaultHeaders: cfg.defaultHeaders,
  })
  return {
    name,
    chat(model?: string): ChatModel {
      return new OpenAICompatibleChatModel(
        client,
        cfg,
        model ?? cfg.defaultChatModel,
      )
    },
    embeddings(model?: string): EmbeddingModel {
      return new OpenAICompatibleEmbeddingModel(
        client,
        cfg,
        model ?? cfg.defaultEmbeddingModel,
        cfg.embeddingDimensions,
      )
    },
  }
}

let cached: AIProvider | null = null

/** The active provider, selected by `AI_PROVIDER`. */
export function getProvider(): AIProvider {
  if (cached && cached.name === serverEnv.AI_PROVIDER) return cached
  cached = makeProvider(serverEnv.AI_PROVIDER)
  return cached
}

/**
 * Embeddings always come from OpenAI's `text-embedding-3-*` family. If the
 * active chat provider is OpenRouter (which does not serve embeddings), fall
 * back to a direct OpenAI provider for the embedding model.
 */
export function getEmbeddingModel(model?: string): EmbeddingModel {
  const provider = getProvider()
  if (provider.name === "openai") return provider.embeddings(model)
  return makeProvider("openai").embeddings(model)
}

/**
 * The active reranker, or `undefined` when none is configured (retrieval then
 * falls back to vector-similarity order). Selection follows AI_RERANK_STRATEGY:
 *   cohere → Cohere rerank API (needs COHERE_API_KEY)
 *   llm    → score with a chat model (works through OpenRouter; no extra key)
 *   none   → no reranker (vector-score order)
 *   auto   → Cohere if COHERE_API_KEY, else LLM rerank
 */
export function getReranker(): Reranker | undefined {
  const strategy = serverEnv.AI_RERANK_STRATEGY
  const hasCohere = Boolean(serverEnv.COHERE_API_KEY)

  const useCohere = strategy === "cohere" || (strategy === "auto" && hasCohere)
  const useLlm = strategy === "llm" || (strategy === "auto" && !hasCohere)

  if (useCohere) {
    if (!serverEnv.COHERE_API_KEY) {
      throw new Error("AI_RERANK_STRATEGY=cohere but COHERE_API_KEY is not set.")
    }
    return new CohereReranker(serverEnv.COHERE_API_KEY, serverEnv.AI_RERANK_MODEL)
  }
  if (useLlm) {
    return new LlmReranker(getProvider().chat(serverEnv.AI_RERANK_LLM_MODEL))
  }
  return undefined
}

export type { AIProvider, ChatModel, EmbeddingModel, Reranker } from "./types"
