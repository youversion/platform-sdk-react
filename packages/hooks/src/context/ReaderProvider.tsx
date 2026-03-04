'use client';

import { type PropsWithChildren, useState } from 'react';
import { ReaderContext } from './ReaderContext';
import type { BibleBook, BibleChapter, BibleVerse, BibleVersion } from '@youversion/platform-core';

type ReaderProviderProps = {
  currentVersion: BibleVersion;
  currentChapter: BibleChapter;
  currentBook: BibleBook;
  currentVerse: BibleVerse | null;
};

/**
 * @deprecated No replacement needed. Remove usage. Will be removed in the next major version.
 */
export function ReaderProvider(props: PropsWithChildren<ReaderProviderProps>): React.ReactElement {
  const [currentVersion, setCurrentVersion] = useState<BibleVersion>(props.currentVersion);
  const [currentBook, setCurrentBook] = useState<BibleBook>(props.currentBook);
  const [currentChapter, setCurrentChapter] = useState<BibleChapter>(props.currentChapter);
  const [currentVerse, setCurrentVerse] = useState<BibleVerse | null>(props.currentVerse);

  return (
    <ReaderContext.Provider
      value={{
        currentVersion,
        currentBook,
        currentChapter,
        currentVerse,
        setVersion: setCurrentVersion,
        setChapter: setCurrentChapter,
        setBook: setCurrentBook,
        setVerse: setCurrentVerse,
      }}
    >
      {props.children}
    </ReaderContext.Provider>
  );
}
