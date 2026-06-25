/**
 * PDF loader backed by `unpdf` (serverless-friendly pdf.js build). Extracts
 * text per page so page numbers can be carried onto chunks for citations.
 */
import { extractText, getDocumentProxy } from "unpdf"

import type { Loader, PageSpan } from "../types"

export const pdfLoader: Loader = {
  async load({ data }) {
    const pdf = await getDocumentProxy(new Uint8Array(data))
    const { text: perPage } = await extractText(pdf, { mergePages: false })
    const pages: string[] = Array.isArray(perPage) ? perPage : [perPage]

    const segments: string[] = []
    const spans: PageSpan[] = []
    let length = 0

    pages.forEach((raw, i) => {
      const content = raw.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
      const start = length
      segments.push(content)
      length += content.length
      spans.push({ page: i + 1, start, end: length })
      // Separator between pages (not part of any page span).
      segments.push("\n\n")
      length += 2
    })

    return { text: segments.join("").replace(/\s+$/g, ""), pages: spans }
  },
}
