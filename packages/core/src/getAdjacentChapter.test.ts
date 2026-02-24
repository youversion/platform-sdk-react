import { describe, it, expect } from 'vitest';
import { getAdjacentChapter } from './getAdjacentChapter';
import type { BibleBook } from './schemas/book';

function makeBook(
  id: string,
  chapterCount: number,
  opts?: { hasIntro?: boolean; introInChapters?: boolean },
): BibleBook {
  const chapters = [];

  if (opts?.introInChapters) {
    chapters.push({ id: 'INTRO', passage_id: `${id}.INTRO`, title: 'Intro' });
  }

  for (let i = 1; i <= chapterCount; i++) {
    chapters.push({ id: i.toString(), passage_id: `${id}.${i}`, title: i.toString() });
  }

  return {
    id,
    title: id,
    full_title: id,
    canon: 'old_testament',
    chapters,
    ...(opts?.hasIntro
      ? { intro: { id: 'INTRO', passage_id: `${id}.INTRO`, title: 'Intro' } }
      : {}),
  } as BibleBook;
}

const GEN = makeBook('GEN', 50, { hasIntro: true });
const EXO = makeBook('EXO', 40, { hasIntro: true });
const LEV = makeBook('LEV', 27);
const REV = makeBook('REV', 22);
const books: BibleBook[] = [GEN, EXO, LEV, REV];

describe('getAdjacentChapter', () => {
  it('next chapter within same book', () => {
    expect(getAdjacentChapter(books, 'GEN', '1', 'next')).toEqual({
      bookId: 'GEN',
      chapterId: '2',
    });
  });

  it('next chapter cross-book, skipping intro', () => {
    expect(getAdjacentChapter(books, 'GEN', '50', 'next')).toEqual({
      bookId: 'EXO',
      chapterId: '1',
    });
  });

  it('next chapter at Bible end returns null', () => {
    expect(getAdjacentChapter(books, 'REV', '22', 'next')).toBeNull();
  });

  it('next from intro → chapter 1 of same book', () => {
    expect(getAdjacentChapter(books, 'GEN', 'INTRO', 'next')).toEqual({
      bookId: 'GEN',
      chapterId: '1',
    });
  });

  it('previous chapter within same book', () => {
    expect(getAdjacentChapter(books, 'GEN', '3', 'previous')).toEqual({
      bookId: 'GEN',
      chapterId: '2',
    });
  });

  it('previous from chapter 1 when book has intro → intro of same book', () => {
    expect(getAdjacentChapter(books, 'GEN', '1', 'previous')).toEqual({
      bookId: 'GEN',
      chapterId: 'INTRO',
    });
  });

  it('previous from chapter 1 when book has no intro → last canonical of previous book', () => {
    expect(getAdjacentChapter(books, 'LEV', '1', 'previous')).toEqual({
      bookId: 'EXO',
      chapterId: '40',
    });
  });

  it('previous from intro → last canonical of previous book', () => {
    expect(getAdjacentChapter(books, 'EXO', 'INTRO', 'previous')).toEqual({
      bookId: 'GEN',
      chapterId: '50',
    });
  });

  it('previous at Bible start returns null', () => {
    expect(getAdjacentChapter(books, 'GEN', 'INTRO', 'previous')).toBeNull();
  });

  it('previous at Bible start (chapter 1, no intro)', () => {
    const booksNoIntro = [makeBook('GEN', 50), makeBook('EXO', 40)];
    expect(getAdjacentChapter(booksNoIntro, 'GEN', '1', 'previous')).toBeNull();
  });

  it('empty books array returns null', () => {
    expect(getAdjacentChapter([], 'GEN', '1', 'next')).toBeNull();
  });

  it('current book not found returns null', () => {
    expect(getAdjacentChapter(books, 'FAKE', '1', 'next')).toBeNull();
  });

  it('handles intro chapter present in chapters array for next', () => {
    const booksWithIntroInArray = [
      makeBook('GEN', 50, { hasIntro: true, introInChapters: true }),
      makeBook('EXO', 40),
    ];
    expect(getAdjacentChapter(booksWithIntroInArray, 'GEN', 'INTRO', 'next')).toEqual({
      bookId: 'GEN',
      chapterId: '1',
    });
  });

  it('handles intro chapter present in chapters array for previous', () => {
    const booksWithIntroInArray = [
      makeBook('GEN', 50, { hasIntro: true, introInChapters: true }),
      makeBook('EXO', 40, { hasIntro: true, introInChapters: true }),
    ];
    expect(getAdjacentChapter(booksWithIntroInArray, 'EXO', '1', 'previous')).toEqual({
      bookId: 'EXO',
      chapterId: 'INTRO',
    });
  });

  it('cross-book next skips intro in chapters array of next book', () => {
    const booksWithIntroInArray = [
      makeBook('GEN', 50),
      makeBook('EXO', 40, { hasIntro: true, introInChapters: true }),
    ];
    expect(getAdjacentChapter(booksWithIntroInArray, 'GEN', '50', 'next')).toEqual({
      bookId: 'EXO',
      chapterId: '1',
    });
  });

  it('cross-book previous from book without intro goes to last chapter of previous book', () => {
    const mixed = [
      makeBook('GEN', 50, { hasIntro: true }),
      makeBook('EXO', 40),
      makeBook('LEV', 27, { hasIntro: true }),
    ];
    expect(getAdjacentChapter(mixed, 'EXO', '1', 'previous')).toEqual({
      bookId: 'GEN',
      chapterId: '50',
    });
  });
});
