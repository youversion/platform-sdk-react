import { renderHook } from '@testing-library/react';
import { SearchClient } from '@youversion/platform-core';
import { expect, it } from 'vitest';
import { createYVWrapper } from './test/utils';
import { useSearchClient } from './useSearchClient';

it('keeps the constructed search client stable across rerenders', () => {
  const { result, rerender } = renderHook(() => useSearchClient(), {
    wrapper: createYVWrapper(),
  });
  const client = result.current;
  expect(client).toBeInstanceOf(SearchClient);

  rerender();
  expect(result.current).toBe(client);
});
