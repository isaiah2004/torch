/**
 * Dev eval harness: run a set of questions through the real Torch answer pipeline
 * (retrieve → rerank → grounded generation — the same code /api/chat uses) and
 * write a Markdown report. Bypasses HTTP/Clerk auth so answers can be evaluated
 * directly. Requires DATABASE_URL + AI keys.
 *
 *   pnpm tsx scripts/eval-questions.ts > /path/report.md
 */
import { config } from "dotenv"

config({ path: ".env.local" })
config()

const QUESTIONS = [
  // Doctrinal hard questions
  "If God is sovereign and good, why does he allow evil and suffering?",
  "Is salvation ultimately based on God's unconditional election or human free will? How do Reformed and Arminian Christians differ?",
  "How can God be one God in three persons? Explain the Trinity from Scripture.",
  // Ethical / skeptic hard questions (the kind people use to challenge the faith)
  "Does Deuteronomy 22:28-29 force a rape victim to marry her rapist? Explain honestly.",
  "Does the Bible endorse slavery? How should Christians understand the slavery passages?",
  "Why does God command the killing of the Canaanites, including women and children? Is that genocide?",
  "Does the Bible treat women as inferior or as property?",
  "Is hell eternal conscious torment, and how can that be just?",
]

async function main() {
  const { retrieveEvidence } = await import("@/lib/retrieval")
  const {
    buildGroundedMessages,
    citationsFromEvidence,
    estimateConfidence,
    NO_EVIDENCE_ANSWER,
  } = await import("@/lib/chat/grounded")
  const { getProvider } = await import("@/lib/providers")
  const { serverEnv } = await import("@/lib/env")

  const provider = getProvider()
  const out: string[] = []
  out.push(`# Torch — theological Q&A eval`)
  out.push("")
  out.push(`Provider: \`${provider.name}\` · chat model: \`${serverEnv.AI_CHAT_MODEL}\` · rerank: \`${serverEnv.AI_RERANK_STRATEGY}\``)
  out.push("")

  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i]
    process.stderr.write(`\n[${i + 1}/${QUESTIONS.length}] ${q}\n`)
    out.push(`\n## Q${i + 1}. ${q}\n`)

    const started = Date.now()
    try {
      const { selected, candidates, reranked } = await retrieveEvidence(q, {
        topK: 24,
        rerank: { topN: 8 },
      })
      process.stderr.write(`  retrieved ${candidates.length}, selected ${selected.length} (reranked=${reranked})\n`)

      if (selected.length === 0) {
        out.push(`**Answer (no evidence):** ${NO_EVIDENCE_ANSWER}\n`)
        out.push(`_Candidates retrieved: ${candidates.length}_\n`)
        continue
      }

      const result = await provider.chat().generate({
        messages: buildGroundedMessages(q, selected),
        temperature: 0.2,
      })
      const citations = citationsFromEvidence(selected)
      const confidence = estimateConfidence(selected)

      out.push(`**Answer:**\n\n${result.content}\n`)
      out.push(`\n**Confidence:** ${confidence.level} — ${confidence.reason}\n`)
      void citations
      out.push(`\n**Evidence used (${selected.length}, reranked=${reranked}):**\n`)
      for (const s of selected) {
        const ref = s.meta.section ?? s.meta.chapter ?? `chunk ${s.ordinal}`
        out.push(`- ${s.source.title} — ${ref} _(score ${s.score.toFixed(2)})_`)
      }
      out.push(`\n_Latency: ${((Date.now() - started) / 1000).toFixed(1)}s · tokens: ${result.usage?.total ?? "?"}_\n`)
    } catch (err) {
      process.stderr.write(`  ERROR: ${(err as Error).message}\n`)
      out.push(`**ERROR:** ${(err as Error).message}\n`)
    }
  }

  process.stdout.write(out.join("\n"))
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("eval-questions failed:", err)
    process.exit(1)
  })
