import { act, renderHook, waitFor } from '@testing-library/react';
import type { BibleChapter } from '@youversion/platform-core';
import { expect, it, vi } from 'vitest';
import { createBibleClientStub, createYVWrapper } from './test/utils';
import { useChapter } from './useChapter';

it('clears the previous chapter while an opted-out chapter change is pending', async () => {
  const first: BibleChapter = { id: '1', passage_id: 'MAT.1', title: 'Matthew 1' };
  const next: BibleChapter = { id: '2', passage_id: 'MAT.2', title: 'Matthew 2' };
  const pending = Promise.withResolvers<BibleChapter>();
  const getChapter = vi.fn().mockResolvedValueOnce(first).mockReturnValueOnce(pending.promise);
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getChapter }),
  });

  const { result, rerender } = renderHook(
    ({ chapter }: { chapter: number }) =>
      useChapter(111, 'MAT', chapter, { keepPreviousData: false }),
    { initialProps: { chapter: 1 }, wrapper },
  );
  await waitFor(() => expect(result.current.chapter).toEqual(first));

  act(() => rerender({ chapter: 2 }));
  expect(result.current.chapter).toBeNull();
  expect(result.current.loading).toBe(true);
  expect(getChapter).toHaveBeenLastCalledWith(111, 'MAT', 2);

  await act(async () => pending.resolve(next));
  await waitFor(() => expect(result.current.chapter).toEqual(next));
});
