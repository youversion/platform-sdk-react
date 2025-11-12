import { useReaderContext } from './context/ReaderContext';
import { useChapters } from './useChapters';

interface UseChapterNavigationResult {
  canNavigatePrevious: boolean;
  canNavigateNext: boolean;
  navigateToPrevious: () => void;
  navigateToNext: () => void;
  currentChapterIndex: number;
  isLoading: boolean;
}

/**
 * Provides navigation functionality for chapters within a book, allowing the user to move
 * to the previous or next chapter, as well as access additional chapter navigation metadata.
 *
 * @return {UseChapterNavigationResult} An object containing properties and methods for chapter navigation:
 * - `canNavigatePrevious` (boolean): Indicates whether navigating to the previous chapter is possible.
 * - `canNavigateNext` (boolean): Indicates whether navigating to the next chapter is possible.
 * - `navigateToPrevious` (function): Moves to the previous chapter if possible.
 * - `navigateToNext` (function): Moves to the next chapter if possible.
 * - `currentChapterIndex` (number): The index of the current chapter within the list of chapters.
 * - `isLoading` (boolean): Whether the chapter data is still loading.
 */
export function useChapterNavigation(): UseChapterNavigationResult {
  const { currentChapter, currentVersion, currentBook, setChapter } = useReaderContext();

  const bookIdentifier = currentBook?.id ?? '';

  const { chapters, loading: chaptersLoading } = useChapters(
    currentVersion?.id ?? 0,
    bookIdentifier,
    { enabled: Boolean(bookIdentifier && currentVersion?.id) },
  );

  const currentChapterIndex = chapters?.data.findIndex((c) => c.id === currentChapter.id) ?? -1;

  const canNavigatePrevious = Boolean(
    !chaptersLoading && chapters?.data && currentChapterIndex !== -1 && currentChapterIndex > 0,
  );

  const canNavigateNext = Boolean(
    !chaptersLoading &&
      chapters?.data &&
      currentChapterIndex !== -1 &&
      currentChapterIndex < chapters.data.length - 1,
  );

  const navigateToPrevious = () => {
    if (canNavigatePrevious && chapters?.data) {
      const previousChapter = chapters.data[currentChapterIndex - 1];
      if (previousChapter) {
        // Use the chapter as-is since it already has all required fields
        setChapter(previousChapter);
      }
    }
  };

  const navigateToNext = () => {
    if (canNavigateNext && chapters?.data) {
      const nextChapter = chapters.data[currentChapterIndex + 1];
      if (nextChapter) {
        // Use the chapter as-is since it already has all required fields
        setChapter(nextChapter);
      }
    }
  };

  return {
    canNavigatePrevious,
    canNavigateNext,
    navigateToPrevious,
    navigateToNext,
    currentChapterIndex,
    isLoading: chaptersLoading,
  };
}
