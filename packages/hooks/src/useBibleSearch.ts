'use client';

import { useCallback, useEffect, useReducer } from 'react';
import { parseSearchLanguageRange, type SearchVersesOptions } from '@youversion/platform-core';
import { useApiData } from './useApiData';
import { useHookOverride } from './useHookOverride';
import { useQueryKeyBase } from './internal/useQueryKeyBase';
import { useSearchClient } from './useSearchClient';
import { useVersion } from './useVersion';
import { useDebounce } from './utility/useDebounce';
import {
  EMPTY_QUERY,
  SEARCH_SUGGESTION_DEBOUNCE_MS,
  SEARCH_VERSES_PAGE_SIZE,
  createSearchSession,
  deriveSearchPhase,
  queriesRequest,
  searchSessionReducer,
  versesRequest,
  type BibleSearchPhase,
  type BibleSearchResult,
} from './internal/bible-search-session';

export type { BibleSearchPhase, BibleSearchResult };

export type UseBibleSearchProps = Readonly<{
  versionId: number;
  /** Client-side result filter. Unset includes all books; empty includes none.
   * Pages without matches are skipped until a match or the end is reached. */
  bookIds?: readonly string[];
}>;

export type UseBibleSearchResult = Readonly<{
  query: string;
  phase: BibleSearchPhase;
  setQuery: (raw: string) => void;
  submit: () => void;
  selectSuggestion: (text: string) => void;
  loadMore: () => void;
  /** Re-requests failed suggestions, the initial search, or a failed results page. */
  retry: () => void;
}>;

export function useBibleSearch(props: UseBibleSearchProps): UseBibleSearchResult {
  const { versionId } = props;
  const override = useHookOverride('useBibleSearch');
  const client = useSearchClient();
  const keyBase = useQueryKeyBase();
  const [session, dispatch] = useReducer(searchSessionReducer, versionId, createSearchSession);

  useEffect(() => {
    dispatch({ type: 'setVersion', versionId });
  }, [versionId]);

  const { version, loading: versionLoading } = useVersion(versionId);
  let languageRanges: string | null = null;
  if (!versionLoading) {
    try {
      languageRanges = parseSearchLanguageRange(version?.language_tag ?? '*');
    } catch {
      languageRanges = '*';
    }
  }
  const debounced = useDebounce(
    session.lane.kind === 'submitted' ? null : session.normalized,
    SEARCH_SUGGESTION_DEBOUNCE_MS,
  );
  const settled = session.normalized === EMPTY_QUERY ? EMPTY_QUERY : debounced;
  const qReq = queriesRequest(session, settled);
  const suggestQuery = qReq?.kind === 'suggest' ? qReq.query : '';
  const queries = useApiData(
    [...keyBase, 'searchQueries', languageRanges, qReq?.kind ?? 'off', suggestQuery],
    () => {
      if (qReq === null || languageRanges === null) {
        return Promise.reject(new Error('search queries requested while disabled'));
      }
      return qReq.kind === 'trending'
        ? client.getTrendingQueries(languageRanges)
        : client.getSuggestedQueries(qReq.query, languageRanges);
    },
    {
      enabled: !override && qReq !== null && languageRanges !== null,
      keepPreviousData: false,
    },
  );

  const vReq = versesRequest(session);
  const verses = useApiData(
    [
      ...keyBase,
      'searchVerses',
      vReq?.versionId,
      vReq?.query ?? '',
      vReq?.pageToken ?? '',
      props.bookIds,
    ],
    () => {
      if (vReq === null) {
        return Promise.reject(new Error('search verses requested while disabled'));
      }
      const options: SearchVersesOptions = { pageSize: SEARCH_VERSES_PAGE_SIZE };
      if (vReq.pageToken !== null) {
        options.pageToken = vReq.pageToken;
      }
      return client.searchVerses(vReq.query, vReq.versionId, options);
    },
    {
      enabled: !override && vReq !== null,
      keepPreviousData: false,
    },
  );

  useEffect(() => {
    const request = versesRequest(session);
    if (request !== null && verses.data !== null) {
      dispatch({ type: 'commitPage', request, response: verses.data });
    }
  }, [session, verses.data]);

  const setQuery = useCallback((raw: string) => {
    dispatch({ type: 'setQuery', raw });
  }, []);
  const submit = useCallback(() => {
    dispatch({ type: 'submit' });
  }, []);
  const selectSuggestion = useCallback((text: string) => {
    dispatch({ type: 'selectSuggestion', text });
  }, []);
  const loadMore = useCallback(() => {
    dispatch({ type: 'loadMore' });
  }, []);
  const retry = useCallback(() => {
    if (vReq !== null && verses.error !== null) {
      verses.refetch();
    } else if (qReq !== null && queries.error !== null) {
      queries.refetch();
    }
  }, [vReq, verses, qReq, queries]);

  const phase = deriveSearchPhase({
    session,
    bookIds: props.bookIds,
    settled,
    queries: queries.data?.queries ?? null,
    queriesLoading: queries.loading,
    queriesError: queries.error,
    versesLoading: verses.loading,
    versesError: verses.error,
  });
  useEffect(() => {
    if (!override && phase.kind === 'searching' && vReq === null) {
      dispatch({ type: 'loadMore' });
    }
  }, [override, phase.kind, vReq]);

  if (override) {
    return override(props);
  }

  return {
    query: session.raw,
    phase,
    setQuery,
    submit,
    selectSuggestion,
    loadMore,
    retry,
  };
}
