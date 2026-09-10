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

describe('SearchClient.searchTopics', () => {
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

  it('requests GET /v1/search-topics with ordered language_ranges[] and no pagination params', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    server.use(
      http.get(`https://${apiHost}/v1/search-topics`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('query')).toBe('faith');
        expect(url.searchParams.getAll('language_ranges[]')).toEqual(['en', 'es']);
        expect(url.searchParams.has('page_size')).toBe(false);
        expect(url.searchParams.has('page_token')).toBe(false);
        return HttpResponse.json({
          topics: [
            { id: 42, text: 'faith', subtopics: ['trust'] },
            { id: null, text: 'belief', subtopics: [] },
          ],
          did_you_mean: ['faith'],
          search_instead_for: null,
          total_size: 2,
        });
      }),
    );

    const result = await searchClient.searchTopics('faith', ['en', 'es']);

    expect(result).toEqual({
      topics: [
        { id: 42, text: 'faith', subtopics: ['trust'] },
        { id: null, text: 'belief', subtopics: [] },
      ],
      didYouMean: ['faith'],
      searchInsteadFor: null,
      totalSize: 2,
    });

    const url = urlFromFetchInput(fetchSpy.mock.calls[0]?.[0]);
    expect(url).not.toContain('page_size');
    expect(url).not.toContain('page_token');
    fetchSpy.mockRestore();
  });

  it('returns totalSize zero for an empty topics collection', async () => {
    server.use(
      http.get(`https://${apiHost}/v1/search-topics`, () =>
        HttpResponse.json({
          topics: [],
          did_you_mean: [],
          search_instead_for: null,
          total_size: 0,
        }),
      ),
    );

    const result = await searchClient.searchTopics('faith', ['en']);
    expect(result.topics).toEqual([]);
    expect(result.totalSize).toBe(0);
  });

  it('normalizes en_US to en-US on the wire', async () => {
    server.use(
      http.get(`https://${apiHost}/v1/search-topics`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.getAll('language_ranges[]')).toEqual(['en-US']);
        return HttpResponse.json({
          topics: [],
          did_you_mean: [],
          search_instead_for: null,
          total_size: 0,
        });
      }),
    );

    await searchClient.searchTopics('faith', ['en_US']);
  });

  it('rejects invalid query and language ranges before networking', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');

    await expect(searchClient.searchTopics('', ['en'])).rejects.toThrow(
      'Query must be between 1 and 100 characters',
    );
    await expect(searchClient.searchTopics('faith', [])).rejects.toThrow(
      'At least one language range is required',
    );
    await expect(searchClient.searchTopics('faith', [''])).rejects.toThrow(
      'Language ranges must be a non-empty string',
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
