import type { Highlight } from '@youversion/platform-core';

/**
 * Defensive cap on how many verses a single range USFM may expand to. The
 * longest chapter in any Bible (Psalm 119) has 176 verses, so any range longer
 * than this is malformed data and is rejected rather than expanded.
 */
const MAX_RANGE_LENGTH = 250;

/** A verse USFM (`JHN.3.16` / `JHN.3.16-18`) split into its parts. */
export type ExpandedPassageId = {
  book: string;
  chapter: string;
  /** Every verse number covered, ascending (a range expands to each verse). */
  verses: number[];
};

/**
 * Expands a verse or verse-range USFM passage id (`JHN.3.16`, `JHN.3.16-18`)
 * into its book, chapter, and per-verse numbers.
 *
 * Returns `null` for anything that is not a highlightable verse unit: a
 * chapter-scope USFM (`JHN.3`), malformed input, a reversed range, verse 0, or
 * an implausibly large range.
 */
export function expandPassageId(passageId: string): ExpandedPassageId | null {
  const parts = passageId.split('.');
  if (parts.length !== 3) return null;
  const [book, chapter, versePart] = parts;
  if (!book || !chapter || !versePart) return null;

  const match = /^(\d+)(?:-(\d+))?$/.exec(versePart);
  if (!match) return null;

  const start = parseInt(match[1]!, 10);
  const end = match[2] !== undefined ? parseInt(match[2], 10) : start;
  if (start < 1 || end < start || end - start + 1 > MAX_RANGE_LENGTH) return null;

  const verses: number[] = [];
  for (let verse = start; verse <= end; verse++) {
    verses.push(verse);
  }
  return { book, chapter, verses };
}

/**
 * Projects a host-supplied `Highlight[]` (core API shape) onto the displayed
 * chapter as the reader's internal render map (verse number -> hex color).
 *
 * Entries for other versions, books, or chapters are ignored — every entry
 * carries its full identity, so stale host data can never mispaint. Range
 * passage ids are expanded per verse. Colors are normalized to lowercase (the
 * API accepts uppercase at the boundary). Later entries win on collisions.
 *
 * When `allowedColors` is given, entries with any other color are ignored too:
 * the verse-action popover can only offer removal for its own swatches, so a
 * color the reader can't manage must not paint (it would be un-removable).
 */
export function deriveHighlightedVerses(
  highlights: readonly Highlight[],
  versionId: number,
  book: string,
  chapter: string,
  allowedColors?: readonly string[],
): Record<number, string> {
  const map: Record<number, string> = {};
  for (const { version_id, passage_id, color } of highlights) {
    if (version_id !== versionId) continue;
    const normalizedColor = color.toLowerCase();
    if (allowedColors && !allowedColors.includes(normalizedColor)) continue;
    const expanded = expandPassageId(passage_id);
    if (!expanded || expanded.book !== book || expanded.chapter !== chapter) continue;
    for (const verse of expanded.verses) {
      map[verse] = normalizedColor;
    }
  }
  return map;
}
