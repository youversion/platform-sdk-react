import { describe, it, expect, beforeEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from '../client';
import { SearchClient } from '../search';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

function urlFromFetchInput(input: RequestInfo | URL | undefined): string {
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.href;
  return input ?? '';
}

describe('SearchClient query endpoints', () => {
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

  describe('getSuggestedQueries', () => {
    it('requests GET /v1/search-queries with query and ordered language_ranges[]', async () => {
      server.use(
        http.get(`https://${apiHost}/v1/search-queries`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('query')).toBe('faith');
          expect(url.searchParams.get('trending')).toBeNull();
          expect(url.searchParams.getAll('language_ranges[]')).toEqual(['en', 'es']);
          return HttpResponse.json({
            data: [{ text: 'faith hope love', source: 'community' }],
          });
        }),
      );

      const result = await searchClient.getSuggestedQueries('faith', ['en', 'es']);

      expect(result).toEqual({
        queries: [{ text: 'faith hope love', source: 'community' }],
      });
    });

    it('returns { queries: [] } for 204 No Content', async () => {
      server.use(
        http.get(`https://${apiHost}/v1/search-queries`, () =>
          new HttpResponse(null, { status: 204 }),
        ),
      );

      const result = await searchClient.getSuggestedQueries('faith', ['en']);
      expect(result).toEqual({ queries: [] });
    });

    it('rejects an empty suggestion query before networking', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      await expect(searchClient.getSuggestedQueries('   ', ['en'])).rejects.toThrow(
        'Query must be a non-empty string',
      );
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('normalizes en_US language ranges to en-US on the wire', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      server.use(
        http.get(`https://${apiHost}/v1/search-queries`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.getAll('language_ranges[]')).toEqual(['en-US']);
          return HttpResponse.json({ data: [] });
        }),
      );

      await searchClient.getSuggestedQueries('love', 'en_US');

      const firstCall = fetchSpy.mock.calls[0];
      const url = urlFromFetchInput(firstCall?.[0]);
      expect(url).toContain('language_ranges%5B%5D=en-US');
      fetchSpy.mockRestore();
    });
  });

  describe('getTrendingQueries', () => {
    it('requests trending=true without query', async () => {
      server.use(
        http.get(`https://${apiHost}/v1/search-queries`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('trending')).toBe('true');
          expect(url.searchParams.has('query')).toBe(false);
          expect(url.searchParams.getAll('language_ranges[]')).toEqual(['en']);
          return HttpResponse.json({
            data: [{ text: 'John 3:16' }],
          });
        }),
      );

      const result = await searchClient.getTrendingQueries('en');
      expect(result).toEqual({ queries: [{ text: 'John 3:16' }] });
    });

    it('returns { queries: [] } for an empty data collection', async () => {
      server.use(
        http.get(`https://${apiHost}/v1/search-queries`, () =>
          HttpResponse.json({ data: [] }),
        ),
      );

      const result = await searchClient.getTrendingQueries('*');
      expect(result).toEqual({ queries: [] });
    });

    it('rejects missing language ranges before networking', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      await expect(searchClient.getTrendingQueries([])).rejects.toThrow(
        'At least one language range is required',
      );
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });
});
