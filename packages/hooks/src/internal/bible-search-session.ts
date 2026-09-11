import { parseUsfmReference } from '@youversion/platform-core';
import type { SearchQuery, SearchVerseHit, SearchVersesResponse } from '@youversion/platform-core';

export type NormalizedQuery = string & { readonly __normalizedQuery: unique symbol };

export type VersePage = Readonly<{
  /** Continuation token this page answered. `null` for the first page. */
  token: string | null;
  hits: readonly SearchVerseHit[];
  nextToken: string | null;
}>;

/**
 * Which lane is live. The PRD forbids suggesting for a query that is already
 * submitted, so the lanes are one union rather than two slices that can both
 * be on at once.
 */
export type SearchLane =
  | { readonly kind: 'browsing' }
  | {
      readonly kind: 'submitted';
      readonly query: NormalizedQuery;
      /** Ascending. No two pages share a `token`. Empty while the first page is wanted. */
      readonly pages: readonly VersePage[];
      /** The user asked for the page after `pages.at(-1)` and it has not landed. */
      readonly wantsMore: boolean;
    };

export type SearchSession = Readonly<{
  versionId: number;
  /** Raw controlled input. Clamped to 100 characters. Not trimmed while typing. */
  raw: string;
  /** Always `normalizeQuery(raw)`. Never set on its own. */
  normalized: NormalizedQuery;
  lane: SearchLane;
}>;

export type QueriesRequest =
  | { readonly kind: 'trending' }
  | { readonly kind: 'suggest'; readonly query: NormalizedQuery };

export type VersesRequest = Readonly<{
  query: NormalizedQuery;
  versionId: number;
  pageToken: string | null;
}>;

export type BibleSearchResult = Readonly<{
  /** USFM id. Same semantics as `BiblePassage.id` (D1). */
  id: string;
  book: string;
  /** Chapter id as a string, matching `BibleReaderContext.setChapter`. */
  chapter: string;
  /** Expanded, ascending. `JHN.3.16-18` becomes `[16, 17, 18]`. `[]` for a chapter hit. */
  verses: readonly number[];
}>;

export type BibleSearchPhase =
  | {
      readonly kind: 'trending';
      readonly queries: readonly SearchQuery[];
      readonly loading: boolean;
    }
  | {
      readonly kind: 'suggesting';
      readonly queries: readonly SearchQuery[];
      readonly loading: boolean;
      /** A keystroke is still settling. Never drive a spinner from this. */
      readonly debouncing: boolean;
    }
  | { readonly kind: 'searching' }
  | {
      readonly kind: 'results';
      readonly verses: readonly [BibleSearchResult, ...BibleSearchResult[]];
      readonly nextPage: 'none' | 'available' | 'loading' | 'failed';
    }
  | { readonly kind: 'empty' }
  | { readonly kind: 'failed'; readonly error: Error };

export const MAX_SEARCH_QUERY_LENGTH = 100;
export const SEARCH_SUGGESTION_DEBOUNCE_MS = 300;
export const SEARCH_VERSES_PAGE_SIZE = 20;
export const EMPTY_QUERY =
  // SAFETY: the empty string is the branded empty query. normalizeQuery is the
  // only other mint, and it returns this constant after trim.
  '' as NormalizedQuery;

export function clampSearchInput(raw: string): string {
  return raw.length <= MAX_SEARCH_QUERY_LENGTH ? raw : raw.slice(0, MAX_SEARCH_QUERY_LENGTH);
}

export function normalizeQuery(raw: string): NormalizedQuery {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return EMPTY_QUERY;
  }
  // SAFETY: branding after trim. Empty input already returned EMPTY_QUERY.
  return trimmed as NormalizedQuery;
}

export type SearchSessionAction =
  | { readonly type: 'setQuery'; readonly raw: string }
  | { readonly type: 'submit' }
  | { readonly type: 'selectSuggestion'; readonly text: string }
  | { readonly type: 'loadMore' }
  | { readonly type: 'setVersion'; readonly versionId: number }
  | {
      readonly type: 'commitPage';
      readonly request: VersesRequest;
      readonly response: SearchVersesResponse;
    };

export function createSearchSession(versionId: number): SearchSession {
  return {
    versionId,
    raw: '',
    normalized: EMPTY_QUERY,
    lane: { kind: 'browsing' },
  };
}

function submitNormalized(
  state: SearchSession,
  raw: string,
  normalized: NormalizedQuery,
): SearchSession {
  if (normalized === EMPTY_QUERY) {
    if (state.raw === '' && state.normalized === EMPTY_QUERY && state.lane.kind === 'browsing') {
      return state;
    }
    return { ...state, raw: '', normalized: EMPTY_QUERY, lane: { kind: 'browsing' } };
  }
  if (state.lane.kind === 'submitted' && state.lane.query === normalized) {
    return state;
  }
  return {
    ...state,
    raw,
    normalized,
    lane: { kind: 'submitted', query: normalized, pages: [], wantsMore: false },
  };
}

/**
 * Pure. Returns the same object for a no-op so React bails out.
 *
 * Invariants:
 * - `normalized` is always `normalizeQuery(raw)`.
 * - A submitted lane never contains two pages with the same token.
 * - `wantsMore` is true only when the last page has a `nextToken`.
 */
