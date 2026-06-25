/**
 * AI provider abstraction.
 *
 * Changing providers (OpenRouter ↔ OpenAI ↔ …) is configuration-only and must
 * never require application code changes. Every consumer depends on these
 * interfaces, not on a concrete SDK. See ARCHITECTURE.md §5.
 */
import type { ZodType } from "zod"

export type ChatRole = "system" | "user" | "assistant" | "tool"

export interface ChatMessage {
  role: ChatRole
  content: string
  /** Present on assistant messages that requested tool calls. */
  toolCalls?: ToolCall[]
  /** Present on tool result messages. */
  toolCallId?: string
  name?: string
}

export interface ToolDefinition {
  name: string
  description: string
  /** JSON schema for the tool's parameters. */
  parameters: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  /** Raw JSON arguments string as returned by the model. */
  arguments: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  tools?: ToolDefinition[]
  /** Correlates provider logs with a graph run / request. */
  requestId?: string
}

export interface TokenUsage {
  prompt: number
  completion: number
  total: number
}

export interface ChatResult {
  content: string
  toolCalls: ToolCall[]
  usage?: TokenUsage
  model: string
  finishReason?: string
}

export interface ChatChunk {
  /** Incremental text delta. */
  delta: string
  done: boolean
  usage?: TokenUsage
}

export interface ChatModel {
  generate(req: ChatRequest): Promise<ChatResult>
  stream(req: ChatRequest): AsyncIterable<ChatChunk>
  /** Force a typed JSON object validated against `schema`. */
  structured<T>(req: ChatRequest, schema: ZodType<T>): Promise<T>
}

export interface EmbeddingModel {
  embed(texts: string[]): Promise<number[][]>
  readonly dimensions: number
  readonly model: string
}

export interface ScoredDoc {
  index: number
  score: number
}

export interface Reranker {
  rerank(query: string, docs: string[], topN?: number): Promise<ScoredDoc[]>
}

export interface AIProvider {
  readonly name: string
  chat(model?: string): ChatModel
  embeddings(model?: string): EmbeddingModel
  reranker?(model?: string): Reranker
}
