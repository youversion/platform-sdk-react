import type { BibleBook, BibleChapter, BibleVerse, BibleVersion } from '@youversion/platform-core';

export interface ReaderProviderOptions {
  currentVersion?: BibleVersion;
  currentBook?: BibleBook;
  currentChapter?: BibleChapter;
  currentVerse?: BibleVerse | null;
}
