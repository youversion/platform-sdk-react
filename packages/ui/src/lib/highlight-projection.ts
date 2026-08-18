import type { Highlight } from '@youversion/platform-core';
import { normalizeHighlightHex } from './highlight-colors';
import { buildPassageIds } from './usfm-ranges';

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

/** Book + chapter parsed from a chapter, verse, or verse-range USFM. */
export type ChapterScope = {
  book: string;
  chapter: string;
};

/**
 * Parses book + chapter from a display USFM: chapter (`JHN.3`), verse
 * (`JHN.3.16`), or verse-range (`JHN.3.16-18`). Returns `null` when the string
 * has no book and chapter segments.
 *
 * Unlike {@link expandPassageId}, this does not require a verse unit — cards
 * and `BibleTextView` accept chapter-scope references.
 */
export function parseChapterScopeFromUsfm(usfm: string): ChapterScope | null {
  const parts = usfm.split('.');
  if (parts.length < 2) return null;
  const [book, chapter] = parts;
  if (!book || !chapter) return null;
  return { book, chapter };
}

/**
 * Chapter scope to project host highlights onto, given the passage actually
 * on screen vs the USFM the host just requested.
 *
 * `useApiData` keeps the previous passage while the next fetch is in flight,
 * and callers like `BibleCard` keep rendering that retained HTML. Projecting
 * against the requested USFM in that window paints destination-chapter
 * highlights onto the old passage's same-numbered verse wrappers.
 *
 * When the retained passage is a different chapter, this returns that
 * chapter so the old HTML keeps its own highlights. When it is the same
 * chapter but still loading, this returns `null`: the retained HTML may
 * belong to the previous version, and `BiblePassage` has no version id to
 * confirm a match.
 */
export function chapterScopeForHighlightPaint(options: {
  renderedPassageId: string | undefined;
  requestedUsfm: string;
  loading: boolean;
}): ChapterScope | null {
  const renderedScope = options.renderedPassageId
    ? parseChapterScopeFromUsfm(options.renderedPassageId)
    : null;
  const requestedScope = parseChapterScopeFromUsfm(options.requestedUsfm);
  const paintScope = renderedScope ?? requestedScope;
  if (!paintScope) return null;

  if (options.loading && renderedScope && requestedScope) {
    const sameChapter =
      renderedScope.book === requestedScope.book &&
      renderedScope.chapter === requestedScope.chapter;
    if (sameChapter) return null;
  }

  return paintScope;
}

/**
 * Keeps highlights whose expanded verses intersect the displayed passage,
 * rewriting each kept row's `passage_id` to that intersection.
 *
 * A range like `JHN.3.16-18` against today's `JHN.3.16` becomes `JHN.3.16`, so
 * {@link deriveHighlightedVerses} cannot paint verses that are not shown. A
 * gapped intersection becomes one row per contiguous run. Chapter-scope and
 * other unexpandable `passage_id`s are dropped.
 */
export function filterHighlightsForPassage(
  highlights: readonly Highlight[],
  displayPassageId: string,
): Highlight[] {
  const displayed = expandPassageId(displayPassageId);
  if (!displayed) return [];
  const displayedVerses = new Set(displayed.verses);
  const clipped: Highlight[] = [];
  for (const highlight of highlights) {
    const expanded = expandPassageId(highlight.passage_id);
    if (!expanded) continue;
    if (expanded.book !== displayed.book || expanded.chapter !== displayed.chapter) continue;
    const verses = expanded.verses.filter((verse) => displayedVerses.has(verse));
    if (verses.length === 0) continue;
    for (const passage_id of buildPassageIds(displayed.book, displayed.chapter, verses)) {
      clipped.push({ ...highlight, passage_id });
    }
  }
  return clipped;
}

/**
 * Projects a host-supplied `Highlight[]` (core API shape) onto the displayed
 * chapter as the reader's internal render map (verse number -> hex color).
 *
 * Entries for other versions, books, or chapters are ignored — every entry
 * carries its full identity, so stale host data can never mispaint. Range
 * passage ids are expanded per verse. Colors are normalized to lowercase (the
 * API accepts uppercase at the boundary). Invalid hex is dropped. Valid
 * non-palette colors paint so the remove tray can clear them (YPE-4494). Later
 * entries win on collisions.
 */
export function deriveHighlightedVerses(
  highlights: readonly Highlight[],
  versionId: number,
  book: string,
  chapter: string,
): Record<number, string> {
  const map: Record<number, string> = {};
  for (const { version_id, passage_id, color } of highlights) {
    if (version_id !== versionId) continue;
    const normalizedColor = normalizeHighlightHex(color);
    if (normalizedColor === null) continue;
    const expanded = expandPassageId(passage_id);
    if (!expanded || expanded.book !== book || expanded.chapter !== chapter) continue;
    for (const verse of expanded.verses) {
      map[verse] = normalizedColor;
    }
  }
  return map;
}
