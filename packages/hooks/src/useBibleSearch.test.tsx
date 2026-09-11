/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
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

describe('useBibleSearch', () => {
  const mockGetVersion = vi.fn();
  const mockGetTrendingQueries = vi.fn();
  const mockGetSuggestedQueries = vi.fn();
  const mockSearchVerses = vi.fn();

  const bibleClient = createBibleClientStub({ getVersion: mockGetVersion });
  const searchClient = createSearchClientStub({
    getTrendingQueries: mockGetTrendingQueries,
    getSuggestedQueries: mockGetSuggestedQueries,
    searchVerses: mockSearchVerses,
  });
  const wrapper = createYVWrapper('test-app-key', { bibleClient, searchClient });

  beforeEach(() => {
    mockGetVersion.mockReset();
    mockGetTrendingQueries.mockReset();
    mockGetSuggestedQueries.mockReset();
    mockSearchVerses.mockReset();
    mockGetVersion.mockResolvedValue(mockVersion);
    mockGetTrendingQueries.mockResolvedValue(trending);
    mockGetSuggestedQueries.mockResolvedValue(suggestions);
    mockSearchVerses.mockResolvedValue(versesPage(['JHN.3.16'], 'page-2'));
  });

  it('waits for version.language_tag before requesting trending', async () => {
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

  it('debounces suggestions and keeps the previous list without a spinner', async () => {
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
      queries: trending.queries,
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

  it('submits verses, suppresses suggestions, paginates, and retries a failed next page', async () => {
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

    mockSearchVerses.mockResolvedValueOnce(versesPage(['ROM.8.28'], null));
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
