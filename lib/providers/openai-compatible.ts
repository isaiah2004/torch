/**
 * A single adapter that speaks the OpenAI-compatible wire format, used for both
 * OpenRouter and OpenAI (and, by extension, any model they expose — MiniMax,
 * Claude, Llama, etc.). Concrete providers are just this adapter with a
 * different baseURL / key / default model.
 */
import OpenAI from "openai"
import type { ZodType } from "zod"

import { logger } from "@/lib/logging"
import type {
  ChatChunk,
  ChatModel,
  ChatRequest,
  ChatResult,
  EmbeddingModel,
  ToolCall,
} from "./types"

export interface AdapterConfig {
  providerName: string
  apiKey: string
  baseURL?: string
  defaultHeaders?: Record<string, string>
  defaultChatModel: string
  defaultEmbeddingModel: string
  embeddingDimensions: number
}

export class OpenAICompatibleChatModel implements ChatModel {
  constructor(
    private readonly client: OpenAI,
    private readonly cfg: AdapterConfig,
    private readonly model: string,
  ) {}

  private toTools(req: ChatRequest) {
    if (!req.tools?.length) return undefined
    return req.tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }))
  }

  async generate(req: ChatRequest): Promise<ChatResult> {
    const started = performance.now()
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: req.messages as never,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      tools: this.toTools(req),
      stream: false,
    })
    const choice = res.choices[0]
    const toolCalls: ToolCall[] = (choice.message.tool_calls ?? [])
      .filter((c) => c.type === "function")
      .map((c) => {
        const fn = c as {
          id: string
          function: { name: string; arguments: string }
        }
        return {
          id: fn.id,
          name: fn.function.name,
          arguments: fn.function.arguments,
        }
      })
    const result: ChatResult = {
      content: choice.message.content ?? "",
      toolCalls,
      model: res.model,
      finishReason: choice.finish_reason ?? undefined,
      usage: res.usage
        ? {
            prompt: res.usage.prompt_tokens,
            completion: res.usage.completion_tokens,
            total: res.usage.total_tokens,
          }
        : undefined,
    }
    logger.info("provider.chat.generate", {
      requestId: req.requestId,
      data: {
        provider: this.cfg.providerName,
        model: res.model,
        latencyMs: Math.round(performance.now() - started),
        usage: result.usage,
        finishReason: result.finishReason,
      },
    })
    return result
  }

  async *stream(req: ChatRequest): AsyncIterable<ChatChunk> {
    const started = performance.now()
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: req.messages as never,
      temperature: req.temperature,
      max_tokens: req.maxTokens,
      tools: this.toTools(req),
      stream: true,
      stream_options: { include_usage: true },
    })
    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content ?? ""
      const usage = part.usage
        ? {
            prompt: part.usage.prompt_tokens,
            completion: part.usage.completion_tokens,
            total: part.usage.total_tokens,
          }
        : undefined
      if (delta) yield { delta, done: false }
      if (usage) yield { delta: "", done: false, usage }
    }
    yield { delta: "", done: true }
    logger.info("provider.chat.stream", {
      requestId: req.requestId,
      data: {
        provider: this.cfg.providerName,
        model: this.model,
        latencyMs: Math.round(performance.now() - started),
      },
    })
  }

  async structured<T>(req: ChatRequest, schema: ZodType<T>): Promise<T> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: req.messages as never,
      temperature: req.temperature ?? 0,
      tools: this.toTools(req),
      response_format: { type: "json_object" },
    })
    const raw = res.choices[0]?.message?.content ?? "{}"
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error(
        `Provider returned non-JSON for structured output: ${raw.slice(0, 200)}`,
      )
    }
    return schema.parse(parsed)
  }
}

export class OpenAICompatibleEmbeddingModel implements EmbeddingModel {
  constructor(
    private readonly client: OpenAI,
    private readonly cfg: AdapterConfig,
    public readonly model: string,
    public readonly dimensions: number,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const started = performance.now()
    const res = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    })
    logger.info("provider.embeddings.embed", {
      data: {
        provider: this.cfg.providerName,
        model: this.model,
        count: texts.length,
        latencyMs: Math.round(performance.now() - started),
        usage: res.usage,
      },
    })
    return res.data.map((d) => d.embedding as number[])
  }
}
