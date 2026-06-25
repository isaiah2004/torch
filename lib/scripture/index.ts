/** Scripture module: reference parsing, canonical books, and DB-backed lookup. */
export { CANON, resolveBook, type BookInfo } from "./books"
export {
  parseReference,
  formatReference,
  type ScriptureReference,
} from "./reference"
export {
  lookupPassage,
  lookupByReference,
  type PassageResult,
  type ScriptureVerse,
} from "./lookup"
export { normalizeVerseRecords, type VerseRow } from "./import"
export {
  fetchApiBiblePassage,
  isApiBibleConfigured,
  quotePassage,
  toPassageId,
  getApiBibleId,
  type ApiBiblePassage,
} from "./api-bible"
