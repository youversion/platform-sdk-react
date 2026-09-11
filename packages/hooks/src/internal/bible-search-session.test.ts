import { describe, expect, it } from 'vitest';
import type { SearchQuery, SearchVersesResponse } from '@youversion/platform-core';
import {
  EMPTY_QUERY,
  MAX_SEARCH_QUERY_LENGTH,
  clampSearchInput,
  createSearchSession,
  deriveSearchPhase,
  normalizeQuery,
  projectVerses,
  queriesRequest,
  searchSessionReducer,
  versesRequest,
  type NormalizedQuery,
  type SearchSession,
  type VersesRequest,
} from './bible-search-session';

const LOVE = normalizeQuery('love');
const GRACE = normalizeQuery('grace');

const trendingQueries: readonly SearchQuery[] = [{ text: 'love' }, { text: 'hope' }];
const suggestQueries: readonly SearchQuery[] = [{ text: 'love of God' }];

function versesResponse(
  ids: readonly string[],
  nextPageToken: string | null = null,
): SearchVersesResponse {
  return {
    verses: ids.map((id) => ({ id })),
    didYouMean: [],
    searchInsteadFor: null,
    nextPageToken,
  };
}

function firstPageRequest(query: NormalizedQuery, versionId = 111): VersesRequest {
  return { query, versionId, pageToken: null };
}

function browsing(raw: string, versionId = 111): SearchSession {
  return searchSessionReducer(createSearchSession(versionId), { type: 'setQuery', raw });
}

function submitted(raw: string, versionId = 111): SearchSession {
  return searchSessionReducer(browsing(raw, versionId), { type: 'submit' });
}

function withPages(
  session: SearchSession,
  ids: readonly string[],
  nextPageToken: string | null = 'page-2',
): SearchSession {
  const request = versesRequest(session);
  if (request === null) {
    throw new Error('expected a verses request');
  }
  return searchSessionReducer(session, {
    type: 'commitPage',
    request,
    response: versesResponse(ids, nextPageToken),
  });
}

describe('clampSearchInput', () => {
  it('leaves short input unchanged, including trailing spaces', () => {
    expect(clampSearchInput('love ')).toBe('love ');
  });

  it('slices to 100 characters without trimming', () => {
    const raw = `${'a'.repeat(MAX_SEARCH_QUERY_LENGTH)}bcd`;
    expect(clampSearchInput(raw)).toBe('a'.repeat(MAX_SEARCH_QUERY_LENGTH));
  });
});

describe('normalizeQuery', () => {
  it('trims and brands a non-empty query', () => {
    expect(normalizeQuery('  love  ')).toBe('love');
  });

  it('maps whitespace-only input to the empty query', () => {
    expect(normalizeQuery('   ')).toBe(EMPTY_QUERY);
  });
});

