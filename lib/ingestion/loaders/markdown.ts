/**
 * Markdown loader: keep the raw text (normalized newlines) and record the
 * character offset of every ATX heading (`#`..`######`) so the chunker can
 * split on real section boundaries. Headings inside fenced code blocks are
 * ignored.
 */
import type { HeadingSpan, Loader } from "../types"

const ATX = /^(#{1,6})\s+(.+?)\s*#*$/

export const markdownLoader: Loader = {
  async load({ data }) {
    const text = new TextDecoder()
      .decode(data)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")

    const headings: HeadingSpan[] = []
    let offset = 0
    let inFence = false

    for (const line of text.split("\n")) {
      const fence = /^\s*(```|~~~)/.test(line)
      if (fence) inFence = !inFence

      if (!inFence) {
        const m = ATX.exec(line)
        if (m) {
          headings.push({
            depth: m[1].length,
            title: m[2].trim(),
            offset,
          })
        }
      }
      // +1 for the newline that `split` removed.
      offset += line.length + 1
    }

    return { text, headings }
  },
}
