import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useChapterNavigation } from './useChapterNavigation';
import { useReaderContext } from './context/ReaderContext';
import { ReaderProvider } from './context/ReaderProvider';
import { createMockBook, createMockVersion } from './__tests__/mocks/bibles';
import type { BibleBook, BibleChapter } from '@youversion/platform-core';

function makeChapters(bookId: string, count: number): BibleChapter[] {
  return Array.from({ length: count }, (_, i) => ({
    id: (i + 1).toString(),
    passage_id: `${bookId}.${i + 1}`,
    title: (i + 1).toString(),
  }));
}

function useNavWithContext() {
  const nav = useChapterNavigation();
  const ctx = useReaderContext();
  return { nav, ctx };
}

function createWrapper(book: BibleBook, chapter: BibleChapter) {
  return ({ children }: { children: React.ReactNode }) => (
    <ReaderProvider
      currentVersion={createMockVersion()}
      currentBook={book}
      currentChapter={chapter}
      currentVerse={null}
    >
      {children}
    </ReaderProvider>
  );
}

const genChapters = makeChapters('GEN', 50);
const exoChapters = makeChapters('EXO', 40);
const revChapters = makeChapters('REV', 22);

const introChapter: BibleChapter = {
  id: 'INTRO',
  passage_id: 'GEN.INTRO',
  title: 'Intro',
};

const genBook = createMockBook({
  id: 'GEN',
  title: 'Genesis',
  chapters: genChapters,
  intro: { id: 'INTRO', passage_id: 'GEN.INTRO', title: 'Intro' },
});

const exoBook = createMockBook({
  id: 'EXO',
  title: 'Exodus',
  canon: 'old_testament',
  chapters: exoChapters,
});

const revBook = createMockBook({
  id: 'REV',
  title: 'Revelation',
  canon: 'new_testament',
  chapters: revChapters,
});

const allBooks: BibleBook[] = [genBook, exoBook, revBook];

const { mockUseBooks } = vi.hoisted(() => ({
  mockUseBooks: vi.fn(),
}));

vi.mock('./useBooks', () => ({
  useBooks: mockUseBooks,
}));

function setMockBooks(books: BibleBook[], loading = false) {
  mockUseBooks.mockReturnValue({
    books: { data: books },
    loading,
    error: null,
    refetch: vi.fn(),
  });
}