export function searchSessionReducer(
  state: SearchSession,
  action: SearchSessionAction,
): SearchSession {
  switch (action.type) {
    case 'setQuery': {
      const raw = clampSearchInput(action.raw);
      const normalized = normalizeQuery(raw);
      if (normalized === state.normalized) {
        if (raw === state.raw) {
          return state;
        }
        return { ...state, raw };
      }
      return { ...state, raw, normalized, lane: { kind: 'browsing' } };
    }
    case 'submit': {
      return submitNormalized(state, state.raw, state.normalized);
    }
    case 'selectSuggestion': {
      const raw = clampSearchInput(action.text);
      const normalized = normalizeQuery(raw);
      return submitNormalized(state, raw, normalized);
    }
    case 'loadMore': {
      if (state.lane.kind !== 'submitted' || state.lane.wantsMore) {
        return state;
      }
      const last = state.lane.pages.at(-1);
      if (last?.nextToken == null) {
        return state;
      }
      return { ...state, lane: { ...state.lane, wantsMore: true } };
    }
    case 'setVersion': {
      if (action.versionId === state.versionId) {
        return state;
      }
      if (state.lane.kind === 'submitted') {
        return {
          ...state,
          versionId: action.versionId,
          lane: {
            kind: 'submitted',
            query: state.lane.query,
            pages: [],
            wantsMore: false,
          },
        };
      }
      return { ...state, versionId: action.versionId };
    }
    case 'commitPage': {
      if (state.lane.kind !== 'submitted') {
        return state;
      }
      if (
        action.request.query !== state.lane.query ||
        action.request.versionId !== state.versionId
      ) {
        return state;
      }
      if (state.lane.pages.some((page) => page.token === action.request.pageToken)) {
        return state;
      }
      return {
        ...state,
        lane: {
          ...state.lane,
          pages: [
            ...state.lane.pages,
            {
              token: action.request.pageToken,
              hits: action.response.verses,
              nextToken: action.response.nextPageToken ?? null,
            },
          ],
          wantsMore: false,
        },
      };
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function queriesRequest(
  session: SearchSession,
  settled: NormalizedQuery,
): QueriesRequest | null {
  if (session.lane.kind === 'submitted') {
    return null;
  }
  if (settled === EMPTY_QUERY) {
    return { kind: 'trending' };
  }
  return { kind: 'suggest', query: settled };
}

export function versesRequest(session: SearchSession): VersesRequest | null {
  if (session.lane.kind !== 'submitted') {
    return null;
  }
  if (session.lane.pages.length === 0) {
    return {
      query: session.lane.query,
      versionId: session.versionId,
      pageToken: null,
    };
  }
  if (!session.lane.wantsMore) {
    return null;
  }
  const last = session.lane.pages.at(-1);
  if (last?.nextToken == null) {
    return null;
  }
  return {
    query: session.lane.query,
    versionId: session.versionId,
    pageToken: last.nextToken,
  };
}

export function projectVerses(hits: readonly SearchVerseHit[]): readonly BibleSearchResult[] {
  const verses: BibleSearchResult[] = [];
  for (const hit of hits) {
    const parsed = parseUsfmReference(hit.id);
    if (parsed === null) {
      continue;
    }
    verses.push({
      id: hit.id,
      book: parsed.book,
      chapter: parsed.chapter,
      verses: parsed.verses,
    });
  }
  return verses;
}

function flattenHits(pages: readonly VersePage[]): readonly SearchVerseHit[] {
  const hits: SearchVerseHit[] = [];
  for (const page of pages) {
    hits.push(...page.hits);
  }
  return hits;
}

function nextPageStatus(input: {
  readonly session: SearchSession;
  readonly failed: boolean;
  readonly inFlight: boolean;
}): 'none' | 'available' | 'loading' | 'failed' {
  if (input.failed) {
    return 'failed';
  }
  if (input.inFlight) {
    return 'loading';
  }
  if (input.session.lane.kind !== 'submitted') {
    return 'none';
  }
  const last = input.session.lane.pages.at(-1);
  return last?.nextToken ? 'available' : 'none';
}

export function deriveSearchPhase(input: {
  readonly session: SearchSession;
  readonly settled: NormalizedQuery;
  readonly queries: readonly SearchQuery[] | null;
  readonly queriesLoading: boolean;
  readonly versesLoading: boolean;
  readonly versesError: Error | null;
}): BibleSearchPhase {
  const queries = input.queries ?? [];
  if (input.session.lane.kind === 'browsing') {
    if (input.session.normalized === EMPTY_QUERY) {
      return { kind: 'trending', queries, loading: input.queriesLoading };
    }
    return {
      kind: 'suggesting',
      queries,
      loading: input.queriesLoading,
      debouncing: input.settled !== input.session.normalized,
    };
  }

  const wanted = versesRequest(input.session);
  const failed = wanted !== null && input.versesError !== null && !input.versesLoading;
  const inFlight = wanted !== null && !failed;
  const verses = projectVerses(flattenHits(input.session.lane.pages));

  if (input.session.lane.pages.length === 0) {
    if (failed && input.versesError !== null) {
      return { kind: 'failed', error: input.versesError };
    }
    if (inFlight) {
      return { kind: 'searching' };
    }
  }

  const first = verses[0];
  if (first === undefined) {
    return { kind: 'empty' };
  }

  return {
    kind: 'results',
    verses: [first, ...verses.slice(1)],
    nextPage: nextPageStatus({ session: input.session, failed, inFlight }),
  };
}
