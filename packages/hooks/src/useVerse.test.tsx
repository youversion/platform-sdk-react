import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createBibleClientStub, createYVWrapper } from './test/utils';
import { useVerse } from './useVerse';

it('keys and forwards every part of a verse request', async () => {
  const first = { id: '16', passage_id: 'JHN.3.16', title: '16' };
  const translated = { ...first, title: 'Translated verse 16' };
  const otherBook = { id: '16', passage_id: 'MAT.3.16', title: '16' };
  const otherChapter = { id: '16', passage_id: 'MAT.4.16', title: '16' };
  const otherVerse = { id: '17', passage_id: 'MAT.4.17', title: '17' };
  const getVerse = vi
    .fn()
    .mockResolvedValueOnce(first)
    .mockResolvedValueOnce(translated)
    .mockResolvedValueOnce(otherBook)
    .mockResolvedValueOnce(otherChapter)
    .mockResolvedValueOnce(otherVerse);
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getVerse }),
  });
  const { result, rerender } = renderHook(
    ({ version, book, chapter, verse }) => useVerse(version, book, chapter, verse),
    { initialProps: { version: 111, book: 'JHN', chapter: 3, verse: 16 }, wrapper },
  );
  await waitFor(() => expect(result.current.verse).toEqual(first));
  act(() => rerender({ version: 206, book: 'JHN', chapter: 3, verse: 16 }));
  await waitFor(() => expect(result.current.verse).toEqual(translated));
  act(() => rerender({ version: 206, book: 'MAT', chapter: 3, verse: 16 }));
  await waitFor(() => expect(result.current.verse).toEqual(otherBook));
  act(() => rerender({ version: 206, book: 'MAT', chapter: 4, verse: 16 }));
  await waitFor(() => expect(result.current.verse).toEqual(otherChapter));
  act(() => rerender({ version: 206, book: 'MAT', chapter: 4, verse: 17 }));
  await waitFor(() => expect(result.current.verse).toEqual(otherVerse));
  expect(getVerse.mock.calls).toEqual([
    [111, 'JHN', 3, 16],
    [206, 'JHN', 3, 16],
    [206, 'MAT', 3, 16],
    [206, 'MAT', 4, 16],
    [206, 'MAT', 4, 17],
  ]);
});
