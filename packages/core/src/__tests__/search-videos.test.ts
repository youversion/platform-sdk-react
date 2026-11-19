import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient, getHttpStatus, SearchClient } from '../index';
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

describe('SearchClient.searchVideos', () => {
  it('searches full video records with stable paging parameters and full-size thumbnails', async () => {
    const search = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1-beta/search-videos`, ({ request }) => {
        const url = new URL(request.url);
        expect(request.headers.get('Accept-Language')).toBe('en');
        expect(url.searchParams.get('query')).toBe('teaching clips');
        expect(url.searchParams.getAll('organization_ids[]')).toEqual(organizationIds);
        expect(url.searchParams.get('page_size')).toBe('12');
        expect(url.searchParams.get('page_token')).toBe('next-page');
        return HttpResponse.json({
          videos: [
            {
              id: 'opaque-video-id',
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
      pageToken: 'next-page',
    });

    expect(result).toEqual({
      videos: [
        {
          id: 'opaque-video-id',
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

  it('honors an explicit language, maps an empty response, and validates before networking', async () => {
    const search = createSearchClient();
    let requests = 0;

    server.use(
      http.get(`https://${apiHost}/v1-beta/search-videos`, ({ request }) => {
        requests += 1;
        expect(request.headers.get('Accept-Language')).toBe('es-MX');
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(search.searchVideos('hope', { acceptLanguage: 'es-MX' })).resolves.toEqual({
      videos: [],
      didYouMean: [],
      searchInsteadFor: null,
      nextPageToken: null,
    });
    await expect(search.searchVideos('', {})).rejects.toThrow(
      'Query must be between 1 and 100 characters',
    );
    await expect(search.searchVideos('hope', { pageSize: 100 })).rejects.toThrow();
    await expect(search.searchVideos('hope', { organizationIds: ['not-a-uuid'] })).rejects.toThrow(
      'Organization ID must be a valid UUID',
    );
    expect(requests).toBe(1);
  });

  it('rejects malformed responses and preserves service failure status', async () => {
    const search = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1-beta/search-videos`, ({ request }) => {
        const query = new URL(request.url).searchParams.get('query');
        return query === 'malformed'
          ? HttpResponse.json({ videos: [{ id: 42 }] })
          : HttpResponse.json({ message: 'catalog unavailable' }, { status: 424 });
      }),
    );

    await expect(search.searchVideos('malformed')).rejects.toThrow(
      'Unexpected search-videos API response',
    );
    try {
      await search.searchVideos('unavailable');
      throw new Error('expected searchVideos to reject');
    } catch (error) {
      expect(getHttpStatus(error)).toBe(424);
    }
  });
});
