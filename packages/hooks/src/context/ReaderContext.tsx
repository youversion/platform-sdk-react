'use client';

import { createContext, useContext } from 'react';
import type { BibleBook, BibleChapter, BibleVerse, BibleVersion } from '@youversion/platform-core';

type ReaderContextData = {
  currentVersion: BibleVersion;
  currentChapter: BibleChapter;
  currentBook: BibleBook;
  currentVerse: BibleVerse | null;
  setVersion: (version: BibleVersion) => void;
  setChapter: (chapter: BibleChapter) => void;
  setBook: (book: BibleBook) => void;
  setVerse: (verse: BibleVerse | null) => void;
};

/**
 * @deprecated No replacement needed. Remove usage. Will be removed in the next major version.
 */
export const ReaderContext = createContext<ReaderContextData | null>(null);

/**
 * @deprecated No replacement needed. Remove usage. Will be removed in the next major version.
 */
export function useReaderContext(): ReaderContextData {
  const context = useContext(ReaderContext);

  if (!context) {
    throw new Error('useReaderContext() must be used within a ReaderProvider');
  }

  return context;
}
