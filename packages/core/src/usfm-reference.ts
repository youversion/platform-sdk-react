export type UsfmReference = Readonly<{
  book: string;
  chapter: string;
  verses: readonly number[];
}>;

const USFM_REFERENCE_PATTERN = /^([A-Z0-9]{1,3})\.(\d+)(?:\.(\d+)(?:-(\d+))?)?$/;

/**
 * Parses `JHN.6`, `JHN.6.9`, and `JHN.6.9-11`. Returns `null` for anything
 * malformed, non-positive, or with `verseEnd < verseStart`. Does not check
 * book codes against `BOOK_IDS`.
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
  if (!Number.isInteger(chapterNumber) || chapterNumber <= 0) {
    return null;
  }

  if (match[3] === undefined) {
    return { book, chapter, verses: [] };
  }

  const verseStart = Number(match[3]);
  if (!Number.isInteger(verseStart) || verseStart <= 0) {
    return null;
  }

  if (match[4] === undefined) {
    return { book, chapter, verses: [verseStart] };
  }

  const verseEnd = Number(match[4]);
  if (!Number.isInteger(verseEnd) || verseEnd <= 0 || verseEnd < verseStart) {
    return null;
  }

  const verses: number[] = [];
  for (let verse = verseStart; verse <= verseEnd; verse += 1) {
    verses.push(verse);
  }
  return { book, chapter, verses };
}
