import { renderHook } from '@testing-library/react';
import { BibleClient } from '@youversion/platform-core';
import { expect, it } from 'vitest';
import { createBibleClientStub, createYVWrapper } from './test/utils';
import { useBibleClient } from './useBibleClient';

it('keeps the constructed Bible client stable and honors the supplied client', () => {
  const { result, rerender } = renderHook(() => useBibleClient(), {
    wrapper: createYVWrapper(),
  });
  const client = result.current;
  expect(client).toBeInstanceOf(BibleClient);
  rerender();
  expect(result.current).toBe(client);

  const supplied = createBibleClientStub({});
  const overridden = renderHook(() => useBibleClient(), {
    wrapper: createYVWrapper('test-app-key', { bibleClient: supplied }),
  });
  expect(overridden.result.current).toBe(supplied);
});
