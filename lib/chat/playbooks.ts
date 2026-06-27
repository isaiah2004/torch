/**
 * Answer playbooks by question type.
 *
 * People bring very different kinds of questions — doctrine, hard objections,
 * and deeply personal/spiritual ones ("how do I find a wife?", "how do I
 * overcome sin?", "how do I grieve?", "do babies go to heaven?"). A single
 * generic format serves none of them well. Each question is classified into a
 * {@link QuestionType}, and the matching playbook tells the model HOW to
 * structure that specific kind of answer. Playbooks layer on top of the base
 * rules in TORCH_SYSTEM_PROMPT (grounding, no-fabrication, premise-correction).
 */

export type QuestionType =
  | "doctrinal"
  | "exegetical"
  | "apologetic"
  | "comparative"
  | "pastoral"
  | "consolation"
  | "speculative"
  | "scripture"
  | "general"

export const QUESTION_TYPES: QuestionType[] = [
  "doctrinal",
  "exegetical",
  "apologetic",
  "comparative",
  "pastoral",
  "consolation",
  "speculative",
  "scripture",
  "general",
]

/** One-line descriptions used by the classifier to choose a type. */
export const TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  doctrinal: "asks what Christianity teaches about a doctrine (Trinity, salvation, grace, the church)",
  exegetical: "asks what a specific Bible passage or verse means",
  apologetic: "an objection, doubt, or hard/loaded question, often with a false premise ('why does God hate…', 'isn't the Bible cruel/sexist')",
  comparative: "asks how different traditions or views differ on a contested topic",
  pastoral: "personal/practical life guidance ('how do I find a spouse?', 'how do I overcome sin?', 'how do I make this decision?')",
  consolation: "grief, suffering, fear, loneliness, despair — needs comfort ('my loved one died', 'I'm anxious')",
  speculative: "asks about something Scripture does not fully settle ('do babies go to heaven?', 'what is heaven like?', end-times details)",
  scripture: "asks for a specific passage or what a reference says",
  general: "anything else, or a mix",
}

const PLAYBOOKS: Record<QuestionType, string> = {
  doctrinal: `ANSWER SHAPE (doctrinal):
- State the doctrine clearly and simply in 1–2 sentences first.
- Anchor it in the key Scriptures (quote/cite the load-bearing ones).
- Note the historic Christian consensus, and name where traditions differ.
- Close with why it matters for the believer's faith and life.`,

  exegetical: `ANSWER SHAPE (passage meaning):
- Give the passage's context first: who wrote it, to whom, and the flow of thought.
- Explain what it means in that context, plainly.
- If the text is genuinely contested, lay out the main faithful readings.
- Do NOT import meaning the text doesn't support; stay anchored to the words.`,

  apologetic: `ANSWER SHAPE (objection / hard question):
- FIRST address the premise directly and graciously. If it's false or loaded
  (e.g. "why does God hate…"), correct it plainly before anything else.
- Acknowledge the real difficulty honestly — don't dodge or proof-text.
- Give the historical/canonical context that reframes the issue.
- Distinguish what the text actually says from how it is debated, and where
  faithful Christians land differently. Aim to help an honest doubter.`,

  comparative: `ANSWER SHAPE (comparing views):
- Name the positions and which traditions hold them.
- Present each view fairly, with its best biblical case — steelman, don't strawman.
- Note what the views share.
- Unless Scripture clearly settles it, let the reader weigh it; don't crown a winner.`,

  pastoral: `ANSWER SHAPE (personal / practical guidance):
- Start by acknowledging the real desire or struggle with warmth.
- Give the biblical PRINCIPLES that bear on it (e.g. for a spouse: godly
  character over appearance, shared faith / "equally yoked", wisdom, prayer,
  counsel of mature believers; for overcoming sin: it is by grace and the Spirit
  through the ordinary means — Scripture, prayer, confession, community,
  accountability — not willpower alone).
- Then give concrete, doable next steps that flow from those principles.
- Point to Christ and dependence on God; encourage church community, prayer, and
  patience. Offer wisdom, not a guaranteed formula — God leads each person.`,

  consolation: `ANSWER SHAPE (grief / suffering / fear):
- Lead with compassion and presence. Validate the pain; lament is biblical
  (the Psalms, Jesus weeping). Do NOT rush to tidy answers or platitudes.
- Offer the Christian hope gently: God is near to the brokenhearted, the
  resurrection and life beyond death, Christ who conquered the grave.
- Give a few things to hold onto — Scriptures to sit with, prayer, the comfort
  of God's people. Keep it tender and unhurried, not a lecture.`,

  speculative: `ANSWER SHAPE (where Scripture is not explicit):
- Be honest up front that Scripture does not give a complete/direct answer.
- Share what Scripture DOES indicate, and the main faithful views (e.g. for
  infants who die: God's revealed character and mercy, David's words in
  2 Samuel 12:23, "age of accountability" and covenant perspectives).
- Land on humble, pastoral reassurance grounded in God's justice and mercy.
  Do NOT overclaim certainty the Bible doesn't give.`,

  scripture: `ANSWER SHAPE (scripture lookup):
- Provide the passage itself (quote it), then a brief plain-sense explanation
  and its immediate context. Keep it concise.`,

  general: `ANSWER SHAPE (general):
- Answer the question directly and helpfully, grounded in Scripture and the
  sources, with a clear lead sentence and honest treatment of any difficulty.`,
}

export function playbookFor(type: QuestionType): string {
  return PLAYBOOKS[type] ?? PLAYBOOKS.general
}
