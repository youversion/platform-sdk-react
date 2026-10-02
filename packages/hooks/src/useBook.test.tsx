import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createMockBook } from './__tests__/mocks/bibles';
import { createBibleClientStub, createYVWrapper } from './test/utils';
import { useBook } from './useBook';

it('forwards and caches books by both version and book identifier', async () => {
  const genesis = createMockBook();
  const translated = createMockBook({ title: 'Translated Genesis' });
  const john = createMockBook({ id: 'JHN', title: 'John', canon: 'new_testament' });
  const getBook = vi
    .fn()
    .mockResolvedValueOnce(genesis)
    .mockResolvedValueOnce(translated)
    .mockResolvedValueOnce(john);
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getBook }),
  });
  const { result, rerender } = renderHook(({ version, book }) => useBook(version, book), {
    initialProps: { version: 111, book: 'GEN' },
    wrapper,
  });
  await waitFor(() => expect(result.current.book).toEqual(genesis));
  act(() => rerender({ version: 206, book: 'GEN' }));
  await waitFor(() => expect(result.current.book).toEqual(translated));
  act(() => rerender({ version: 206, book: 'JHN' }));
  await waitFor(() => expect(result.current.book).toEqual(john));
  expect(getBook.mock.calls).toEqual([
    [111, 'GEN'],
    [206, 'GEN'],
    [206, 'JHN'],
  ]);
});
