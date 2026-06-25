/**
 * Local text cleaning applied to chunk content (ARCHITECTURE.md §11).
 *
 * Run per-chunk *after* structural metadata (page/heading offsets) has been
 * derived from the raw loader text, so cleaning never invalidates those
 * offsets. Handles the common extraction artifacts: form feeds, soft hyphens,
 * line-break hyphenation, standalone page-number lines, and excess whitespace.
 */

/** A line that is nothing but a 1–4 digit number — almost always a page number. */
const PAGE_NUMBER_LINE = /^\s*\d{1,4}\s*$/

export function cleanText(input: string): string {
  return input
    .replace(/\f/g, "\n") // form feeds → line breaks
    .replace(/­/g, "") // soft hyphens
    .replace(/([A-Za-z])-\n(?=[a-z])/g, "$1") // de-hyphenate line-break splits
    .split("\n")
    .filter((line) => !PAGE_NUMBER_LINE.test(line))
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
