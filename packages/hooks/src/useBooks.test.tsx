import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { createMockBook } from './__tests__/mocks/bibles';
import { createBibleClientStub, createYVWrapper } from './test/utils';
import { useBooks } from './useBooks';

it('keeps book collections separate across Bible versions', async () => {
  const first = { data: [createMockBook()], next_page_token: null };
  const next = { data: [createMockBook({ title: 'Translated Genesis' })], next_page_token: null };
  const getBooks = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(next);
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getBooks }),
  });
  const { result, rerender } = renderHook(({ version }) => useBooks(version), {
    initialProps: { version: 111 },
    wrapper,
  });
  await waitFor(() => expect(result.current.books).toEqual(first));
  act(() => rerender({ version: 206 }));
  await waitFor(() => expect(result.current.books).toEqual(next));
  expect(getBooks.mock.calls).toEqual([[111], [206]]);
});
