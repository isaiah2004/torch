/**
 * Loader dispatch: pick the right loader from a MIME type or filename, normalize
 * any supported format into a {@link LoaderResult}. See ARCHITECTURE.md §11.
 */
import type { Loader, LoaderInput, LoaderResult, SupportedFormat } from "../types"
import { epubLoader } from "./epub"
import { htmlLoader } from "./html"
import { markdownLoader } from "./markdown"
import { pdfLoader } from "./pdf"
import { textLoader } from "./text"

const LOADERS: Record<SupportedFormat, Loader> = {
  pdf: pdfLoader,
  epub: epubLoader,
  markdown: markdownLoader,
  html: htmlLoader,
  text: textLoader,
}

const MIME_FORMATS: Record<string, SupportedFormat> = {
  "application/pdf": "pdf",
  "application/epub+zip": "epub",
  "text/markdown": "markdown",
  "text/html": "html",
  "application/xhtml+xml": "html",
  "text/plain": "text",
}

const EXT_FORMATS: Record<string, SupportedFormat> = {
  pdf: "pdf",
  epub: "epub",
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
  html: "html",
  htm: "html",
  xhtml: "html",
  txt: "text",
  text: "text",
}

function extensionOf(filename?: string): string | undefined {
  if (!filename) return undefined
  const dot = filename.lastIndexOf(".")
  if (dot < 0) return undefined
  return filename.slice(dot + 1).toLowerCase()
}

/** Resolve the format for an input, preferring MIME type, then file extension. */
export function detectFormat(input: {
  filename?: string
  mimeType?: string
}): SupportedFormat | undefined {
  if (input.mimeType) {
    const byMime = MIME_FORMATS[input.mimeType.split(";")[0].trim().toLowerCase()]
    if (byMime) return byMime
  }
  const ext = extensionOf(input.filename)
  return ext ? EXT_FORMATS[ext] : undefined
}

export function getLoader(format: SupportedFormat): Loader {
  return LOADERS[format]
}

/** Detect the format and run the matching loader. Throws on unsupported input. */
export async function loadDocument(input: LoaderInput): Promise<LoaderResult> {
  const format = detectFormat(input)
  if (!format) {
    throw new Error(
      `Unsupported document type (mime=${input.mimeType ?? "?"}, file=${input.filename ?? "?"}). ` +
        "Supported: pdf, epub, markdown, html, text.",
    )
  }
  return LOADERS[format].load(input)
}

export { epubLoader, htmlLoader, markdownLoader, pdfLoader, textLoader }
