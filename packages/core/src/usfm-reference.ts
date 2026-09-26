export type UsfmReference = Readonly<{
  book: string;
  chapter: string;
  verses: readonly number[];
}>;

const USFM_REFERENCE_PATTERN = /^([A-Z0-9]{1,3})\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/;

/**
 * Longest Bible chapter is Psalm 119 (176 verses). Anything longer is
 * malformed and is rejected rather than expanded.
 */
const MAX_RANGE_LENGTH = 250;

function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * Parses `JHN.6`, `JHN.6.9`, and `JHN.6.9-11`. Returns `null` for anything
 * malformed, non-positive, not a safe integer, with `verseEnd < verseStart`,
 * or a verse span longer than 250. Does not check book codes against
 * `BOOK_IDS`.
 *
 * Sole owner of this grammar. `isValidStructuralUsfmReference` is
 * `parseUsfmReference(usfm) !== null`.
 */
export function parseUsfmReference(usfm: string): UsfmReference | null {
  const match = USFM_REFERENCE_PATTERN.exec(usfm);
  if (!match) {
    return null;
  }

  const book = match[1];
  const chapter = match[2];
  if (book === undefined || chapter === undefined) {
    return null;
  }

  const chapterNumber = Number(chapter);
  if (!isPositiveSafeInteger(chapterNumber)) {
    return null;
  }

  if (match[3] === undefined) {
    return { book, chapter, verses: [] };
  }

  const verseStart = Number(match[3]);
  if (!isPositiveSafeInteger(verseStart)) {
    return null;
  }

  if (match[4] === undefined) {
    return { book, chapter, verses: [verseStart] };
  }

  const verseEnd = Number(match[4]);
  if (!isPositiveSafeInteger(verseEnd) || verseEnd < verseStart) {
    return null;
  }

  if (verseEnd - verseStart + 1 > MAX_RANGE_LENGTH) {
    return null;
  }

  const verses: number[] = [];
  for (let verse = verseStart; verse <= verseEnd; verse += 1) {
    verses.push(verse);
  }
  return { book, chapter, verses };
}
