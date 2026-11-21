/**
 * Serializable payload describing the reader's current verse selection.
 * Bridge-safe primitives only, so React Native / Expo DOM hosts can forward it
 * across the native bridge. `passageIds` is deliberately redundant with
 * `book`/`chapter`/`verses` (always per-verse, never ranges): native hosts feed
 * the API without USFM string-building; analytics reads `verses` without USFM
 * parsing.
 */
export type BibleReaderVerseSelection = {
  /** Matches `Highlight.version_id`. */
  versionId: number;
  /** USFM book code, e.g. `'JHN'`. */
  book: string;
  /** Chapter id, e.g. `'3'`. */
  chapter: string;
  /** Selected verse numbers, ascending and de-duplicated. `[]` on clear. */
  verses: number[];
  /** Per-verse USFM ids, e.g. `['JHN.3.16', 'JHN.3.17']`. Never ranges. */
  passageIds: string[];
  /**
   * Localized display reference **without** the version abbreviation, e.g.
   * `Hebrews 11:4`. For a host that renders its own verse-action UI (see
   * `BibleReaderRootProps.verseActions`) this is the label to show; the USFM `book`
   * code above is not human-readable.
   *
   * Falls back to the USFM book code (`HEB 11:4`) until `useBooks` resolves the
   * book title; when it resolves while the selection is still live, the reader
   * re-emits that selection with the localized reference. `''` on clear.
   *
   * Deliberately different from `shareData.reference`, which keeps the version
   * abbreviation (`Hebrews 11:4 BSB`) because copied text needs it. Do not
   * "fix" one to match the other.
   */
  reference: string;
  /**
   * The same payload the popover's Copy / Share buttons produce, so a host
   * owning the verse-action UI can run copy/share without a popover press.
   * `null` on clear (and if the reader's DOM is not mounted).
   */
  shareData: BibleReaderShareData | null;
};

/**
 * Serializable payload handed to `onHighlightApply` / `onHighlightRemove` in
 * controlled mode. An intent is a request, not a fact: the reader paints
 * nothing until the host round-trips an updated `highlights` prop.
 *
 * `reference` / `shareData` are deliberately omitted: an intent is addressed to
 * the data layer, which needs identity and colour only.
 */
export type BibleReaderHighlightIntent = Omit<
  BibleReaderVerseSelection,
  'reference' | 'shareData'
> & {
  /**
   * 6-character lowercase hex, no `#`. For `onHighlightRemove`, the color
   * being cleared.
   */
  color: string;
};

/**
 * Serializable payload handed to the `onCopy` / `onShare` overrides. Mirrors
 * `VerseOfTheDayShareData` so React Native / Expo DOM hosts can forward verse
 * selections across the native bridge.
 */
export type BibleReaderShareData = {
  /** Full body: curly-quoted verse text, a blank line, then the reference. */
  text: string;
  /** Reference line only, e.g. `John 1:1-3 NIV`. */
  reference: string;
  /** Verse text only (no reference line), gaps joined with ` ... `. */
  verseText: string;
  /** Selected verse numbers, ascending and de-duplicated. */
  verses: number[];
  book: string;
  chapter: string;
  versionId: number;
};
