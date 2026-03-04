import type { BibleBook, BibleChapter, BibleVersion } from '@youversion/platform-core';
import { DEFAULT_LICENSE_FREE_BIBLE_VERSION } from '@youversion/platform-core';
import { useBook } from './useBook';
import { useChapter } from './useChapter';
import { useVersion } from './useVersion';

export const DEFAULT = {
  VERSION: DEFAULT_LICENSE_FREE_BIBLE_VERSION,
  BOOK: 'GEN',
  CHAPTER: 1,
} as const;

interface Props {
  version: number;
  book: string;
  chapter: number;
}

interface InitData {
  version: BibleVersion;
  book: BibleBook;
  chapter: BibleChapter;
}

/**
 * @deprecated This hook will be removed in the next major version.
 * Use `useVersion`, `useBook`, and `useChapter` directly instead.
 */
export function useInitData(
  { version, book, chapter }: Props = {
    version: DEFAULT.VERSION,
    book: DEFAULT.BOOK,
    chapter: DEFAULT.CHAPTER,
  },
): {
  loading: boolean;
  error: string | null;
  data: InitData | null;
} {
  const {
    version: versionData,
    loading: versionLoading,
    error: versionError,
  } = useVersion(version);
  const { book: bookData, loading: bookLoading, error: bookError } = useBook(version, book);
  const {
    chapter: chapterData,
    loading: chapterLoading,
    error: chapterError,
  } = useChapter(version, book, chapter);

  const allDataAvailable = versionData && bookData && chapterData;

  return {
    loading: versionLoading || bookLoading || chapterLoading,
    error: [versionError, bookError, chapterError].filter(Boolean).join(' '),
    data: allDataAvailable ? { version: versionData, book: bookData, chapter: chapterData } : null,
  };
}
