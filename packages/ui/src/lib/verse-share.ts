/**
 * Formatting helpers for the verse action popover's Copy / Share output.
 *
 * The target format mirrors bible.com (see docs/adr/YPE-642-verse-action-popover.md,
 * ADR-006), NOT the original ticket's inline `"text" - Ref Version` draft:
 *
 *     "<verse text, gaps joined by ' ... '>"
 *
 *     <Book> <Chapter>:<verses> <VERSION>
 *
 * Text and reference are separated by a blank line. Non-contiguous verses are
 * joined with ` ... `; the reference collapses contiguous runs to ranges.
 */

const LEFT_DOUBLE_QUOTE = '“';
const RIGHT_DOUBLE_QUOTE = '”';
const ELLIPSIS_GAP = ' ... ';

function normalizeVerses(verses: number[]): number[] {
  return [...new Set(verses)].sort((a, b) => a - b);
}

/**
 * Collapses a verse list into a bible.com-style reference fragment:
 * `[1,2,3] -> "1-3"`, `[1,3] -> "1,3"`, `[1,2,4,5] -> "1-2,4-5"`.
 */
export function formatVerseNumbers(verses: number[]): string {
  const sorted = normalizeVerses(verses);
  if (sorted.length === 0) return '';

  const ranges: string[] = [];
  let start = sorted[0]!;
  let prev = sorted[0]!;

  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i];
    if (current !== undefined && current === prev + 1) {
      prev = current;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    if (current !== undefined) {
      start = current;
      prev = current;
    }
  }

  return ranges.join(',');
}

/**
 * Joins per-verse text in ascending order, inserting ` ... ` wherever the
 * selection skips a verse (so non-contiguous picks read as an abridged quote).
 */
export function joinVerseTexts(
  verses: number[],
  textByVerse: Record<number, string>,
): string {
  const sorted = normalizeVerses(verses);
  let out = '';

  sorted.forEach((verse, index) => {
    const text = (textByVerse[verse] ?? '').trim();
    if (index === 0) {
      out = text;
      return;
    }
    const gap = verse > sorted[index - 1]! + 1 ? ELLIPSIS_GAP : ' ';
    out += gap + text;
  });

  return out.trim();
}

/**
 * Builds the reference line: `Book Chapter:verses VERSION`
 * (e.g. `John 1:1-3 NIV`). The version abbreviation is dropped when empty.
 */
export function buildVerseReference({
  bookName,
  chapter,
  verses,
  versionAbbreviation,
}: {
  bookName: string;
  chapter: string | number;
  verses: number[];
  versionAbbreviation: string;
}): string {
  return [
    `${bookName} ${chapter}:${formatVerseNumbers(verses)}`.trim(),
    versionAbbreviation.trim(),
  ]
    .filter(Boolean)
    .join(' ');
}

export type BuildVerseShareTextOptions = {
  verses: number[];
  textByVerse: Record<number, string>;
  bookName: string;
  chapter: string | number;
  versionAbbreviation: string;
};

/**
 * Produces the full Copy / Share payload: curly-quoted verse text, a blank
 * line, then `Book Chapter:verses VERSION`.
 */
export function buildVerseShareText({
  verses,
  textByVerse,
  bookName,
  chapter,
  versionAbbreviation,
}: BuildVerseShareTextOptions): string {
  const body = joinVerseTexts(verses, textByVerse);
  const reference = buildVerseReference({ bookName, chapter, verses, versionAbbreviation });

  return `${LEFT_DOUBLE_QUOTE}${body}${RIGHT_DOUBLE_QUOTE}\n\n${reference}`;
}
