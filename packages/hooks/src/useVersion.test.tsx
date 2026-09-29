import { act, renderHook, waitFor } from '@testing-library/react';
import type { BibleVersion } from '@youversion/platform-core';
import { expect, it, vi } from 'vitest';
import { createBibleClientStub, createYVWrapper } from './test/utils';
import { useVersion } from './useVersion';

function version(id: number): BibleVersion {
  return {
    id,
    title: `Version ${id}`,
    localized_title: `Version ${id}`,
    abbreviation: `V${id}`,
    localized_abbreviation: `V${id}`,
    language_tag: 'en',
    books: [],
    youversion_deep_link: `https://www.bible.com/versions/${id}`,
  };
}

it('keys and forwards changing version identifiers', async () => {
  const getVersion = vi.fn(async (id: number) => version(id));
  const wrapper = createYVWrapper('test-app-key', {
    bibleClient: createBibleClientStub({ getVersion }),
  });
  const { result, rerender } = renderHook(({ id }) => useVersion(id), {
    initialProps: { id: 111 },
    wrapper,
  });
  await waitFor(() => expect(result.current.version?.id).toBe(111));

  act(() => rerender({ id: 222 }));

  await waitFor(() => expect(result.current.version?.id).toBe(222));
  expect(getVersion.mock.calls.map(([id]) => id)).toEqual([111, 222]);
});
