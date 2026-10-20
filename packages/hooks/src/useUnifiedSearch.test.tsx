import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import type { SearchUnifiedResponse } from '@youversion/platform-core';
import { useUnifiedSearch, type UseUnifiedSearchProps } from './index';
import { createSearchClientStub, createYVWrapper } from './test/utils';

it('loads distinct snapshots for every search input and supports disabling, error recovery, and overrides', async () => {
  let fail = false;
  const searchClient = createSearchClientStub({
    async searchUnified(query, versionId, languageRanges, options) {
      if (fail) throw new Error('unavailable');
      if (options?.fields?.includes('images')) {
        return {
          verses: [],
          topics: [],
          images: [{ id: 'hope-image', passageId: 'PSA.23.1' }],
          userIntent: options.userIntent,
          didYouMean: [],
          searchInsteadFor: null,
        };
      }
      return {
        verses: [{ id: `JHN.3.${versionId}` }],
        topics: [
          {
            id: null,
            text: `${query}:${languageRanges.toString()}`,
            subtopics: options?.fields ?? [],
          },
        ],
        images: [],
        userIntent: options?.userIntent,
        didYouMean: [],
        searchInsteadFor: null,
      };
    },
  });
  const wrapper = createYVWrapper('test-app', { searchClient });
  const initialProps: UseUnifiedSearchProps & { enabled: boolean } = {
    query: 'faith',
    versionId: 1,
    languageRanges: ['en'],
    enabled: false,
  };
  const { result, rerender } = renderHook(
    ({ enabled, ...props }) => useUnifiedSearch(props, { enabled }),
    { wrapper, initialProps },
  );
  expect(result.current).toMatchObject({ data: null, loading: false, error: null });
  let props = { ...initialProps, enabled: true };
  rerender(props);
  await waitFor(() => expect(result.current.data?.topics[0]?.text).toBe('faith:en'));
  const changes: Partial<UseUnifiedSearchProps>[] = [
    { query: 'hope' },
    { versionId: 2 },
    { languageRanges: ['es'] },
    { fields: ['topics'] },
    { userIntent: 'topical' },
  ];
  for (const change of changes) {
    props = { ...props, ...change };
    rerender(props);
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual({
        verses: [{ id: `JHN.3.${props.versionId}` }],
        topics: [
          {
            id: null,
            text: `${props.query}:${props.languageRanges.toString()}`,
            subtopics: props.fields ?? [],
          },
        ],
        images: [],
        userIntent: props.userIntent,
        didYouMean: [],
        searchInsteadFor: null,
      });
    });
  }
  props = { ...props, fields: ['images'] };
  rerender(props);
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual({
      verses: [],
      topics: [],
      images: [{ id: 'hope-image', passageId: 'PSA.23.1' }],
      userIntent: 'topical',
      didYouMean: [],
      searchInsteadFor: null,
    });
  });
  fail = true;
  act(() => result.current.refetch());
  await waitFor(() => expect(result.current.error?.message).toBe('unavailable'));
  fail = false;
  act(() => result.current.refetch());
  await waitFor(() => expect(result.current.error).toBeNull());
  rerender({ ...props, enabled: false });
  expect(result.current).toMatchObject({ data: null, loading: false, error: null });

  const snapshot: SearchUnifiedResponse = {
    verses: [],
    topics: [],
    images: [],
    didYouMean: ['override'],
    searchInsteadFor: null,
  };
  const overridden = renderHook(() => useUnifiedSearch(initialProps), {
    wrapper: createYVWrapper('override-app', {
      searchClient,
      hookOverrides: {
        useUnifiedSearch: () => ({ data: snapshot, loading: false, error: null, refetch() {} }),
      },
    }),
  });
  expect(overridden.result.current.data).toEqual(snapshot);
});
