import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useChapterNavigation } from './useChapterNavigation';
import { ReaderProvider } from './context/ReaderProvider';
import { createMockBook, createMockVersion } from './__tests__/mocks/bibles';
import type { BibleBook, BibleChapter } from '@youversion/platform-core';

// -- helpers --
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

// Mock useBooks to return our test data
const mockUseBooks = vi.fn();
vi.mock('./useBooks', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useBooks: (...args: unknown[]) => mockUseBooks(...args),
}));

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

  it('navigateToNext within same book updates chapter only', () => {
    const { result } = renderHook(() => useChapterNavigation(), {
      wrapper: wrapper(genBook, genChapters[0]!),
    });

    expect(result.current.canNavigateNext).toBe(true);
    act(() => result.current.navigateToNext());
    expect(result.current.canNavigateNext).toBe(true);
  });

  it('navigateToNext cross-book updates both book and chapter', () => {
    const { result } = renderHook(() => useChapterNavigation(), {
      wrapper: wrapper(genBook, genChapters[49]!),
    });

    expect(result.current.canNavigateNext).toBe(true);
  });

  it('navigateToPrevious cross-book updates both book and chapter', () => {
    const { result } = renderHook(() => useChapterNavigation(), {
      wrapper: wrapper(exoBook, exoChapters[0]!),
    });

    expect(result.current.canNavigatePrevious).toBe(true);
  });

  it('navigateToPrevious to intro updates chapter to intro ID', () => {
    const { result } = renderHook(() => useChapterNavigation(), {
      wrapper: wrapper(genBook, genChapters[0]!),
    });

    expect(result.current.canNavigatePrevious).toBe(true);
  });

  it('canNavigatePrevious is false at Bible start', () => {
    const introChapter: BibleChapter = {
      id: 'INTRO',
      passage_id: 'GEN.INTRO',
      title: 'Intro',
    };

    const { result } = renderHook(() => useChapterNavigation(), {
      wrapper: wrapper(genBook, introChapter),
    });

    expect(result.current.canNavigatePrevious).toBe(false);
  });

  it('canNavigateNext is false at Bible end', () => {
    const { result } = renderHook(() => useChapterNavigation(), {
      wrapper: wrapper(revBook, revChapters[21]!),
    });

    expect(result.current.canNavigateNext).toBe(false);
  });

  it('both disabled while loading', () => {
    mockUseBooks.mockReturnValue({
      books: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useChapterNavigation(), {
      wrapper: wrapper(genBook, genChapters[0]!),
    });

    expect(result.current.canNavigateNext).toBe(false);
    expect(result.current.canNavigatePrevious).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});
