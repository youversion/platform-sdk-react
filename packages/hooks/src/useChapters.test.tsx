import { renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useChapters } from './useChapters';
import { createBibleClientStub, createYVWrapper } from './test/utils';

it('does not request sentinel book values and starts once the book becomes valid', async () => {
  const getChapters = vi.fn().mockResolvedValue({ data: [], next_page_token: null });
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getChapters }),
  });
  const { rerender } = renderHook(({ book }) => useChapters(1, book), {
    wrapper,
    initialProps: { book: 'undefined' },
  });

  expect(getChapters).not.toHaveBeenCalled();
  rerender({ book: 'MAT' });

  await waitFor(() => expect(getChapters).toHaveBeenCalledWith(1, 'MAT'));
});