describe('searchSessionReducer', () => {
  it('starts browsing with an empty query', () => {
    expect(createSearchSession(111)).toEqual({
      versionId: 111,
      raw: '',
      normalized: EMPTY_QUERY,
      lane: { kind: 'browsing' },
    });
  });

  it('setQuery keeps the submitted lane when only trailing space changes', () => {
    const withResults = withPages(submitted('love'), ['JHN.3.16']);
    const next = searchSessionReducer(withResults, { type: 'setQuery', raw: 'love ' });
    expect(next.raw).toBe('love ');
    expect(next.normalized).toBe(LOVE);
    expect(next.lane).toEqual(withResults.lane);
  });

  it('setQuery drops to browsing when the normalized query changes', () => {
    const withResults = withPages(submitted('love'), ['JHN.3.16']);
    expect(searchSessionReducer(withResults, { type: 'setQuery', raw: 'grace' })).toEqual({
      versionId: 111,
      raw: 'grace',
      normalized: GRACE,
      lane: { kind: 'browsing' },
    });
  });

  it('setQuery returns the same object when raw is unchanged', () => {
    const state = browsing('love');
    expect(searchSessionReducer(state, { type: 'setQuery', raw: 'love' })).toBe(state);
  });

  it('submit on empty input lands in browsing with a cleared raw field', () => {
    const spaces = browsing('   ');
    expect(searchSessionReducer(spaces, { type: 'submit' })).toEqual({
      versionId: 111,
      raw: '',
      normalized: EMPTY_QUERY,
      lane: { kind: 'browsing' },
    });
  });

  it('submit starts a submitted lane with no pages', () => {
    expect(submitted('love')).toEqual({
      versionId: 111,
      raw: 'love',
      normalized: LOVE,
      lane: { kind: 'submitted', query: LOVE, pages: [], wantsMore: false },
    });
  });

  it('submit returns the same object when that query is already submitted', () => {
    const state = submitted('love');
    expect(searchSessionReducer(state, { type: 'submit' })).toBe(state);
  });

  it('selectSuggestion fills the input and submits in one transition', () => {
    const state = browsing('lo');
    expect(searchSessionReducer(state, { type: 'selectSuggestion', text: 'love of God' })).toEqual({
      versionId: 111,
      raw: 'love of God',
      normalized: 'love of God',
      lane: {
        kind: 'submitted',
        query: 'love of God',
        pages: [],
        wantsMore: false,
      },
    });
  });

  it('loadMore is a no-op until a page with a next token exists', () => {
    const empty = submitted('love');
    expect(searchSessionReducer(empty, { type: 'loadMore' })).toBe(empty);
    const lastPage = withPages(submitted('love'), ['JHN.3.16'], null);
    expect(searchSessionReducer(lastPage, { type: 'loadMore' })).toBe(lastPage);
  });

  it('loadMore sets wantsMore when the last page has a next token', () => {
    const paged = withPages(submitted('love'), ['JHN.3.16'], 'page-2');
    const next = searchSessionReducer(paged, { type: 'loadMore' });
    expect(next.lane).toEqual({
      kind: 'submitted',
      query: LOVE,
      pages: [
        {
          token: null,
          hits: [{ id: 'JHN.3.16' }],
          nextToken: 'page-2',
        },
      ],
      wantsMore: true,
    });
    expect(searchSessionReducer(next, { type: 'loadMore' })).toBe(next);
  });

  it('setVersion returns identity for the same id', () => {
    const state = submitted('love');
    expect(searchSessionReducer(state, { type: 'setVersion', versionId: 111 })).toBe(state);
  });

  it('setVersion re-runs a submitted search under the new version', () => {
    const withResults = withPages(submitted('love'), ['JHN.3.16']);
    expect(searchSessionReducer(withResults, { type: 'setVersion', versionId: 222 })).toEqual({
      versionId: 222,
      raw: 'love',
      normalized: LOVE,
      lane: { kind: 'submitted', query: LOVE, pages: [], wantsMore: false },
    });
  });

  it('commitPage ignores a stale query, version, or duplicate token', () => {
    const state = submitted('love');
    const request = firstPageRequest(LOVE);
    const response = versesResponse(['JHN.3.16'], 'page-2');
    const committed = searchSessionReducer(state, { type: 'commitPage', request, response });

    expect(
      searchSessionReducer(state, {
        type: 'commitPage',
        request: { ...request, query: GRACE },
        response,
      }),
    ).toBe(state);
    expect(
      searchSessionReducer(state, {
        type: 'commitPage',
        request: { ...request, versionId: 222 },
        response,
      }),
    ).toBe(state);
    expect(
      searchSessionReducer(committed, {
        type: 'commitPage',
        request,
        response: versesResponse(['ROM.8.28'], 'page-3'),
      }),
    ).toBe(committed);
    expect(
      searchSessionReducer(browsing('love'), { type: 'commitPage', request, response }),
    ).toEqual(browsing('love'));
  });

  it('commitPage appends the matching page and clears wantsMore', () => {
    const first = withPages(submitted('love'), ['JHN.3.16'], 'page-2');
    const loadingMore = searchSessionReducer(first, { type: 'loadMore' });
    const second = searchSessionReducer(loadingMore, {
      type: 'commitPage',
      request: { query: LOVE, versionId: 111, pageToken: 'page-2' },
      response: versesResponse(['ROM.8.28'], null),
    });
    expect(second.lane).toEqual({
      kind: 'submitted',
      query: LOVE,
      pages: [
        { token: null, hits: [{ id: 'JHN.3.16' }], nextToken: 'page-2' },
        { token: 'page-2', hits: [{ id: 'ROM.8.28' }], nextToken: null },
      ],
      wantsMore: false,
    });
  });
});

describe('queriesRequest and versesRequest', () => {
  it('returns trending for an empty settled query and suggest otherwise', () => {
    expect(queriesRequest(createSearchSession(111), EMPTY_QUERY)).toEqual({ kind: 'trending' });
    expect(queriesRequest(browsing('love'), LOVE)).toEqual({ kind: 'suggest', query: LOVE });
    expect(queriesRequest(submitted('love'), LOVE)).toBeNull();
  });

  it('requests the first verse page, then the next token only while wantsMore', () => {
    const first = submitted('love');
    expect(versesRequest(first)).toEqual(firstPageRequest(LOVE));
    expect(versesRequest(browsing('love'))).toBeNull();

    const paged = withPages(first, ['JHN.3.16'], 'page-2');
    expect(versesRequest(paged)).toBeNull();
    expect(versesRequest(searchSessionReducer(paged, { type: 'loadMore' }))).toEqual({
      query: LOVE,
      versionId: 111,
      pageToken: 'page-2',
    });
  });
});

