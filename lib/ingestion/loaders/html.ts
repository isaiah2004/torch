/** HTML loader: strip boilerplate, keep headings + paragraph structure. */
import type { Loader } from "../types"
import { extractHtml } from "./html-extract"

export const htmlLoader: Loader = {
  async load({ data }) {
    const html = new TextDecoder().decode(data)
    const { text, headings } = extractHtml(html)
    return { text, headings }
  },
}
