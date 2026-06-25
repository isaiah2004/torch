import JSZip from "jszip"
import { describe, expect, it } from "vitest"

import { extractHtml } from "@/lib/ingestion/loaders/html-extract"
import {
  detectFormat,
  epubLoader,
  htmlLoader,
  loadDocument,
  markdownLoader,
  textLoader,
} from "@/lib/ingestion/loaders"

const enc = (s: string) => new TextEncoder().encode(s)

describe("detectFormat", () => {
  it("prefers MIME type", () => {
    expect(detectFormat({ mimeType: "application/pdf" })).toBe("pdf")
    expect(detectFormat({ mimeType: "application/epub+zip" })).toBe("epub")
    expect(detectFormat({ mimeType: "text/html; charset=utf-8" })).toBe("html")
  })
  it("falls back to extension", () => {
    expect(detectFormat({ filename: "book.EPUB" })).toBe("epub")
    expect(detectFormat({ filename: "notes.md" })).toBe("markdown")
    expect(detectFormat({ filename: "a.txt" })).toBe("text")
  })
  it("returns undefined for unknown input", () => {
    expect(detectFormat({ filename: "mystery.bin" })).toBeUndefined()
    expect(detectFormat({})).toBeUndefined()
  })
})

describe("textLoader", () => {
  it("normalizes CRLF and CR line endings", async () => {
    const { text } = await textLoader.load({ data: enc("a\r\nb\rc\n") })
    expect(text).toBe("a\nb\nc\n")
  })
})

describe("markdownLoader", () => {
  it("records heading offsets that index into the text", async () => {
    const md = "# Title\n\nIntro.\n\n## Grace\n\nBody text."
    const { text, headings = [] } = await markdownLoader.load({ data: enc(md) })
    expect(headings).toHaveLength(2)
    expect(headings[0]).toMatchObject({ depth: 1, title: "Title" })
    expect(headings[1]).toMatchObject({ depth: 2, title: "Grace" })
    // Offsets must point at the actual heading lines.
    expect(text.slice(headings[0].offset)).toMatch(/^# Title/)
    expect(text.slice(headings[1].offset)).toMatch(/^## Grace/)
  })
  it("ignores '#' inside fenced code blocks", async () => {
    const md = "# Real\n\n```\n# not a heading\n```\n\n## Also real"
    const { headings = [] } = await markdownLoader.load({ data: enc(md) })
    expect(headings.map((h) => h.title)).toEqual(["Real", "Also real"])
  })
})

describe("extractHtml / htmlLoader", () => {
  it("drops boilerplate and keeps heading offsets aligned to text", () => {
    const html = `
      <html><head><style>.x{}</style></head>
      <body>
        <nav>skip me</nav>
        <h1>Doctrine of Grace</h1>
        <p>Grace is unmerited favor.</p>
        <script>alert(1)</script>
        <h2>Justification</h2>
        <p>By faith alone.</p>
        <footer>copyright</footer>
      </body></html>`
    const { text, headings } = extractHtml(html)
    expect(text).not.toMatch(/skip me|alert|copyright|\.x\{/)
    expect(text).toContain("Grace is unmerited favor.")
    expect(headings.map((h) => h.title)).toEqual([
      "Doctrine of Grace",
      "Justification",
    ])
    for (const h of headings) {
      expect(text.slice(h.offset)).toContain(h.title)
    }
  })

  it("loads via the Loader interface", async () => {
    const { text } = await htmlLoader.load({
      data: enc("<h1>Hi</h1><p>There</p>"),
    })
    expect(text).toContain("Hi")
    expect(text).toContain("There")
  })
})

async function buildEpub(): Promise<Uint8Array> {
  const zip = new JSZip()
  zip.file("mimetype", "application/epub+zip")
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?><container><rootfiles>
       <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
     </rootfiles></container>`,
  )
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0"?><package><manifest>
       <item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
       <item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
     </manifest><spine>
       <itemref idref="c1"/><itemref idref="c2"/>
     </spine></package>`,
  )
  zip.file(
    "OEBPS/ch1.xhtml",
    `<html><body><h1>Chapter One</h1><p>The first chapter body.</p></body></html>`,
  )
  zip.file(
    "OEBPS/ch2.xhtml",
    `<html><body><h1>Chapter Two</h1><p>The second chapter body.</p></body></html>`,
  )
  return zip.generateAsync({ type: "uint8array" })
}

describe("epubLoader", () => {
  it("reads the spine in order with cross-document heading offsets", async () => {
    const data = await buildEpub()
    const { text, headings = [] } = await epubLoader.load({ data })
    expect(text.indexOf("first chapter")).toBeLessThan(
      text.indexOf("second chapter"),
    )
    expect(headings.map((h) => h.title)).toEqual(["Chapter One", "Chapter Two"])
    for (const h of headings) {
      expect(text.slice(h.offset)).toContain(h.title)
    }
  })

  it("dispatches through loadDocument by MIME type", async () => {
    const data = await buildEpub()
    const { headings } = await loadDocument({
      data,
      mimeType: "application/epub+zip",
    })
    expect(headings?.[0]?.title).toBe("Chapter One")
  })
})
