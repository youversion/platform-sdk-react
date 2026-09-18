import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from '../client';
import { SearchClient } from '../search';
import {
  MAX_SEARCH_QUERY_GRAPHEMES,
  SearchTextQuerySchema,
  clampSearchText,
  isValidStructuralUsfmReference,
  parseSearchLanguageRange,
} from '../schemas/search';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

function urlFromFetchInput(input: RequestInfo | URL | undefined): string {
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.href;
  return input ?? '';
}

function createSearchClient(): SearchClient {
  const apiClient = new ApiClient({
    apiHost,
    appKey: 'test-app',
    installationId: 'test-installation',
  });
  return new SearchClient(apiClient);
}

describe('SearchClient.searchVerses', () => {
  it('accepts single-verse references without gating on book codes', () => {
    expect(isValidStructuralUsfmReference('JHN.6.9')).toBe(true);
    expect(isValidStructuralUsfmReference('ZZZ.1.1')).toBe(true);
  });

  it('rejects malformed and non-positive references', () => {
    expect(isValidStructuralUsfmReference('JHN')).toBe(false);
    expect(isValidStructuralUsfmReference('JHN.0.1')).toBe(false);
    expect(isValidStructuralUsfmReference('JHN.1.0')).toBe(false);
    expect(isValidStructuralUsfmReference('JHN.1.1-0')).toBe(false);
    expect(isValidStructuralUsfmReference('JHN.1.5-3')).toBe(false);
    expect(isValidStructuralUsfmReference('')).toBe(false);
  });

  it('accepts chapter-only and inclusive verse ranges', () => {
    expect(isValidStructuralUsfmReference('JHN.6')).toBe(true);
    expect(isValidStructuralUsfmReference('JHN.6.9-11')).toBe(true);
  });

  it('accepts valid language ranges and normalizes case and underscores', () => {
    expect(parseSearchLanguageRange('EN')).toBe('en');
    expect(parseSearchLanguageRange('en')).toBe('en');
    expect(parseSearchLanguageRange('abcdef')).toBe('abcdef');
    expect(parseSearchLanguageRange('en-US')).toBe('en-us');
    expect(parseSearchLanguageRange('en_US')).toBe('en-us');
  });

  it('rejects language ranges with a 9-letter primary subtag or 9-character extension', () => {
    expect(() => parseSearchLanguageRange('abcdefghi')).toThrow(/Language range must/);
    expect(() => parseSearchLanguageRange('en-abcdefghi')).toThrow(/Language range must/);
  });

  it('validates and clamps search text by grapheme clusters', () => {
    const combiningCluster = 'e\u0301';
    const combiningBoundary = `${'a'.repeat(MAX_SEARCH_QUERY_GRAPHEMES - 1)}${combiningCluster}`;
    const surrogateBoundary = `${'a'.repeat(MAX_SEARCH_QUERY_GRAPHEMES - 1)}😀`;

    expect(SearchTextQuerySchema.parse(combiningBoundary)).toBe(combiningBoundary);
    expect(SearchTextQuerySchema.parse(surrogateBoundary)).toBe(surrogateBoundary);
    expect(() => SearchTextQuerySchema.parse(`${combiningBoundary}z`)).toThrow();
    expect(() => SearchTextQuerySchema.parse(`${surrogateBoundary}z`)).toThrow();
    expect(clampSearchText(`${combiningBoundary}z`)).toBe(combiningBoundary);
    expect(clampSearchText(`${surrogateBoundary}z`)).toBe(surrogateBoundary);
  });

  it('imports core without Intl.Segmenter and clamps fallback input without splitting surrogate pairs', async () => {
    const nativeSegmenter = Intl.Segmenter;
    vi.resetModules();
    Object.defineProperty(Intl, 'Segmenter', { configurable: true, value: undefined });
    try {
      const core = await import('../index');
      expect(core.ApiClient).toBeTypeOf('function');
      const boundary = `${'a'.repeat(99)}😀`;
      expect(core.clampSearchText(`${boundary}z`)).toBe(boundary);
      expect(core.clampSearchText('short')).toBe('short');
      const { SearchTextQuerySchema: fallbackSchema } = await import('../schemas/search');
      expect(fallbackSchema.parse(boundary)).toBe(boundary);
      expect(() => fallbackSchema.parse(`${boundary}z`)).toThrow(/Query must/);
    } finally {
      Object.defineProperty(Intl, 'Segmenter', { configurable: true, value: nativeSegmenter });
      vi.resetModules();
    }
  });

  it('maps wire reference to SDK id and metadata fields', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-verses`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('query')).toBe('bread of life');
        expect(url.searchParams.get('bible_id')).toBe('111');
        expect(url.searchParams.has('user_intent')).toBe(false);
        return HttpResponse.json({
          verses: [{ reference: 'JHN.6.35' }, { reference: 'BAD' }],
          user_intent: 'text',
          did_you_mean: ['bread'],
          search_instead_for: null,
          next_page_token: 'page-2',
        });
      }),
    );

    const result = await searchClient.searchVerses('bread of life', 111);

    expect(result).toEqual({
      verses: [{ id: 'JHN.6.35' }],
      userIntent: 'text',
      didYouMean: ['bread'],
      searchInsteadFor: null,
      nextPageToken: 'page-2',
    });
  });

  it('omits userIntent when the API returns null', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-verses`, () =>
        HttpResponse.json({
          verses: [{ reference: 'JHN.6.35' }],
          user_intent: null,
          did_you_mean: [],
          search_instead_for: null,
          next_page_token: null,
        }),
      ),
    );

    const result = await searchClient.searchVerses('bread', 111);
    expect(result).toEqual({
      verses: [{ id: 'JHN.6.35' }],
      didYouMean: [],
      searchInsteadFor: null,
      nextPageToken: null,
    });
    expect(result).not.toHaveProperty('userIntent');
  });

  it('includes user_intent only when the caller supplies it', async () => {
    const searchClient = createSearchClient();
    const fetchSpy = vi.spyOn(global, 'fetch');

    server.use(
      http.get(`https://${apiHost}/v1/search-verses`, () =>
        HttpResponse.json({
          verses: [],
          did_you_mean: [],
          search_instead_for: null,
          next_page_token: null,
        }),
      ),
    );

    await searchClient.searchVerses('faith', 111, { userIntent: 'reference' });

    const url = urlFromFetchInput(fetchSpy.mock.calls[0]?.[0]);
    expect(url).toContain('user_intent=reference');
    expect(url).not.toContain('user_intent=undefined');
    fetchSpy.mockRestore();
  });

  it('serializes pagination params and omits user_intent when unset', async () => {
    const searchClient = createSearchClient();
    const fetchSpy = vi.spyOn(global, 'fetch');

    server.use(
      http.get(`https://${apiHost}/v1/search-verses`, () =>
        HttpResponse.json({
          verses: [],
          did_you_mean: [],
          search_instead_for: null,
          next_page_token: null,
        }),
      ),
    );

    await searchClient.searchVerses('faith', 111, { pageSize: 10, pageToken: 'tok-1' });

    const url = urlFromFetchInput(fetchSpy.mock.calls[0]?.[0]);
    expect(url).toContain('page_size=10');
    expect(url).toContain('page_token=tok-1');
    expect(url).not.toContain('user_intent');
    fetchSpy.mockRestore();
  });

  it('decodes unknown future user_intent values', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-verses`, () =>
        HttpResponse.json({
          verses: [{ reference: 'PSA.23.1' }],
          user_intent: 'future-intent-value',
          did_you_mean: [],
          search_instead_for: null,
          next_page_token: null,
        }),
      ),
    );

    const result = await searchClient.searchVerses('shepherd', 111);
    expect(result.userIntent).toBe('future-intent-value');
  });

  it('rejects invalid queries and version IDs before networking', async () => {
    const searchClient = createSearchClient();
    const fetchSpy = vi.spyOn(global, 'fetch');

    await expect(searchClient.searchVerses('', 111)).rejects.toThrow(
      'Query must be between 1 and 100 characters',
    );
    await expect(searchClient.searchVerses('a'.repeat(101), 111)).rejects.toThrow(
      'Query must be between 1 and 100 characters',
    );
    await expect(searchClient.searchVerses('faith', 0)).rejects.toThrow(
      'Version ID must be a positive integer',
    );
    await expect(searchClient.searchVerses('faith', 111, { pageSize: 100 })).rejects.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
