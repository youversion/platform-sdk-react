import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient, getHttpStatus, SearchClient, VideosClient } from '../index';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;
const organizationIds = [
  '550e8400-e29b-41d4-a716-446655440000',
  '09d8dc67-6b79-4db8-95fb-b9055258b85b',
];

function createSearchClient(): SearchClient {
  return new SearchClient(
    new ApiClient({
      apiHost,
      appKey: 'test-app',
      installationId: 'test-installation',
    }),
  );
}

describe.skipIf(Boolean(process.env.INTEGRATION_TESTS))('SearchClient.searchVideos', () => {
  it('searches full video records with stable paging parameters and full-size thumbnails', async () => {
    const search = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1-beta/search-videos`, ({ request }) => {
        const url = new URL(request.url);
        expect(request.headers.get('Accept-Language')).toBe('en');
        expect(url.searchParams.get('query')).toBe('teaching clips');
        expect(url.searchParams.getAll('organization_ids[]')).toEqual(organizationIds);
        expect(url.searchParams.get('page_size')).toBe('12');
        expect(url.searchParams.get('page_token')).toBe('a+/=&b');
        return HttpResponse.json({
          videos: [
            {
              id: 'opaque-video-id',
              passage_ids: ['JHN.3.16', 'ROM.8.28'],
              organization_id: '550e8400-e29b-41d4-a716-446655440000',
              references: ['JHN.3.16', 'ROM.8.28'],
              title: 'Teaching clip',
              thumbnail: {
                url: 'https://cdn.example/video.jpg?size=card&token=x%2Fy#poster',
                width: 640,
                height: 360,
              },
              playback_sources: [],
              playback_preview_sources: [],
            },
          ],
          user_intent: 'topical',
          did_you_mean: ['teaching clip'],
          search_instead_for: null,
          next_page_token: 'last-page',
        });
      }),
    );

    const result = await search.searchVideos('teaching clips', {
      organizationIds,
      pageSize: 12,
      pageToken: 'a+/=&b',
    });

    expect(result).toEqual({
      videos: [
        {
          id: 'opaque-video-id',
          passage_ids: ['JHN.3.16', 'ROM.8.28'],
          organization_id: '550e8400-e29b-41d4-a716-446655440000',
          references: ['JHN.3.16', 'ROM.8.28'],
          title: 'Teaching clip',
          thumbnail: {
            url: 'https://cdn.example/video.jpg?token=x%2Fy#poster',
            width: 640,
            height: 360,
          },
          playback_sources: [],
          playback_preview_sources: [],
        },
      ],
      userIntent: 'topical',
      didYouMean: ['teaching clip'],
      searchInsteadFor: null,
      nextPageToken: 'last-page',
    });
  });

  it('treats an empty organization filter like omitted filters', async () => {
    const search = createSearchClient();
    const requests: string[] = [];
    server.use(
      http.get(`https://${apiHost}/v1-beta/search-videos`, ({ request }) => {
        const url = new URL(request.url);
        requests.push(request.url);
        expect(url.searchParams.get('query')).toBe('love');
        expect(url.searchParams.has('organization_ids[]')).toBe(false);
        return HttpResponse.json({
          videos: [],
          user_intent: null,
          did_you_mean: [],
          search_instead_for: null,
        });
      }),
    );
    const unfiltered = await search.searchVideos('love');
    await expect(search.searchVideos('love', { organizationIds: [] })).resolves.toEqual(unfiltered);
    expect(requests).toHaveLength(2);
    expect(requests[1]).toBe(requests[0]);
  });

  it('preserves an empty-page token and validates parameters before networking', async () => {
    const search = createSearchClient();
    let requests = 0;
    const fetchSpy = vi.spyOn(global, 'fetch');

    try {
      server.use(
        http.get(`https://${apiHost}/v1-beta/search-videos`, ({ request }) => {
          requests += 1;
          const url = new URL(request.url);
          expect(request.headers.get('Accept-Language')).toBe('es-MX');
          expect(url.searchParams.get('query')).toBe('hope');
          expect(url.searchParams.getAll('organization_ids[]')).toEqual(organizationIds);
          if (requests === 1) {
            expect(url.searchParams.has('page_token')).toBe(false);
            return HttpResponse.json({
              videos: [],
              user_intent: null,
              did_you_mean: [],
              search_instead_for: null,
              next_page_token: '',
            });
          }
          expect(url.searchParams.has('page_token')).toBe(true);
          expect(url.searchParams.get('page_token')).toBe('');
          expect(url.searchParams.get('page_size')).toBe('99');
          return HttpResponse.json({
            videos: [],
            user_intent: null,
            did_you_mean: [],
            search_instead_for: null,
            next_page_token: null,
          });
        }),
      );

      const emptyPage = await search.searchVideos('hope', {
        acceptLanguage: 'es-MX',
        organizationIds,
      });
      expect(emptyPage).toEqual({
        videos: [],
        didYouMean: [],
        searchInsteadFor: null,
        nextPageToken: '',
      });
      await expect(
        search.searchVideos('hope', {
          acceptLanguage: 'es-MX',
          pageSize: 99,
          organizationIds,
          pageToken: emptyPage.nextPageToken ?? undefined,
        }),
      ).resolves.toMatchObject({ nextPageToken: null });
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      await expect(search.searchVideos('', {})).rejects.toThrow(
        'Query must be between 1 and 100 characters',
      );
      await expect(search.searchVideos('é'.repeat(101))).rejects.toThrow(
        'Query must be between 1 and 100 characters',
      );
      await expect(search.searchVideos('hope', { pageSize: 100 })).rejects.toThrow();
      await expect(
        search.searchVideos('hope', { organizationIds: ['not-a-uuid'] }),
      ).rejects.toThrow('Organization ID must be a valid UUID');
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('rejects malformed responses and preserves service failure status', async () => {
    const search = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1-beta/search-videos`, ({ request }) => {
        const query = new URL(request.url).searchParams.get('query');
        if (query === 'malformed') {
          return HttpResponse.json({
            videos: [{ id: '', playback_sources: [], playback_preview_sources: [] }],
            user_intent: null,
            did_you_mean: [],
            search_instead_for: null,
            next_page_token: null,
          });
        }
        return query === 'empty-body'
          ? new HttpResponse(null, { status: 204 })
          : HttpResponse.json({ message: 'catalog unavailable' }, { status: 424 });
      }),
    );

    await expect(search.searchVideos('malformed')).rejects.toThrow(
      'Unexpected search-videos API response',
    );
    await expect(search.searchVideos('empty-body')).rejects.toThrow(
      'Unexpected search-videos API response',
    );
    try {
      await search.searchVideos('unavailable');
      throw new Error('expected searchVideos to reject');
    } catch (error) {
      expect(getHttpStatus(error)).toBe(424);
    }
  });

  it('requires result arrays while normalizing absent or null optional query metadata', async () => {
    const search = createSearchClient();
    const valid = {
      videos: [],
      user_intent: null,
      did_you_mean: [],
      search_instead_for: null,
    };
    server.use(
      http.get(`https://${apiHost}/v1-beta/search-videos`, () => HttpResponse.json(valid)),
    );
    await expect(search.searchVideos('love')).resolves.toEqual({
      videos: [],
      didYouMean: [],
      searchInsteadFor: null,
      nextPageToken: null,
    });
    for (const field of ['user_intent', 'search_instead_for']) {
      const missing = Object.fromEntries(Object.entries(valid).filter(([name]) => name !== field));
      server.use(
        http.get(`https://${apiHost}/v1-beta/search-videos`, () => HttpResponse.json(missing)),
      );
      await expect(search.searchVideos('love')).resolves.toEqual({
        videos: [],
        didYouMean: [],
        searchInsteadFor: null,
        nextPageToken: null,
      });
      server.use(
        http.get(`https://${apiHost}/v1-beta/search-videos`, () =>
          HttpResponse.json({ ...valid, [field]: 42 }),
        ),
      );
      await expect(search.searchVideos('love')).rejects.toThrow(
        'Unexpected search-videos API response',
      );
    }
    for (const field of ['videos', 'did_you_mean']) {
      const payload = Object.fromEntries(Object.entries(valid).filter(([name]) => name !== field));
      server.use(
        http.get(`https://${apiHost}/v1-beta/search-videos`, () => HttpResponse.json(payload)),
      );
      await expect(search.searchVideos('love')).rejects.toThrow(
        'Unexpected search-videos API response',
      );
    }
  });

  it('accepts multi-code-point queries and treats null search cursors as omitted', async () => {
    const search = createSearchClient();
    const queries = ['👨‍👩‍👧‍👦'.repeat(15), 'é'.repeat(100)];
    server.use(
      http.get(`https://${apiHost}/v1-beta/search-videos`, ({ request }) => {
        const url = new URL(request.url);
        expect(queries).toContain(url.searchParams.get('query'));
        expect(url.searchParams.has('page_token')).toBe(false);
        return HttpResponse.json({ videos: [], did_you_mean: [] });
      }),
    );
    for (const query of queries) {
      await expect(search.searchVideos(query, { pageToken: null })).resolves.toEqual({
        videos: [],
        didYouMean: [],
        searchInsteadFor: null,
        nextPageToken: null,
      });
    }
  });

  it('preserves relative thumbnails without dropping sibling video search results', async () => {
    const api = new ApiClient({ apiHost, appKey: 'test-app' });
    const search = new SearchClient(api);
    const videos = new VideosClient(api);
    const records = [
      {
        id: 'relative',
        thumbnail: { url: '/images/art.jpg?signature=a%2Fb&size=thumb' },
        playback_sources: [],
        playback_preview_sources: [],
      },
      {
        id: 'protocol-relative',
        thumbnail: { url: '//cdn.example/art.jpg?size=card' },
        playback_sources: [],
        playback_preview_sources: [],
      },
    ];
    server.use(
      http.get(`https://${apiHost}/v1-beta/search-videos`, () =>
        HttpResponse.json({ videos: records, did_you_mean: [] }),
      ),
      http.get(`https://${apiHost}/v1-beta/videos/relative`, () => HttpResponse.json(records[0])),
    );
    const page = await search.searchVideos('love');
    expect(page.videos.map((video) => video.thumbnail?.url)).toEqual([
      '/images/art.jpg?signature=a%2Fb',
      '//cdn.example/art.jpg',
    ]);
    expect(page.videos.map((video) => video.id)).toEqual(['relative', 'protocol-relative']);
    const detail = await videos.getVideo('relative', { thumbnailSize: 'card' });
    expect(detail.thumbnail?.url).toBe('/images/art.jpg?signature=a%2Fb&size=card');
  });

  it('preserves a missing-app-key response as an HTTP status error', async () => {
    const search = new SearchClient(
      new ApiClient({ apiHost, appKey: '', installationId: 'test-installation' }),
    );

    server.use(
      http.get(`https://${apiHost}/v1-beta/search-videos`, ({ request }) => {
        expect(request.headers.get('X-YVP-App-Key')).toBe('');
        return HttpResponse.json({ message: 'missing app key' }, { status: 401 });
      }),
    );

    try {
      await search.searchVideos('faith');
      throw new Error('expected searchVideos to reject');
    } catch (error) {
      expect(getHttpStatus(error)).toBe(401);
    }
  });
});
