import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient, getHttpStatus, ImagesClient, SearchClient, searchImages } from '../index';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

const image = {
  id: 'abc/def?x',
  image_url: 'https://cdn.example/img.png',
  passage_id: 'JHN.3.16',
  attribution: 'YouVersion',
  language_tag: 'en',
  width: 1200,
  height: 800,
  aspect_ratio: 1.5,
};

function urlFromFetchInput(input: RequestInfo | URL | undefined): string {
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.href;
  return input ?? '';
}

function createClients() {
  const api = new ApiClient({
    apiHost,
    appKey: 'test-app',
    installationId: 'test-installation',
  });
  return { api, search: new SearchClient(api), images: new ImagesClient(api) };
}

describe('searchImages', () => {
  it('pages image hits and resolves an opaque id with getImage', async () => {
    const { api, search, images } = createClients();
    const fetchSpy = vi.spyOn(global, 'fetch');

    try {
      await expect(search.searchImages('', 111)).rejects.toThrow(
        'Query must be between 1 and 100 characters',
      );
      await expect(search.searchImages('   ', 111)).rejects.toThrow(
        'Query must be between 1 and 100 characters',
      );
      await expect(search.searchImages('a'.repeat(101), 111)).rejects.toThrow(
        'Query must be between 1 and 100 characters',
      );
      await expect(search.searchImages('faith', 0)).rejects.toThrow(
        'Version ID must be a positive integer',
      );
      await expect(search.searchImages('faith', 1.5)).rejects.toThrow();
      await expect(search.searchImages('faith', 111, { pageSize: 0 })).rejects.toThrow();
      await expect(search.searchImages('faith', 111, { pageSize: 100 })).rejects.toThrow();
      await expect(search.searchImages('faith', 111, { pageSize: 1.5 })).rejects.toThrow();
      expect(fetchSpy).not.toHaveBeenCalled();

      server.use(
        http.get(`https://${apiHost}/v1/search-images`, ({ request }) => {
          const url = new URL(request.url);
          const token = url.searchParams.get('page_token');
          const pageSize = url.searchParams.get('page_size');
          if (token === null && pageSize === null) {
            return HttpResponse.json({ images: [], next_page_token: null });
          }
          if (token === null) {
            return HttpResponse.json({
              images: [
                { id: 'abc/def?x', passage_id: 'JHN.3.16', category: 'verse-art' },
                { id: '', passage_id: 'JHN.3.16' },
                { id: 'img-bad', passage_id: 'NOT USFM' },
                { id: null, passage_id: 'JHN.3.16' },
                { id: 'img-missing' },
                { id: 'img-2', passage_id: 'PSA.23' },
              ],
              next_page_token: 'page/2?x',
            });
          }
          if (token === 'page/2?x') {
            return HttpResponse.json({ images: [], next_page_token: '' });
          }
          if (token === '') {
            return HttpResponse.json({ images: [] });
          }
          return HttpResponse.json({ images: [], next_page_token: null });
        }),
        http.get(`https://${apiHost}/v1/images/abc%2Fdef%3Fx`, () => HttpResponse.json(image)),
      );

      const defaults = await searchImages(api, 'bread of life', 111);
      expect(defaults).toEqual({ images: [], nextPageToken: null });

      const populated = await search.searchImages('bread of life', 111, { pageSize: 10 });
      expect(populated).toEqual({
        images: [
          { id: 'abc/def?x', passageId: 'JHN.3.16' },
          { id: 'img-2', passageId: 'PSA.23' },
        ],
        nextPageToken: 'page/2?x',
      });

      const firstToken = populated.nextPageToken;
      if (firstToken === null) {
        throw new Error('expected a continuation token');
      }
      const continued = await search.searchImages('bread of life', 111, {
        pageSize: 10,
        pageToken: firstToken,
      });
      expect(continued).toEqual({ images: [], nextPageToken: '' });

      const emptyToken = continued.nextPageToken;
      if (emptyToken === null) {
        throw new Error('expected an empty continuation token');
      }
      const finalPage = await search.searchImages('bread of life', 111, {
        pageSize: 10,
        pageToken: emptyToken,
      });
      expect(finalPage).toEqual({ images: [], nextPageToken: null });

      const detail = await images.getImage(populated.images[0]?.id ?? '');
      expect(detail).toEqual(image);

      const searchCalls = fetchSpy.mock.calls
        .map((call) => new URL(urlFromFetchInput(call[0])))
        .filter((url) => url.pathname === '/v1/search-images');
      expect(searchCalls).toHaveLength(4);

      const defaultUrl = searchCalls[0];
      expect(defaultUrl?.searchParams.get('query')).toBe('bread of life');
      expect(defaultUrl?.searchParams.get('bible_id')).toBe('111');
      expect(defaultUrl?.searchParams.has('page_size')).toBe(false);
      expect(defaultUrl?.searchParams.has('page_token')).toBe(false);
      expect(defaultUrl?.searchParams.has('language_ranges[]')).toBe(false);
      expect(defaultUrl?.searchParams.has('user_intent')).toBe(false);
      expect(defaultUrl?.searchParams.has('fields[]')).toBe(false);

      for (const url of searchCalls.slice(1)) {
        expect(url.searchParams.get('query')).toBe('bread of life');
        expect(url.searchParams.get('bible_id')).toBe('111');
        expect(url.searchParams.get('page_size')).toBe('10');
        expect(url.searchParams.has('language_ranges[]')).toBe(false);
      }
      expect(searchCalls[1]?.searchParams.has('page_token')).toBe(false);
      expect(searchCalls[2]?.searchParams.get('page_token')).toBe('page/2?x');
      expect(searchCalls[3]?.searchParams.get('page_token')).toBe('');

      const firstHeaders = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
      expect(firstHeaders.get('X-YVP-App-Key')).toBe('test-app');
      expect(firstHeaders.get('Authorization')).toBeNull();

      const detailUrl = urlFromFetchInput(fetchSpy.mock.calls.at(-1)?.[0]);
      expect(detailUrl).toContain('/v1/images/abc%2Fdef%3Fx');
      expect(detailUrl).not.toContain('abc%252F');
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('rejects a broken search-images body, HTTP 204, and HTTP errors', async () => {
    const { api } = createClients();

    server.use(
      http.get(`https://${apiHost}/v1/search-images`, ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get('page_token');
        if (token === 'missing-images') {
          return HttpResponse.json({ next_page_token: null });
        }
        if (token === 'images-null') {
          return HttpResponse.json({ images: null, next_page_token: null });
        }
        if (token === 'token-number') {
          return HttpResponse.json({ images: [], next_page_token: 1 });
        }
        if (token === 'empty-body') {
          return new HttpResponse('', {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
        if (token === 'no-content') {
          return new HttpResponse(null, { status: 204 });
        }
        if (token === 'http-400') {
          return HttpResponse.json({ message: 'bad query' }, { status: 400 });
        }
        if (token === 'explicit-null') {
          return HttpResponse.json({ images: [], next_page_token: null });
        }
        return HttpResponse.json({ images: [] });
      }),
    );

    await expect(searchImages(api, 'faith', 111, { pageToken: 'explicit-null' })).resolves.toEqual({
      images: [],
      nextPageToken: null,
    });
    await expect(searchImages(api, 'faith', 111, { pageToken: 'missing-images' })).rejects.toThrow(
      /Unexpected search-images API response/,
    );
    await expect(searchImages(api, 'faith', 111, { pageToken: 'images-null' })).rejects.toThrow(
      /Unexpected search-images API response/,
    );
    await expect(searchImages(api, 'faith', 111, { pageToken: 'token-number' })).rejects.toThrow(
      /Unexpected search-images API response/,
    );
    await expect(searchImages(api, 'faith', 111, { pageToken: 'empty-body' })).rejects.toThrow(
      /Unexpected search-images API response/,
    );
    await expect(searchImages(api, 'faith', 111, { pageToken: 'no-content' })).rejects.toThrow(
      /Unexpected search-images API response/,
    );

    try {
      await searchImages(api, 'faith', 111, { pageToken: 'http-400' });
      throw new Error('expected searchImages to reject');
    } catch (error) {
      expect(getHttpStatus(error)).toBe(400);
      expect(error).toBeInstanceOf(Error);
      if (error instanceof Error) {
        expect(error.message).not.toMatch(/Unexpected search-images API response/);
      }
    }
  });
});
