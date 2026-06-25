/** Plain-text loader: normalize line endings, no structure to extract. */
import type { Loader } from "../types"

export const textLoader: Loader = {
  async load({ data }) {
    const text = new TextDecoder()
      .decode(data)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
    return { text }
  },
}
