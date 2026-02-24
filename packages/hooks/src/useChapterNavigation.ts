'use client';

import { getAdjacentChapter } from '@youversion/platform-core';
import { useReaderContext } from './context/ReaderContext';
import { useBooks } from './useBooks';

interface UseChapterNavigationResult {
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
  navigateToPrevious: () => void;
  navigateToNext: () => void;
  currentChapterIndex: number;
  isLoading: boolean;
}

/**
 * Provides navigation functionality for chapters across book boundaries,
 * including intro chapter support.
 *
 * @return {UseChapterNavigationResult} An object containing properties and methods for chapter navigation:
 * - `canNavigatePrevious` (boolean): Indicates whether navigating to the previous chapter is possible.
 * - `canNavigateNext` (boolean): Indicates whether navigating to the next chapter is possible.
 * - `navigateToPrevious` (function): Moves to the previous chapter if possible.
 * - `navigateToNext` (function): Moves to the next chapter if possible.
 * - `currentChapterIndex` (number): The index of the current chapter within the list of chapters.
 * - `isLoading` (boolean): Whether the book data is still loading.
 */
export function useChapterNavigation(): UseChapterNavigationResult {
  const { currentChapter, currentVersion, currentBook, setChapter, setBook } = useReaderContext();

  const { books, loading: booksLoading } = useBooks(currentVersion?.id ?? 0, {
    enabled: Boolean(currentVersion?.id),
  });

  const booksData = books?.data ?? [];
  const bookId = currentBook?.id ?? '';
  const chapterId = currentChapter?.id ?? '';

  const nextResult = getAdjacentChapter(booksData, bookId, chapterId, 'next');
  const prevResult = getAdjacentChapter(booksData, bookId, chapterId, 'previous');

  const canNavigateNext = !booksLoading && nextResult !== null;
  const canNavigatePrevious = !booksLoading && prevResult !== null;

  const currentChapterIndex =
    currentBook?.chapters?.findIndex((c) => c.id === currentChapter?.id) ?? -1;

  const navigate = (result: { bookId: string; chapterId: string } | null) => {
    if (!result || !booksData.length) return;

    const targetBook = booksData.find((b) => b.id === result.bookId);
    if (!targetBook) return;

    const targetChapter =
      targetBook.chapters?.find((c) => c.id === result.chapterId) ??
      (targetBook.intro?.id === result.chapterId
        ? {
            id: targetBook.intro.id,
            passage_id: targetBook.intro.passage_id,
            title: targetBook.intro.title,
          }
        : undefined);
    if (!targetChapter) return;

    if (targetBook.id !== currentBook?.id) {
      setBook(targetBook);
    }
    setChapter(targetChapter);
  };

  const navigateToNext = () => navigate(nextResult);
  const navigateToPrevious = () => navigate(prevResult);

  return {
    canNavigatePrevious,
    canNavigateNext,
    navigateToPrevious,
    navigateToNext,
    currentChapterIndex,
    isLoading: booksLoading,
  };
}
