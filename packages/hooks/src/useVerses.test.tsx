import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createBibleClientStub, createYVWrapper } from './test/utils';
import { useVerses } from './useVerses';

it('keys and forwards verse collections by version, book, and chapter', async () => {
  const first = { data: [{ id: '1', passage_id: 'JHN.3.1', title: '1' }], next_page_token: null };
  const translated = {
    data: [{ id: '1', passage_id: 'JHN.3.1', title: 'Translated verse' }],
    next_page_token: null,
  };
  const otherBook = {
    data: [{ id: '1', passage_id: 'MAT.3.1', title: '1' }],
    next_page_token: null,
  };
  const otherChapter = {
    data: [{ id: '1', passage_id: 'MAT.4.1', title: '1' }],
    next_page_token: null,
  };
  const getVerses = vi
    .fn()
    .mockResolvedValueOnce(first)
    .mockResolvedValueOnce(translated)
    .mockResolvedValueOnce(otherBook)
    .mockResolvedValueOnce(otherChapter);
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getVerses }),
  });
  const { result, rerender } = renderHook(
    ({ version, book, chapter }) => useVerses(version, book, chapter),
    { initialProps: { version: 111, book: 'JHN', chapter: 3 }, wrapper },
  );
  await waitFor(() => expect(result.current.verses).toEqual(first));
  act(() => rerender({ version: 206, book: 'JHN', chapter: 3 }));
  await waitFor(() => expect(result.current.verses).toEqual(translated));
  act(() => rerender({ version: 206, book: 'MAT', chapter: 3 }));
  await waitFor(() => expect(result.current.verses).toEqual(otherBook));
  act(() => rerender({ version: 206, book: 'MAT', chapter: 4 }));
  await waitFor(() => expect(result.current.verses).toEqual(otherChapter));
  expect(getVerses.mock.calls).toEqual([
    [111, 'JHN', 3],
    [206, 'JHN', 3],
    [206, 'MAT', 3],
    [206, 'MAT', 4],
  ]);
});
