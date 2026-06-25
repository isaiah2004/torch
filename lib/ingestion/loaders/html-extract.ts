/**
 * Shared HTML → {text, headings} extraction used by the HTML and EPUB loaders.
 *
 * Walks the DOM, drops non-content elements (script/style/nav/…), inserts line
 * breaks after block elements so paragraph structure survives, and records the
 * character offset of every heading so the chunker can keep sections intact.
 *
 * Heading offsets are tracked against the text as it is built (never against a
 * post-processed copy), so they always index the returned `text` exactly.
 */
import { parse, type HTMLElement, type Node } from "node-html-parser"

import type { HeadingSpan } from "../types"

const SKIP_TAGS = new Set([
  "script",
  "style",
  "noscript",
  "head",
  "svg",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
])

const BLOCK_TAGS = new Set([
  "p",
  "div",
  "section",
  "article",
  "main",
  "li",
  "ul",
  "ol",
  "tr",
  "table",
  "blockquote",
  "pre",
  "figure",
  "figcaption",
  "br",
  "hr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
])

const HEADING_DEPTH: Record<string, number> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  h6: 6,
}

const TEXT_NODE = 3
const ELEMENT_NODE = 1

export interface HtmlExtraction {
  text: string
  headings: HeadingSpan[]
}

export function extractHtml(html: string): HtmlExtraction {
  const root = parse(html, { blockTextElements: { pre: true } })
  const headings: HeadingSpan[] = []
  let text = ""

  const appendText = (raw: string) => {
    let s = raw.replace(/\s+/g, " ")
    if (!s.trim()) return
    if (text === "" || text.endsWith("\n")) s = s.trimStart()
    text += s
  }

  /** Append at most a paragraph break, never extending a run past two newlines. */
  const appendBreak = () => {
    if (text === "") return // no leading break
    if (text.endsWith("\n\n")) return
    text += "\n"
  }

  const walk = (node: Node) => {
    if (node.nodeType === TEXT_NODE) {
      appendText(node.text)
      return
    }
    if (node.nodeType !== ELEMENT_NODE) return

    const el = node as HTMLElement
    const tag = el.rawTagName?.toLowerCase()
    if (tag && SKIP_TAGS.has(tag)) return

    const depth = tag ? HEADING_DEPTH[tag] : undefined
    const isBlock = tag ? BLOCK_TAGS.has(tag) : false

    if (isBlock) appendBreak()

    if (depth) {
      const title = el.text.replace(/\s+/g, " ").trim()
      headings.push({ depth, title, offset: text.length })
    }

    for (const child of el.childNodes) walk(child)

    if (isBlock) appendBreak()
  }

  walk(root)

  return { text: text.replace(/\s+$/g, ""), headings }
}