describe('useChapterNavigation', () => {
  beforeEach(() => {
    setMockBooks(allBooks);
  });

  it('canNavigatePrevious is false at Bible start (GEN INTRO)', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, introChapter),
    });

    expect(result.current.nav.canNavigatePrevious).toBe(false);
  });

  it('canNavigateNext is false at Bible end (REV last chapter)', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(revBook, revChapters[21]!),
    });

    expect(result.current.nav.canNavigateNext).toBe(false);
  });

  it('both canNavigatePrevious and canNavigateNext are true for middle chapter', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(exoBook, exoChapters[19]!),
    });

    expect(result.current.nav.canNavigatePrevious).toBe(true);
    expect(result.current.nav.canNavigateNext).toBe(true);
  });

  it('navigateToPrevious within same book decrements chapter', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, genChapters[4]!),
    });

    act(() => result.current.nav.navigateToPrevious());

    expect(result.current.ctx.currentChapter.id).toBe('4');
    expect(result.current.ctx.currentBook.id).toBe('GEN');
  });

  it('navigateToPrevious cross-book goes to last chapter of previous book', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(exoBook, exoChapters[0]!),
    });

    act(() => result.current.nav.navigateToPrevious());

    expect(result.current.ctx.currentBook.id).toBe('GEN');
    expect(result.current.ctx.currentChapter.id).toBe('50');
  });

  it('navigateToPrevious from first canonical chapter goes to intro', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, genChapters[0]!),
    });

    act(() => result.current.nav.navigateToPrevious());

    expect(result.current.ctx.currentChapter.id).toBe('INTRO');
    expect(result.current.ctx.currentBook.id).toBe('GEN');
  });

  it('navigateToNext within same book increments chapter', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, genChapters[0]!),
    });

    act(() => result.current.nav.navigateToNext());

    expect(result.current.ctx.currentChapter.id).toBe('2');
    expect(result.current.ctx.currentBook.id).toBe('GEN');
  });

  it('navigateToNext cross-book goes to first chapter of next book', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, genChapters[49]!),
    });

    act(() => result.current.nav.navigateToNext());

    expect(result.current.ctx.currentBook.id).toBe('EXO');
    expect(result.current.ctx.currentChapter.id).toBe('1');
  });

  it('navigateToNext from intro goes to chapter 1 of same book', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, introChapter),
    });

    act(() => result.current.nav.navigateToNext());

    expect(result.current.ctx.currentChapter.id).toBe('1');
    expect(result.current.ctx.currentBook.id).toBe('GEN');
  });

  it('isLoading is true and both canNavigate are false while loading', () => {
    setMockBooks([], true);

    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, genChapters[0]!),
    });

    expect(result.current.nav.isLoading).toBe(true);
    expect(result.current.nav.canNavigateNext).toBe(false);
    expect(result.current.nav.canNavigatePrevious).toBe(false);
  });

  it('empty books array disables navigation', () => {
    setMockBooks([]);

    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, genChapters[0]!),
    });

    expect(result.current.nav.canNavigateNext).toBe(false);
    expect(result.current.nav.canNavigatePrevious).toBe(false);
  });

  it('navigateToNext is no-op when books array is empty', () => {
    setMockBooks([]);

    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, genChapters[0]!),
    });

    act(() => result.current.nav.navigateToNext());

    expect(result.current.ctx.currentChapter.id).toBe('1');
    expect(result.current.ctx.currentBook.id).toBe('GEN');
  });

  it('currentChapterIndex reflects correct position for middle chapter', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, genChapters[9]!),
    });

    expect(result.current.nav.currentChapterIndex).toBe(9);
  });

  it('currentChapterIndex is -1 when chapter not in book chapters list', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, introChapter),
    });

    expect(result.current.nav.currentChapterIndex).toBe(-1);
  });

  it('navigateToNext is no-op at last book last chapter', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(revBook, revChapters[21]!),
    });

    act(() => result.current.nav.navigateToNext());

    expect(result.current.ctx.currentChapter.id).toBe('22');
    expect(result.current.ctx.currentBook.id).toBe('REV');
  });

  it('navigateToPrevious is no-op at absolute Bible start', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, introChapter),
    });

    act(() => result.current.nav.navigateToPrevious());

    expect(result.current.ctx.currentChapter.id).toBe('INTRO');
    expect(result.current.ctx.currentBook.id).toBe('GEN');
  });

  it('navigateToPrevious is no-op when books array is empty', () => {
    setMockBooks([]);

    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(genBook, genChapters[4]!),
    });

    act(() => result.current.nav.navigateToPrevious());

    expect(result.current.ctx.currentChapter.id).toBe('5');
    expect(result.current.ctx.currentBook.id).toBe('GEN');
  });

  it('currentChapterIndex is -1 when book has no chapters array', () => {
    const noChaptersBook = createMockBook({ id: 'GEN', chapters: undefined });
    setMockBooks([noChaptersBook]);

    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(noChaptersBook, genChapters[0]!),
    });

    expect(result.current.nav.currentChapterIndex).toBe(-1);
  });

  it('navigateToNext is no-op when next book has no canonical chapters', () => {
    const bookNoIntro = createMockBook({
      id: 'GEN',
      title: 'Genesis',
      chapters: genChapters,
      intro: undefined,
    });
    const bookWithMismatch = createMockBook({
      id: 'EXO',
      title: 'Exodus',
      chapters: [],
      intro: undefined,
    });
    setMockBooks([bookNoIntro, bookWithMismatch]);

    const { result } = renderHook(useNavWithContext, {
      wrapper: createWrapper(bookNoIntro, genChapters[49]!),
    });

    act(() => result.current.nav.navigateToNext());

    expect(result.current.ctx.currentBook.id).toBe('GEN');
    expect(result.current.ctx.currentChapter.id).toBe('50');
  });
});
