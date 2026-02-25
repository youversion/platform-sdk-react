import type { BibleBook } from './schemas/book';
import type { BibleChapter } from './schemas/chapter';

type AdjacentChapterResult = { bookId: string; chapterId: string } | null;

function isIntroChapter(chapterId: string): boolean {
  return chapterId.toLowerCase().includes('intro');
}

/**
 * Computes the next or previous chapter across book boundaries.
 *
 * @param books - Ordered array of Bible books with populated chapters
 * @param currentBookId - USFM book ID (e.g., "JHN")
 * @param currentChapterId - Chapter ID string (e.g., "1", "INTRO")
 * @param direction - Navigation direction
 * @returns Target book and chapter IDs, or null at Bible boundaries
 */
export function getAdjacentChapter(
  books: BibleBook[],
  currentBookId: string,
  currentChapterId: string,
  direction: 'next' | 'previous',
): AdjacentChapterResult {
  if (books.length === 0) return null;

  const bookIndex = books.findIndex((b) => b.id === currentBookId);
  if (bookIndex === -1) return null;

  const book = books[bookIndex]!;
  const chapters: BibleChapter[] = book.chapters ?? [];

  return direction === 'next'
    ? getNext(books, bookIndex, book, chapters, currentChapterId)
    : getPrevious(books, bookIndex, book, chapters, currentChapterId);
}

function getNext(
  books: BibleBook[],
  bookIndex: number,
  book: BibleBook,
  chapters: BibleChapter[],
  currentChapterId: string,
): AdjacentChapterResult {
  // Next from intro → chapter 1 of same book
  if (isIntroChapter(currentChapterId)) {
    const firstCanonical = chapters.find((c) => !isIntroChapter(c.id));
    if (firstCanonical) {
      return { bookId: book.id, chapterId: firstCanonical.id };
    }
    // No canonical chapters — fall through to cross-book
  }

  if (!isIntroChapter(currentChapterId)) {
    const idx = chapters.findIndex((c) => c.id === currentChapterId);
    if (idx !== -1 && idx < chapters.length - 1) {
      const next = chapters[idx + 1]!;
      if (!isIntroChapter(next.id)) {
        return { bookId: book.id, chapterId: next.id };
      }
    }
  }

  // Cross-book: first non-intro chapter of next book
  const nextBook = books[bookIndex + 1];
  if (!nextBook) return null;

  const nextChapters: BibleChapter[] = nextBook.chapters ?? [];
  const firstCanonical = nextChapters.find((c) => !isIntroChapter(c.id));
  return firstCanonical ? { bookId: nextBook.id, chapterId: firstCanonical.id } : null;
}

function getPrevious(
  books: BibleBook[],
  bookIndex: number,
  book: BibleBook,
  chapters: BibleChapter[],
  currentChapterId: string,
): AdjacentChapterResult {
  // Previous from intro → last canonical chapter of previous book
  if (isIntroChapter(currentChapterId)) {
    return lastCanonicalOfPreviousBook(books, bookIndex);
  }

  const idx = chapters.findIndex((c) => c.id === currentChapterId);
  if (idx === -1) return null;

  // Determine if we're on the first canonical chapter
  const firstCanonicalIdx = chapters.findIndex((c) => !isIntroChapter(c.id));
  const isFirstCanonical = idx === firstCanonicalIdx;

  if (isFirstCanonical) {
    // If book has an intro, go to intro
    if (book.intro) {
      return { bookId: book.id, chapterId: book.intro.id };
    }
    // No intro → cross-book
    return lastCanonicalOfPreviousBook(books, bookIndex);
  }

  // Not at first canonical — go to previous chapter in same book
  if (idx > 0) {
    return { bookId: book.id, chapterId: chapters[idx - 1]!.id };
  }

  return null;
}

function lastCanonicalOfPreviousBook(books: BibleBook[], bookIndex: number): AdjacentChapterResult {
  const prevBook = books[bookIndex - 1];
  if (!prevBook) return null;

  const prevChapters: BibleChapter[] = prevBook.chapters ?? [];
  for (let i = prevChapters.length - 1; i >= 0; i--) {
    const ch = prevChapters[i]!;
    if (!isIntroChapter(ch.id)) {
      return { bookId: prevBook.id, chapterId: ch.id };
    }
  }
  return null;
}
