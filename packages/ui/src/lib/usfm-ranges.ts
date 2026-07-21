/**
 * Collapses verse selections into the range USFMs the highlights API speaks.
 *
 * The API stores highlights per verse but accepts contiguous ranges on the
 * wire (`JHN.3.16-18`), so a 3-verse apply is one POST instead of three. The
 * run-grouping mirrors `formatVerseNumbers` in verse-share.ts, but emits USFM
 * passage ids instead of a human-readable reference fragment.
 */

export type VerseRun = { start: number; end: number };

/**
 * Groups a verse list into contiguous ascending runs:
 * `[16,17,18] -> [{16,18}]`, `[1,3,4] -> [{1,1},{3,4}]`.
 * De-duplicates and sorts; non-positive verse numbers are dropped.
 */
export function collapseVerseRuns(verses: number[]): VerseRun[] {
  const sorted = [...new Set(verses)].filter((verse) => verse > 0).sort((a, b) => a - b);
  const runs: VerseRun[] = [];

  for (const verse of sorted) {
    const current = runs[runs.length - 1];
    if (current && verse === current.end + 1) {
      current.end = verse;
    } else {
      runs.push({ start: verse, end: verse });
    }
  }

  return runs;
}

/**
 * The range USFM for one contiguous run:
 * `("JHN", "3", {2,3}) -> "JHN.3.2-3"`, `("JHN", "3", {5,5}) -> "JHN.3.5"`.
 */
export function formatPassageId(book: string, chapter: string, run: VerseRun): string {
  return run.start === run.end
    ? `${book}.${chapter}.${run.start}`
    : `${book}.${chapter}.${run.start}-${run.end}`;
}

/**
 * Builds one passage-id USFM per contiguous run:
 * `("JHN", "3", [16,17,18,20]) -> ["JHN.3.16-18", "JHN.3.20"]`.
 */
export function buildPassageIds(book: string, chapter: string, verses: number[]): string[] {
  return collapseVerseRuns(verses).map((run) => formatPassageId(book, chapter, run));
}
