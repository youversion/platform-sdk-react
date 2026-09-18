/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BibleVersion, SearchQueries, SearchVersesResponse } from '@youversion/platform-core';
import { useBibleSearch, type UseBibleSearchResult } from './useBibleSearch';
import {
  SEARCH_SUGGESTION_DEBOUNCE_MS,
  SEARCH_VERSES_PAGE_SIZE,
} from './internal/bible-search-session';
import { createBibleClientStub, createSearchClientStub, createYVWrapper } from './test/utils';

const mockVersion: BibleVersion = {
  id: 111,
  title: 'New International Version',
  abbreviation: 'NIV',
  localized_title: 'New International Version',
  localized_abbreviation: 'NIV',
  language_tag: 'en',
  books: ['GEN', 'EXO', 'LEV'],
  youversion_deep_link: 'https://bible.com/versions/111',
};

const trending: SearchQueries = { queries: [{ text: 'love' }, { text: 'hope' }] };
const suggestions: SearchQueries = { queries: [{ text: 'love of God' }] };

function versesPage(ids: readonly string[], nextPageToken: string | null): SearchVersesResponse {
  return {
    verses: ids.map((id) => ({ id })),
    didYouMean: [],
    searchInsteadFor: null,
    nextPageToken,
  };
}

async function settleDebounce(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, SEARCH_SUGGESTION_DEBOUNCE_MS + 20);
    });
  });
}

function createSearchFixture() {
  const mockGetVersion = vi.fn().mockResolvedValue(mockVersion);
  const mockGetTrendingQueries = vi.fn().mockResolvedValue(trending);
  const mockGetSuggestedQueries = vi.fn().mockResolvedValue(suggestions);
  const mockSearchVerses = vi.fn().mockResolvedValue(versesPage(['JHN.3.16'], 'page-2'));

  const bibleClient = createBibleClientStub({ getVersion: mockGetVersion });
  const searchClient = createSearchClientStub({
    getTrendingQueries: mockGetTrendingQueries,
    getSuggestedQueries: mockGetSuggestedQueries,
    searchVerses: mockSearchVerses,
  });
  const wrapper = createYVWrapper('test-app-key', { bibleClient, searchClient });

  return {
    wrapper,
    bibleClient,
    searchClient,
    mockGetVersion,
    mockGetTrendingQueries,
    mockGetSuggestedQueries,
    mockSearchVerses,
  };
}

