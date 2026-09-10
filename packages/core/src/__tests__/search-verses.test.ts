import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from '../client';
import { SearchClient } from '../search';
import { isValidStructuralUsfmReference } from '../schemas/search';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

function urlFromFetchInput(input: RequestInfo | URL | undefined): string {
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.href;
  return input ?? '';
}

describe('isValidStructuralUsfmReference', () => {
  it('accepts single-verse references without gating on book codes', () => {
    expect(isValidStructuralUsfmReference('JHN.6.9')).toBe(true);
    expect(isValidStructuralUsfmReference('ZZZ.1.1')).toBe(true);
  });

  it('rejects malformed and non-positive references', () => {
    expect(isValidStructuralUsfmReference('JHN')).toBe(false);
    expect(isValidStructuralUsfmReference('JHN.0.1')).toBe(false);
    expect(isValidStructuralUsfmReference('JHN.1.0')).toBe(false);
    expect(isValidStructuralUsfmReference('JHN.1.1-0')).toBe(false);
    expect(isValidStructuralUsfmReference('')).toBe(false);
  });
});

describe('SearchClient.searchVerses', () => {
  let apiClient: ApiClient;
  let searchClient: SearchClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      apiHost,
      appKey: 'test-app',
      installationId: 'test-installation',
    });
    searchClient = new SearchClient(apiClient);
  });

  it('maps wire reference to SDK id and metadata fields', async () => {
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

  it('includes user_intent only when the caller supplies it', async () => {
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
