/**
 * Token counting for chunk sizing. Uses `cl100k_base`, the tokenizer behind the
 * OpenAI `text-embedding-3-*` family, so chunk budgets line up with what the
 * embedding model actually sees. The encoder is created once and reused.
 */
import { getEncoding, type Tiktoken } from "js-tiktoken"

let encoder: Tiktoken | null = null

function enc(): Tiktoken {
  return (encoder ??= getEncoding("cl100k_base"))
}

export function countTokens(text: string): number {
  if (!text) return 0
  return enc().encode(text).length
}

export function encodeTokens(text: string): number[] {
  return enc().encode(text)
}

export function decodeTokens(tokens: number[]): string {
  return enc().decode(tokens)
}
