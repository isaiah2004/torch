/**
 * EPUB loader. An EPUB is a ZIP of XHTML documents described by an OPF package
 * file. We read the spine in reading order, extract each document's text with
 * the shared HTML extractor, and concatenate — carrying heading offsets across
 * documents so the chunker keeps chapter/section context.
 */
import JSZip from "jszip"
import { parse } from "node-html-parser"

import type { HeadingSpan, Loader } from "../types"
import { extractHtml } from "./html-extract"

/** Resolve an OPF-relative href against the OPF's own directory, normalizing `..`. */
function resolveHref(opfPath: string, href: string): string {
  const base = opfPath.includes("/")
    ? opfPath.slice(0, opfPath.lastIndexOf("/"))
    : ""
  const decoded = decodeURIComponent(href.split("#")[0])
  const parts = (base ? base.split("/") : []).concat(decoded.split("/"))
  const stack: string[] = []
  for (const part of parts) {
    if (part === "" || part === ".") continue
    if (part === "..") stack.pop()
    else stack.push(part)
  }
  return stack.join("/")
}

export const epubLoader: Loader = {
  async load({ data }) {
    const zip = await JSZip.loadAsync(data)

    const containerFile = zip.file("META-INF/container.xml")
    if (!containerFile) throw new Error("EPUB missing META-INF/container.xml")
    const container = parse(await containerFile.async("string"))
    const opfPath = container.querySelector("rootfile")?.getAttribute("full-path")
    if (!opfPath) throw new Error("EPUB container has no rootfile path")

    const opfFile = zip.file(opfPath)
    if (!opfFile) throw new Error(`EPUB OPF not found at ${opfPath}`)
    const opf = parse(await opfFile.async("string"))

    // Map manifest id → href.
    const manifest = new Map<string, string>()
    for (const item of opf.querySelectorAll("manifest item")) {
      const id = item.getAttribute("id")
      const href = item.getAttribute("href")
      if (id && href) manifest.set(id, href)
    }

    // Spine gives reading order.
    const spine = opf
      .querySelectorAll("spine itemref")
      .map((ref) => ref.getAttribute("idref"))
      .filter((id): id is string => Boolean(id))

    let text = ""
    const headings: HeadingSpan[] = []

    for (const id of spine) {
      const href = manifest.get(id)
      if (!href) continue
      const docFile = zip.file(resolveHref(opfPath, href))
      if (!docFile) continue

      const extracted = extractHtml(await docFile.async("string"))
      if (!extracted.text.trim()) continue

      const base = text.length
      for (const h of extracted.headings) {
        headings.push({ ...h, offset: base + h.offset })
      }
      text += extracted.text + "\n\n"
    }

    return { text: text.replace(/\s+$/g, ""), headings }
  },
}