describe('projectVerses', () => {
  it('parses hits and drops malformed ids', () => {
    expect(projectVerses([{ id: 'JHN.3.16-18' }, { id: 'BAD' }, { id: 'JHN.3' }])).toEqual([
      { id: 'JHN.3.16-18', book: 'JHN', chapter: '3', verses: [16, 17, 18] },
      { id: 'JHN.3', book: 'JHN', chapter: '3', verses: [] },
    ]);
  });
});

describe('deriveSearchPhase', () => {
  const idle = {
    queries: null,
    queriesLoading: false,
    versesLoading: false,
    versesError: null,
  } satisfies {
    queries: readonly SearchQuery[] | null;
    queriesLoading: boolean;
    versesLoading: boolean;
    versesError: Error | null;
  };

  it('maps empty browsing to trending, including a loading list', () => {
    expect(
      deriveSearchPhase({
        session: createSearchSession(111),
        settled: EMPTY_QUERY,
        ...idle,
        queries: trendingQueries,
      }),
    ).toEqual({ kind: 'trending', queries: trendingQueries, loading: false });
    expect(
      deriveSearchPhase({
        session: createSearchSession(111),
        settled: EMPTY_QUERY,
        ...idle,
        queriesLoading: true,
      }),
    ).toEqual({ kind: 'trending', queries: [], loading: true });
  });

  it('maps typing to suggesting, with debounce distinct from loading', () => {
    const typing = browsing('love');
    expect(
      deriveSearchPhase({
        session: typing,
        settled: EMPTY_QUERY,
        ...idle,
        queries: trendingQueries,
      }),
    ).toEqual({
      kind: 'suggesting',
      queries: trendingQueries,
      loading: false,
      debouncing: true,
    });
    expect(
      deriveSearchPhase({
        session: typing,
        settled: LOVE,
        ...idle,
        queries: suggestQueries,
        queriesLoading: true,
      }),
    ).toEqual({
      kind: 'suggesting',
      queries: suggestQueries,
      loading: true,
      debouncing: false,
    });
  });

  it('treats a suggestion failure as an empty list, never failed', () => {
    expect(
      deriveSearchPhase({
        session: browsing('love'),
        settled: LOVE,
        ...idle,
        queries: null,
      }),
    ).toEqual({
      kind: 'suggesting',
      queries: [],
      loading: false,
      debouncing: false,
    });
  });

  it('maps a submitted first page in flight to searching', () => {
    expect(
      deriveSearchPhase({
        session: submitted('love'),
        settled: LOVE,
        ...idle,
        versesLoading: true,
      }),
    ).toEqual({ kind: 'searching' });
  });

  it('keeps searching in the landed-before-commit frame', () => {
    expect(
      deriveSearchPhase({
        session: submitted('love'),
        settled: LOVE,
        ...idle,
      }),
    ).toEqual({ kind: 'searching' });
  });

  it('maps a first-page error to failed, then searching while retrying', () => {
    const error = new Error('search failed');
    expect(
      deriveSearchPhase({
        session: submitted('love'),
        settled: LOVE,
        ...idle,
        versesError: error,
      }),
    ).toEqual({ kind: 'failed', error });
    expect(
      deriveSearchPhase({
        session: submitted('love'),
        settled: LOVE,
        ...idle,
        versesLoading: true,
        versesError: error,
      }),
    ).toEqual({ kind: 'searching' });
  });

  it('maps zero projected hits to empty', () => {
    expect(
      deriveSearchPhase({
        session: withPages(submitted('love'), ['BAD']),
        settled: LOVE,
        ...idle,
      }),
    ).toEqual({ kind: 'empty' });
  });

  it('maps non-empty hits to results and encodes nextPage as one enum', () => {
    const john = {
      id: 'JHN.3.16',
      book: 'JHN',
      chapter: '3',
      verses: [16],
    };
    const available = withPages(submitted('love'), ['JHN.3.16'], 'page-2');
    expect(deriveSearchPhase({ session: available, settled: LOVE, ...idle })).toEqual({
      kind: 'results',
      verses: [john],
      nextPage: 'available',
    });

    const loadingMore = searchSessionReducer(available, { type: 'loadMore' });
    expect(
      deriveSearchPhase({
        session: loadingMore,
        settled: LOVE,
        ...idle,
        versesLoading: true,
      }),
    ).toEqual({ kind: 'results', verses: [john], nextPage: 'loading' });
    expect(
      deriveSearchPhase({
        session: loadingMore,
        settled: LOVE,
        ...idle,
        versesError: new Error('page 2 failed'),
      }),
    ).toEqual({ kind: 'results', verses: [john], nextPage: 'failed' });

    const last = withPages(submitted('love'), ['JHN.3.16'], null);
    expect(deriveSearchPhase({ session: last, settled: LOVE, ...idle })).toEqual({
      kind: 'results',
      verses: [john],
      nextPage: 'none',
    });
  });
});
