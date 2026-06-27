/**
 * Lightweight intent analysis (a precursor to the Phase-3 graph's intent node).
 * In one cheap LLM call it (a) rewrites a follow-up into a standalone question
 * for retrieval, and (b) classifies the question into a {@link QuestionType} so
 * the right answer playbook can be applied. Falls back safely on any error.
 */
import { z } from "zod"

import { getProvider } from "@/lib/providers"
import type { HistoryTurn } from "./grounded"
import { QUESTION_TYPES, TYPE_DESCRIPTIONS, type QuestionType } from "./playbooks"

export interface QuestionAnalysis {
  standaloneQuestion: string
  type: QuestionType
}

const SCHEMA = z.object({
  standaloneQuestion: z.string(),
  type: z.enum(QUESTION_TYPES as [QuestionType, ...QuestionType[]]),
})

function systemPrompt(): string {
  const taxonomy = QUESTION_TYPES.map((t) => `- ${t}: ${TYPE_DESCRIPTIONS[t]}`).join("\n")
  return (
    "You analyze a user's question for a Bible/theology assistant. Return JSON " +
    'with two fields:\n' +
    '1. "standaloneQuestion": rewrite the latest message into a single self-contained ' +
    "question, resolving pronouns/references from the conversation, keeping the topic. " +
    "If it is already standalone, return it as-is.\n" +
    '2. "type": the single best-fitting category from:\n' +
    taxonomy +
    '\nReturn ONLY the JSON object.'
  )
}

export async function analyzeQuestion(
  question: string,
  history: HistoryTurn[] = [],
  requestId?: string,
): Promise<QuestionAnalysis> {
  try {
    const convo = history
      .slice(-6)
      .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
      .join("\n")
    const userContent =
      (convo ? `Conversation:\n${convo}\n\n` : "") + `Latest message: ${question}`

    const result = await getProvider()
      .chat()
      .structured(
        {
          messages: [
            { role: "system", content: systemPrompt() },
            { role: "user", content: userContent },
          ],
          temperature: 0,
          requestId,
        },
        SCHEMA,
      )
    const standalone = result.standaloneQuestion?.trim()
    return {
      standaloneQuestion: standalone && standalone.length > 0 ? standalone : question,
      type: result.type,
    }
  } catch {
    return { standaloneQuestion: question, type: "general" }
  }
}
