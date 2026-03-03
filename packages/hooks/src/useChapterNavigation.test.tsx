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

const genChapters = makeChapters('GEN', 50);
const exoChapters = makeChapters('EXO', 40);
const revChapters = makeChapters('REV', 22);

const mockBooks: BibleBook[] = [
  createMockBook({
    id: 'GEN',
    title: 'Genesis',
    chapters: genChapters,
    intro: { id: 'INTRO', passage_id: 'GEN.INTRO', title: 'Intro' },
  }),
  createMockBook({
    id: 'EXO',
    title: 'Exodus',
    canon: 'old_testament',
    chapters: exoChapters,
  }),
  createMockBook({
    id: 'REV',
    title: 'Revelation',
    canon: 'new_testament',
    chapters: revChapters,
  }),
];

const { mockUseBooks } = vi.hoisted(() => ({
  mockUseBooks: vi.fn(),
}));
vi.mock('./useBooks', () => ({
  useBooks: mockUseBooks,
}));

function useNavWithContext() {
  const nav = useChapterNavigation();
  const ctx = useReaderContext();
  return { nav, ctx };
}

function wrapper(book: BibleBook, chapter: BibleChapter) {
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

const genBook = mockBooks[0]!;
const exoBook = mockBooks[1]!;
const revBook = mockBooks[2]!;

describe('useChapterNavigation', () => {
  beforeEach(() => {
    mockUseBooks.mockReturnValue({
      books: { data: mockBooks },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('navigateToNext within same book updates chapter, keeps book', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: wrapper(genBook, genChapters[0]!),
    });

    act(() => result.current.nav.navigateToNext());

    expect(result.current.ctx.currentChapter.id).toBe('2');
    expect(result.current.ctx.currentBook.id).toBe('GEN');
  });

  it('navigateToNext cross-book updates both book and chapter', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: wrapper(genBook, genChapters.at(-1)!),
    });

    act(() => result.current.nav.navigateToNext());

    expect(result.current.ctx.currentBook.id).toBe('EXO');
    expect(result.current.ctx.currentChapter.id).toBe('1');
  });

  it('navigateToPrevious to intro sets chapter to INTRO, keeps book', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: wrapper(genBook, genChapters[0]!),
    });

    act(() => result.current.nav.navigateToPrevious());

    expect(result.current.ctx.currentChapter.id).toBe('INTRO');
    expect(result.current.ctx.currentBook.id).toBe('GEN');
  });

  it('navigateToPrevious cross-book updates both book and chapter', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: wrapper(exoBook, exoChapters[0]!),
    });

    act(() => result.current.nav.navigateToPrevious());

    expect(result.current.ctx.currentBook.id).toBe('GEN');
    expect(result.current.ctx.currentChapter.id).toBe('50');
  });

  it('canNavigatePrevious is false at Bible start', () => {
    const introChapter: BibleChapter = { id: 'INTRO', passage_id: 'GEN.INTRO', title: 'Intro' };

    const { result } = renderHook(useNavWithContext, {
      wrapper: wrapper(genBook, introChapter),
    });

    expect(result.current.nav.canNavigatePrevious).toBe(false);
  });

  it('canNavigateNext is false at Bible end', () => {
    const { result } = renderHook(useNavWithContext, {
      wrapper: wrapper(revBook, revChapters[21]!),
    });

    expect(result.current.nav.canNavigateNext).toBe(false);
  });

  it('both disabled while loading', () => {
    mockUseBooks.mockReturnValue({
      books: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(useNavWithContext, {
      wrapper: wrapper(genBook, genChapters[0]!),
    });

    expect(result.current.nav.canNavigateNext).toBe(false);
    expect(result.current.nav.canNavigatePrevious).toBe(false);
    expect(result.current.nav.isLoading).toBe(true);
  });
});
