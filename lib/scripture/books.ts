/**
 * The 66-book Protestant canon with common abbreviations, used to normalize a
 * free-text book name (e.g. "1 cor", "Ps", "Song of Songs") to its canonical
 * name and 1-based number. Aliases are matched case- and punctuation-insensitively.
 */
export interface BookInfo {
  number: number
  name: string
  aliases: string[]
}

export const CANON: BookInfo[] = [
  { number: 1, name: "Genesis", aliases: ["gen", "gn"] },
  { number: 2, name: "Exodus", aliases: ["exod", "exo", "ex"] },
  { number: 3, name: "Leviticus", aliases: ["lev", "lv"] },
  { number: 4, name: "Numbers", aliases: ["num", "nm", "nb"] },
  { number: 5, name: "Deuteronomy", aliases: ["deut", "dt"] },
  { number: 6, name: "Joshua", aliases: ["josh", "jos", "jsh"] },
  { number: 7, name: "Judges", aliases: ["judg", "jdg", "jg"] },
  { number: 8, name: "Ruth", aliases: ["rth", "ru"] },
  { number: 9, name: "1 Samuel", aliases: ["1 sam", "1sam", "1 sm", "1sm", "i samuel"] },
  { number: 10, name: "2 Samuel", aliases: ["2 sam", "2sam", "2 sm", "2sm", "ii samuel"] },
  { number: 11, name: "1 Kings", aliases: ["1 kgs", "1kgs", "1 ki", "1ki", "i kings"] },
  { number: 12, name: "2 Kings", aliases: ["2 kgs", "2kgs", "2 ki", "2ki", "ii kings"] },
  { number: 13, name: "1 Chronicles", aliases: ["1 chron", "1 chr", "1chr", "1 ch", "i chronicles"] },
  { number: 14, name: "2 Chronicles", aliases: ["2 chron", "2 chr", "2chr", "2 ch", "ii chronicles"] },
  { number: 15, name: "Ezra", aliases: ["ezr", "ez"] },
  { number: 16, name: "Nehemiah", aliases: ["neh", "ne"] },
  { number: 17, name: "Esther", aliases: ["esth", "est", "es"] },
  { number: 18, name: "Job", aliases: ["jb"] },
  { number: 19, name: "Psalms", aliases: ["psalm", "psa", "ps", "pss", "psm"] },
  { number: 20, name: "Proverbs", aliases: ["prov", "prv", "pr"] },
  { number: 21, name: "Ecclesiastes", aliases: ["eccles", "eccl", "ecc", "qoh"] },
  { number: 22, name: "Song of Solomon", aliases: ["song of songs", "song", "sos", "sng", "canticles"] },
  { number: 23, name: "Isaiah", aliases: ["isa", "is"] },
  { number: 24, name: "Jeremiah", aliases: ["jer", "je", "jr"] },
  { number: 25, name: "Lamentations", aliases: ["lam", "la"] },
  { number: 26, name: "Ezekiel", aliases: ["ezek", "eze", "ezk"] },
  { number: 27, name: "Daniel", aliases: ["dan", "dn"] },
  { number: 28, name: "Hosea", aliases: ["hos", "ho"] },
  { number: 29, name: "Joel", aliases: ["jl"] },
  { number: 30, name: "Amos", aliases: ["am"] },
  { number: 31, name: "Obadiah", aliases: ["obad", "ob"] },
  { number: 32, name: "Jonah", aliases: ["jon", "jnh"] },
  { number: 33, name: "Micah", aliases: ["mic", "mc"] },
  { number: 34, name: "Nahum", aliases: ["nah", "na"] },
  { number: 35, name: "Habakkuk", aliases: ["hab", "hb"] },
  { number: 36, name: "Zephaniah", aliases: ["zeph", "zep", "zp"] },
  { number: 37, name: "Haggai", aliases: ["hag", "hg"] },
  { number: 38, name: "Zechariah", aliases: ["zech", "zec", "zc"] },
  { number: 39, name: "Malachi", aliases: ["mal", "ml"] },
  { number: 40, name: "Matthew", aliases: ["matt", "mt"] },
  { number: 41, name: "Mark", aliases: ["mrk", "mk", "mr"] },
  { number: 42, name: "Luke", aliases: ["luk", "lk"] },
  { number: 43, name: "John", aliases: ["jhn", "jn"] },
  { number: 44, name: "Acts", aliases: ["act", "ac"] },
  { number: 45, name: "Romans", aliases: ["rom", "rm"] },
  { number: 46, name: "1 Corinthians", aliases: ["1 cor", "1cor", "1 co", "i corinthians"] },
  { number: 47, name: "2 Corinthians", aliases: ["2 cor", "2cor", "2 co", "ii corinthians"] },
  { number: 48, name: "Galatians", aliases: ["gal", "ga"] },
  { number: 49, name: "Ephesians", aliases: ["eph", "ephes"] },
  { number: 50, name: "Philippians", aliases: ["phil", "php", "pp"] },
  { number: 51, name: "Colossians", aliases: ["col", "co"] },
  { number: 52, name: "1 Thessalonians", aliases: ["1 thess", "1 thes", "1th", "i thessalonians"] },
  { number: 53, name: "2 Thessalonians", aliases: ["2 thess", "2 thes", "2th", "ii thessalonians"] },
  { number: 54, name: "1 Timothy", aliases: ["1 tim", "1tim", "1 ti", "i timothy"] },
  { number: 55, name: "2 Timothy", aliases: ["2 tim", "2tim", "2 ti", "ii timothy"] },
  { number: 56, name: "Titus", aliases: ["tit", "ti"] },
  { number: 57, name: "Philemon", aliases: ["philem", "phm", "pm"] },
  { number: 58, name: "Hebrews", aliases: ["heb"] },
  { number: 59, name: "James", aliases: ["jas", "jm"] },
  { number: 60, name: "1 Peter", aliases: ["1 pet", "1pet", "1 pt", "i peter"] },
  { number: 61, name: "2 Peter", aliases: ["2 pet", "2pet", "2 pt", "ii peter"] },
  { number: 62, name: "1 John", aliases: ["1 jn", "1jn", "1 jhn", "i john"] },
  { number: 63, name: "2 John", aliases: ["2 jn", "2jn", "2 jhn", "ii john"] },
  { number: 64, name: "3 John", aliases: ["3 jn", "3jn", "3 jhn", "iii john"] },
  { number: 65, name: "Jude", aliases: ["jud", "jd"] },
  { number: 66, name: "Revelation", aliases: ["rev", "rv", "apocalypse"] },
]

/** Normalize for matching: lowercase, strip periods, collapse whitespace. */
function key(s: string): string {
  return s
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
}

const LOOKUP = new Map<string, BookInfo>()
for (const book of CANON) {
  LOOKUP.set(key(book.name), book)
  for (const alias of book.aliases) LOOKUP.set(key(alias), book)
}

/** Resolve a free-text book name/abbreviation to its canonical book, or undefined. */
export function resolveBook(name: string): BookInfo | undefined {
  return LOOKUP.get(key(name))
}
