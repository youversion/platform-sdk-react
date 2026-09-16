import { parseUsfmReference } from '@youversion/platform-core';

export type BibleReaderReference = Readonly<{
  versionId: number;
  passageId: string;
}>;

/** @internal */
export type BibleReaderNavigationRequest = BibleReaderReference &
  Readonly<{
    book: string;
    chapter: string;
    verses: readonly number[];
    showsFullChapter: boolean;
    scrollsToVerse: boolean;
    shouldFocus: boolean;
  }>;

/**
 * A host-owned connection to `BibleReader.Root` via its `navigation` prop.
 * Create once and retain it outside the reader. Before mount, the newest request
 * replaces any pending request. Mounting consumes that request once.
 */
export class BibleReaderNavigation {
  private pending: BibleReaderNavigationRequest | null = null;
  private listeners = new Set<() => void>();

  /** Show a passage, or its full chapter. Ordinary navigation does not focus. */
  request(reference: BibleReaderReference, showsFullChapter = false): void {
    this.enqueue(reference, showsFullChapter, true, false);
  }

  /**
   * Show the full chapter, scroll to the passage, then focus its verses.
   * With `scrollsToVerse: false`, focus only if that chapter/version is already
   * displayed, without navigating or changing the scroll position.
   */
  focusReference(reference: BibleReaderReference, scrollsToVerse = true): void {
    this.enqueue(reference, true, scrollsToVerse, true);
  }

  private enqueue(
    reference: BibleReaderReference,
    showsFullChapter: boolean,
    scrollsToVerse: boolean,
    shouldFocus: boolean,
  ): void {
    const parsed = parseUsfmReference(reference.passageId);
    if (parsed === null || !Number.isSafeInteger(reference.versionId) || reference.versionId <= 0) {
      throw new Error('Reader navigation requires a valid passage ID and Bible version ID');
    }
    this.pending = { ...reference, ...parsed, showsFullChapter, scrollsToVerse, shouldFocus };
    for (const listener of this.listeners) listener();
  }

  /** @internal */
  consume(): BibleReaderNavigationRequest | null {
    const request = this.pending;
    this.pending = null;
    return request;
  }

  /** @internal */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