describe('useBibleSearch', () => {
  it('resubmits failed and empty searches without replaying cached pages or duplicating an in-flight request', async () => {
    const fixture = createSearchFixture();
    let finishRetry!: (page: SearchVersesResponse) => void;
    fixture.mockSearchVerses
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce(versesPage([], null))
      .mockImplementationOnce(
        () =>
          new Promise<SearchVersesResponse>((resolve) => {
            finishRetry = resolve;
          }),
      );
    const { result } = renderHook(() => useBibleSearch({ versionId: 111 }), {
      wrapper: fixture.wrapper,
    });
    act(() => result.current.selectSuggestion('love'));
    await waitFor(() => expect(result.current.phase.kind).toBe('failed'));
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.phase.kind).toBe('empty'));
    expect(fixture.mockSearchVerses).toHaveBeenCalledTimes(2);
    act(() => result.current.submit());
    expect(result.current.phase.kind).toBe('searching');
    await waitFor(() => expect(fixture.mockSearchVerses).toHaveBeenCalledTimes(3));
    act(() => result.current.submit());
    act(() => result.current.selectSuggestion(' love '));
    expect(result.current.query).toBe(' love ');
    expect(result.current.phase.kind).toBe('searching');
    expect(fixture.mockSearchVerses).toHaveBeenCalledTimes(3);
    await act(async () => finishRetry(versesPage(['JHN.3.16'], null)));
    await waitFor(() =>
      expect(result.current.phase).toMatchObject({
        kind: 'results',
        verses: [{ id: 'JHN.3.16' }],
        nextPage: 'none',
      }),
    );
    expect(fixture.mockGetSuggestedQueries).not.toHaveBeenCalled();
  });

  it('replaces a failed continuation with loading immediately when the book filter changes', async () => {
    const fixture = createSearchFixture();
    let finishPage!: (page: SearchVersesResponse) => void;
    fixture.mockSearchVerses
      .mockResolvedValueOnce(versesPage(['PSA.91.1'], 'second'))
      .mockRejectedValueOnce(new Error('page unavailable'))
      .mockImplementationOnce(
        () =>
          new Promise<SearchVersesResponse>((resolve) => {
            finishPage = resolve;
          }),
      );
    const { result, rerender } = renderHook(
      ({ bookIds }) => useBibleSearch({ versionId: 111, bookIds }),
      { wrapper: fixture.wrapper, initialProps: { bookIds: ['JHN'] } },
    );
    act(() => result.current.selectSuggestion('Psalm 91'));
    await waitFor(() => expect(result.current.phase.kind).toBe('failed'));
    rerender({ bookIds: ['PSA'] });
    expect(result.current.phase).toMatchObject({ kind: 'results', nextPage: 'loading' });
    await waitFor(() => expect(fixture.mockSearchVerses).toHaveBeenCalledTimes(3));
    await act(async () => finishPage(versesPage([], null)));
    await waitFor(() =>
      expect(result.current.phase).toMatchObject({ kind: 'results', nextPage: 'none' }),
    );
    rerender({ bookIds: ['JHN'] });
    expect(result.current.phase).toEqual({ kind: 'empty' });
  });

  it('skips nonmatching pages, retries failures, and reuses loaded results when the book filter changes', async () => {
    const fixture = createSearchFixture();
    const unavailable = new Error('page unavailable');
    fixture.mockSearchVerses
      .mockResolvedValueOnce(versesPage(['GEN.1.1'], 'second'))
      .mockRejectedValueOnce(unavailable)
      .mockResolvedValueOnce(versesPage(['PSA.23.1'], 'third'))
      .mockResolvedValueOnce(versesPage(['JHN.3.16', 'GEN.1.2'], null));
    const phases: string[] = [];
    const { result, rerender } = renderHook<
      UseBibleSearchResult,
      { bookIds: readonly string[] | undefined }
    >(
      ({ bookIds }) => {
        const search = useBibleSearch({ versionId: 111, bookIds });
        phases.push(search.phase.kind);
        return search;
      },
      { wrapper: fixture.wrapper, initialProps: { bookIds: ['JHN'] } },
    );
    act(() => result.current.selectSuggestion('love'));
    await waitFor(() =>
      expect(result.current.phase).toEqual({ kind: 'failed', error: unavailable }),
    );
    expect(phases).not.toContain('empty');
    act(() => result.current.retry());
    await waitFor(() =>
      expect(result.current.phase).toMatchObject({
        kind: 'results',
        verses: [{ id: 'JHN.3.16' }],
        nextPage: 'none',
      }),
    );
    expect(fixture.mockSearchVerses.mock.calls.map((call) => call[2].pageToken)).toEqual([
      undefined,
      'second',
      'second',
      'third',
    ]);
    rerender({ bookIds: undefined });
    expect(result.current.phase).toMatchObject({
      kind: 'results',
      verses: [{ id: 'GEN.1.1' }, { id: 'PSA.23.1' }, { id: 'JHN.3.16' }, { id: 'GEN.1.2' }],
    });
    rerender({ bookIds: ['EXO'] });
    expect(result.current.phase).toEqual({ kind: 'empty' });
    expect(fixture.mockSearchVerses).toHaveBeenCalledTimes(4);
  });

  it('abandons filtered pagination when the query is cleared, ignoring its late response', async () => {
    const fixture = createSearchFixture();
    let finishPage!: (page: SearchVersesResponse) => void;
    fixture.mockSearchVerses
      .mockResolvedValueOnce(versesPage(['GEN.1.1'], 'second'))
      .mockImplementationOnce(
        () =>
          new Promise<SearchVersesResponse>((resolve) => {
            finishPage = resolve;
          }),
      );
    const { result } = renderHook(() => useBibleSearch({ versionId: 111, bookIds: ['JHN'] }), {
      wrapper: fixture.wrapper,
    });
    act(() => result.current.selectSuggestion('love'));
    await waitFor(() => expect(fixture.mockSearchVerses).toHaveBeenCalledTimes(2));
    expect(result.current.phase.kind).toBe('searching');
    act(() => result.current.setQuery(''));
    await act(async () => finishPage(versesPage(['JHN.3.16'], 'third')));
    expect(result.current.phase.kind).toBe('trending');
    expect(fixture.mockSearchVerses).toHaveBeenCalledTimes(2);
  });

  it('surfaces discovery failures, retries trending, and still submits after suggestions fail', async () => {
    const { wrapper, mockGetTrendingQueries, mockGetSuggestedQueries, mockSearchVerses } =
      createSearchFixture();
    const unavailable = new Error('discovery unavailable');
    mockGetTrendingQueries.mockRejectedValueOnce(unavailable);
    mockGetSuggestedQueries.mockRejectedValueOnce(unavailable);
    const { result } = renderHook(() => useBibleSearch({ versionId: 111 }), { wrapper });
    await waitFor(() =>
      expect(result.current.phase).toMatchObject({
        kind: 'trending',
        loading: false,
        error: unavailable,
      }),
    );
    act(() => result.current.retry());
    await waitFor(() =>
      expect(result.current.phase).toEqual({
        kind: 'trending',
        queries: trending.queries,
        loading: false,
      }),
    );
    act(() => result.current.setQuery('mercy'));
    await settleDebounce();
    await waitFor(() =>
      expect(result.current.phase).toMatchObject({
        kind: 'suggesting',
        loading: false,
        error: unavailable,
      }),
    );
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.phase.kind).toBe('results'));
    expect(result.current.query).toBe('mercy');
    expect(mockSearchVerses).toHaveBeenCalledWith('mercy', 111, {
      pageSize: SEARCH_VERSES_PAGE_SIZE,
    });
  });

  it('waits for version.language_tag before requesting trending', async () => {
    const { wrapper, mockGetVersion, mockGetTrendingQueries } = createSearchFixture();
    let resolveVersion: (version: BibleVersion) => void = () => {};
    mockGetVersion.mockReturnValue(
      new Promise<BibleVersion>((resolve) => {
        resolveVersion = resolve;
      }),
    );

    const { result } = renderHook(() => useBibleSearch({ versionId: 111 }), { wrapper });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetTrendingQueries).not.toHaveBeenCalled();
    expect(result.current.phase).toEqual({ kind: 'trending', queries: [], loading: false });

    await act(async () => {
      resolveVersion(mockVersion);
    });

    await waitFor(() => {
      expect(mockGetTrendingQueries).toHaveBeenCalledWith('en');
    });
    await waitFor(() => {
      expect(result.current.phase).toEqual({
        kind: 'trending',
        queries: trending.queries,
        loading: false,
      });
    });
  });

  it('falls back to wildcard discovery when version metadata fails', async () => {
    const { wrapper, mockGetVersion, mockGetTrendingQueries } = createSearchFixture();
    mockGetVersion.mockRejectedValueOnce(new Error('metadata unavailable'));

    const { result } = renderHook(() => useBibleSearch({ versionId: 111 }), { wrapper });

    await waitFor(() => {
      expect(mockGetTrendingQueries).toHaveBeenCalledWith('*');
    });
    await waitFor(() => {
      expect(result.current.phase).toEqual({
        kind: 'trending',
        queries: trending.queries,
        loading: false,
      });
    });
  });

  it.each(['', 'not a language tag'])(
    'falls back to wildcard discovery for unusable language tag %j',
    async (languageTag) => {
      const { wrapper, mockGetVersion, mockGetTrendingQueries } = createSearchFixture();
      mockGetVersion.mockResolvedValueOnce({ ...mockVersion, language_tag: languageTag });

      renderHook(() => useBibleSearch({ versionId: 111 }), { wrapper });

      await waitFor(() => {
        expect(mockGetTrendingQueries).toHaveBeenCalledWith('*');
      });
    },
  );

  it('debounces suggestions without requesting or displaying a stale query', async () => {
    const { wrapper, mockGetSuggestedQueries } = createSearchFixture();
    const { result } = renderHook(() => useBibleSearch({ versionId: 111 }), { wrapper });

    await waitFor(() => {
      expect(result.current.phase).toEqual({
        kind: 'trending',
        queries: trending.queries,
        loading: false,
      });
    });

    act(() => {
      result.current.setQuery('love');
    });

    expect(result.current.query).toBe('love');
    expect(result.current.phase).toEqual({
      kind: 'suggesting',
      queries: [],
      loading: false,
      debouncing: true,
    });
    expect(mockGetSuggestedQueries).not.toHaveBeenCalled();

    await settleDebounce();

    await waitFor(() => {
      expect(mockGetSuggestedQueries).toHaveBeenCalledWith('love', 'en');
    });
    await waitFor(() => {
      expect(result.current.phase).toEqual({
        kind: 'suggesting',
        queries: suggestions.queries,
        loading: false,
        debouncing: false,
      });
    });
  });

  it('supersedes an earlier suggestion response as soon as normalized input changes', async () => {
    const { wrapper, mockGetSuggestedQueries } = createSearchFixture();
    let resolveEarlier: (value: SearchQueries) => void = () => {};
    mockGetSuggestedQueries.mockReturnValueOnce(
      new Promise<SearchQueries>((resolve) => {
        resolveEarlier = resolve;
      }),
    );
    const { result } = renderHook(() => useBibleSearch({ versionId: 111 }), { wrapper });

    await waitFor(() => {
      expect(result.current.phase.kind).toBe('trending');
    });
    act(() => {
      result.current.setQuery('love');
    });
    await settleDebounce();
    await waitFor(() => {
      expect(mockGetSuggestedQueries).toHaveBeenCalledWith('love', 'en');
    });

    act(() => {
      result.current.setQuery('loved');
    });
    expect(result.current.phase).toEqual({
      kind: 'suggesting',
      queries: [],
      loading: false,
      debouncing: true,
    });

    await act(async () => {
      resolveEarlier({ queries: [{ text: 'stale love' }] });
    });
    expect(result.current.phase).toEqual({
      kind: 'suggesting',
      queries: [],
      loading: false,
      debouncing: true,
    });
  });

  it('submits verses, suppresses suggestions, paginates, and retries a failed next page', async () => {
    const { wrapper, mockGetSuggestedQueries, mockSearchVerses } = createSearchFixture();
    const { result } = renderHook(() => useBibleSearch({ versionId: 111 }), { wrapper });

    await waitFor(() => {
      expect(result.current.phase.kind).toBe('trending');
    });

    act(() => {
      result.current.setQuery('love');
    });
    await settleDebounce();
    await waitFor(() => {
      expect(mockGetSuggestedQueries).toHaveBeenCalledTimes(1);
    });

    mockGetSuggestedQueries.mockClear();
    act(() => {
      result.current.submit();
    });

    expect(mockGetSuggestedQueries).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockSearchVerses).toHaveBeenCalledWith('love', 111, {
        pageSize: SEARCH_VERSES_PAGE_SIZE,
      });
    });
    await waitFor(() => {
      expect(result.current.phase).toEqual({
        kind: 'results',
        verses: [{ id: 'JHN.3.16', book: 'JHN', chapter: '3', verses: [16] }],
        nextPage: 'available',
      });
    });

    mockSearchVerses.mockRejectedValueOnce(new Error('page 2 failed'));
    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(mockSearchVerses).toHaveBeenCalledWith('love', 111, {
        pageSize: SEARCH_VERSES_PAGE_SIZE,
        pageToken: 'page-2',
      });
    });
    await waitFor(() => {
      expect(result.current.phase).toEqual({
        kind: 'results',
        verses: [{ id: 'JHN.3.16', book: 'JHN', chapter: '3', verses: [16] }],
        nextPage: 'failed',
      });
    });

    mockSearchVerses.mockResolvedValueOnce(versesPage(['JHN.3.16', 'ROM.8.28'], null));
    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.phase).toEqual({
        kind: 'results',
        verses: [
          { id: 'JHN.3.16', book: 'JHN', chapter: '3', verses: [16] },
          { id: 'ROM.8.28', book: 'ROM', chapter: '8', verses: [28] },
        ],
        nextPage: 'none',
      });
    });
  });

  it('does not re-request the submitted query as suggestions during the first edit debounce', async () => {
    const { wrapper, mockGetSuggestedQueries } = createSearchFixture();
    const { result } = renderHook(() => useBibleSearch({ versionId: 111 }), { wrapper });

    await waitFor(() => {
      expect(result.current.phase.kind).toBe('trending');
    });

    act(() => {
      result.current.setQuery('love');
    });
    await settleDebounce();
    await waitFor(() => {
      expect(mockGetSuggestedQueries).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.submit();
    });
    await waitFor(() => {
      expect(result.current.phase.kind).toBe('results');
    });

    mockGetSuggestedQueries.mockClear();
    act(() => {
      result.current.setQuery('loved');
    });

    expect(mockGetSuggestedQueries).not.toHaveBeenCalled();
    expect(result.current.phase).toEqual({
      kind: 'suggesting',
      queries: [],
      loading: false,
      debouncing: true,
    });

    await settleDebounce();

    await waitFor(() => {
      expect(mockGetSuggestedQueries).toHaveBeenCalledTimes(1);
    });
    expect(mockGetSuggestedQueries).toHaveBeenCalledWith('loved', 'en');
    expect(mockGetSuggestedQueries).not.toHaveBeenCalledWith('love', 'en');
  });

  it('selectSuggestion submits immediately without a filled-but-idle frame', async () => {
    const { wrapper, mockSearchVerses } = createSearchFixture();
    const { result } = renderHook(() => useBibleSearch({ versionId: 111 }), { wrapper });

    await waitFor(() => {
      expect(result.current.phase.kind).toBe('trending');
    });

    act(() => {
      result.current.selectSuggestion('love of God');
    });

    expect(result.current.query).toBe('love of God');
    expect(result.current.phase.kind).toBe('searching');
    await waitFor(() => {
      expect(mockSearchVerses).toHaveBeenCalledWith('love of God', 111, {
        pageSize: SEARCH_VERSES_PAGE_SIZE,
      });
    });
  });

  it('returns the hook override without fetching search', async () => {
    const { bibleClient, searchClient, mockGetTrendingQueries, mockSearchVerses } =
      createSearchFixture();
    const stub: UseBibleSearchResult = {
      query: 'love',
      phase: { kind: 'empty' },
      setQuery: () => {},
      submit: () => {},
      selectSuggestion: () => {},
      loadMore: () => {},
      retry: () => {},
    };
    const overrideWrapper = createYVWrapper('test-app-key', {
      bibleClient,
      searchClient,
      hookOverrides: { useBibleSearch: () => stub },
    });

    const { result } = renderHook(() => useBibleSearch({ versionId: 111 }), {
      wrapper: overrideWrapper,
    });

    expect(result.current).toBe(stub);
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockGetTrendingQueries).not.toHaveBeenCalled();
    expect(mockSearchVerses).not.toHaveBeenCalled();
  });
});
