import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
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
            subtopics: [...(options?.fields ?? [])],
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
  const initialProps: UseUnifiedSearchProps = {
    query: '',
    versionId: 1,
    languageRanges: ['en'],
  };
  const { result, rerender } = renderHook(
    (props: UseUnifiedSearchProps) => useUnifiedSearch(props),
    {
      wrapper,
      initialProps,
    },
  );
  expect(result.current).toMatchObject({ data: null, loading: false, error: null });
  let props: UseUnifiedSearchProps = { ...initialProps, query: 'faith' };
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
            subtopics: [...(props.fields ?? [])],
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
  rerender({ ...props, query: '   ' });
  expect(result.current).toMatchObject({ data: null, loading: false, error: null });

  const snapshot: SearchUnifiedResponse = {
    verses: [],
    topics: [],
    images: [],
    didYouMean: ['override'],
    searchInsteadFor: null,
  };
  const overridden = renderHook(
    () =>
      useUnifiedSearch({
        query: 'faith',
        versionId: 1,
        languageRanges: ['en'],
      }),
    {
      wrapper: createYVWrapper('override-app', {
        searchClient,
        hookOverrides: {
          useUnifiedSearch: () => ({ data: snapshot, loading: false, error: null, refetch() {} }),
        },
      }),
    },
  );
  expect(overridden.result.current.data).toEqual(snapshot);
});

it('preserves the loading contract across a query change', async () => {
  const first: SearchUnifiedResponse = {
    verses: [{ id: 'JHN.3.16' }],
    topics: [{ id: null, text: 'faith', subtopics: [] }],
    images: [],
    didYouMean: [],
    searchInsteadFor: null,
  };
  const next: SearchUnifiedResponse = {
    verses: [{ id: 'ROM.8.28' }],
    topics: [{ id: null, text: 'hope', subtopics: [] }],
    images: [],
    didYouMean: [],
    searchInsteadFor: null,
  };
  const pending = Promise.withResolvers<SearchUnifiedResponse>();
  const searchUnified = vi.fn().mockResolvedValueOnce(first).mockReturnValueOnce(pending.promise);
  const wrapper = createYVWrapper('test-app', {
    searchClient: createSearchClientStub({ searchUnified }),
  });

  const { result, rerender } = renderHook(
    ({ query }: { query: string }) =>
      useUnifiedSearch({ query, versionId: 111, languageRanges: ['en'] }),
    { initialProps: { query: 'faith' }, wrapper },
  );
  await waitFor(() => expect(result.current.data).toEqual(first));

  act(() => rerender({ query: 'hope' }));
  expect(result.current.data).toEqual(first);
  expect(result.current.loading).toBe(true);
  expect(searchUnified).toHaveBeenLastCalledWith('hope', 111, ['en'], {});

  await act(async () => pending.resolve(next));
  await waitFor(() => expect(result.current.data).toEqual(next));
});
