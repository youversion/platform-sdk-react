import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient, getHttpStatus, VideosClient } from '../index';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

interface ThumbnailFixtures {
  readonly [videoId: string]: string | null;
}

function createVideosClient(): VideosClient {
  return new VideosClient(
    new ApiClient({
      apiHost,
      appKey: 'test-app',
      installationId: 'test-installation',
    }),
  );
}

describe('VideosClient', () => {
  it('gets a video by opaque id and resolves its thumbnail without changing the playback contract', async () => {
    const videos = createVideosClient();

    server.use(
      http.get(`https://${apiHost}/v1/videos/:videoId`, ({ params, request }) => {
        expect(params.videoId).toBe('video/id');
        expect(request.headers.get('Accept-Language')).toBe('es');
        return HttpResponse.json({
          id: 'video/id',
          title: 'La historia',
          description: null,
          passage_id: 'JHN.3.16',
          language_tag: 'es',
          runtime: 90,
          orientation: 'landscape',
          thumbnail: {
            url: 'https://cdn.example/video.jpg?size=thumb&token=a%2Fb#frame',
            width: 1280,
            height: 720,
          },
          playback_sources: [{ url: 'https://cdn.example/video.m3u8', format: 'hls' }],
          playback_preview_sources: [{ url: 'https://cdn.example/preview.mp4', format: 'mp4' }],
          share_url: 'https://www.bible.com/videos/video-id',
          ignored: true,
        });
      }),
    );

    const video = await videos.getVideo('video/id', {
      acceptLanguage: 'es',
      thumbnailSize: 'card',
    });

    expect(video).toEqual({
      id: 'video/id',
      title: 'La historia',
      description: null,
      passage_id: 'JHN.3.16',
      language_tag: 'es',
      runtime: 90,
      orientation: 'landscape',
      thumbnail: {
        url: 'https://cdn.example/video.jpg?token=a%2Fb&size=card#frame',
        width: 1280,
        height: 720,
      },
      playback_sources: [{ url: 'https://cdn.example/video.m3u8', format: 'hls' }],
      playback_preview_sources: [{ url: 'https://cdn.example/preview.mp4', format: 'mp4' }],
      share_url: 'https://www.bible.com/videos/video-id',
    });
    expect(video.thumbnail?.url).not.toContain('app_key');
  });

  it('lists localized playlists and resolves a playlist video id unchanged', async () => {
    const videos = createVideosClient();
    const organizationId = '550e8400-e29b-41d4-a716-446655440000';

    server.use(
      http.get(
        `https://${apiHost}/v1/organizations/:organizationId/playlists`,
        ({ params, request }) => {
          expect(params.organizationId).toBe(organizationId);
          const url = new URL(request.url);
          expect(request.headers.get('Accept-Language')).toBe('en');
          expect(url.searchParams.getAll('fields[]')).toEqual(['id', 'videos', 'title']);
          expect(url.searchParams.get('page_size')).toBe('*');
          expect(url.searchParams.get('page_token')).toBe('playlist-page');
          return HttpResponse.json({
            data: [{ id: 3669, title: 'Teaching Clips', videos: ['52186'] }],
            next_page_token: null,
          });
        },
      ),
      http.get(`https://${apiHost}/v1/videos/52186`, ({ request }) => {
        expect(request.headers.get('Accept-Language')).toBe('fr');
        return HttpResponse.json({
          id: '52186',
          playback_sources: [],
          playback_preview_sources: [],
        });
      }),
    );

    const page = await videos.getPlaylists(organizationId, {
      fields: ['id', 'videos', 'title'],
      page_size: '*',
      page_token: 'playlist-page',
    });
    const videoId = page.data[0]?.videos?.[0] ?? '';
    const video = await videos.getVideo(videoId, { acceptLanguage: 'fr' });

    expect(page).toEqual({
      data: [{ id: 3669, title: 'Teaching Clips', videos: ['52186'] }],
      next_page_token: null,
    });
    expect(video.id).toBe('52186');
  });

  it('gets a full playlist with an explicit language and maps a no-catalog 204 to an empty page', async () => {
    const videos = createVideosClient();
    const organizationId = '550e8400-e29b-41d4-a716-446655440000';

    server.use(
      http.get(
        `https://${apiHost}/v1/organizations/:organizationId/playlists/:playlistId`,
        ({ params, request }) => {
          expect(params.organizationId).toBe(organizationId);
          expect(params.playlistId).toBe('3669');
          expect(request.headers.get('Accept-Language')).toBe('es');
          return HttpResponse.json({
            id: 3669,
            title: 'Clips de enseñanza',
            description: null,
            type: 'TEACHING_CLIPS',
            total: 1,
            videos: ['52186'],
          });
        },
      ),
      http.get(
        `https://${apiHost}/v1/organizations/:organizationId/playlists`,
        ({ params, request }) => {
          expect(params.organizationId).toBe(organizationId);
          const language = request.headers.get('Accept-Language');
          if (language === 'en') {
            const url = new URL(request.url);
            expect(url.searchParams.has('fields[]')).toBe(false);
            expect(url.searchParams.has('page_token')).toBe(true);
            expect(url.searchParams.get('page_token')).toBe('');
            return HttpResponse.json({
              data: [
                {
                  id: 3669,
                  title: 'Teaching Clips',
                  description: null,
                  type: 'TEACHING_CLIPS',
                  total: 1,
                  videos: ['52186'],
                },
              ],
              next_page_token: '',
            });
          }
          expect(language).toBe('de');
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );

    await expect(
      videos.getPlaylist(organizationId, 3669, { accept_language: 'es' }),
    ).resolves.toEqual({
      id: 3669,
      title: 'Clips de enseñanza',
      description: null,
      type: 'TEACHING_CLIPS',
      total: 1,
      videos: ['52186'],
    });
    await expect(videos.getPlaylists(organizationId, { page_token: '' })).resolves.toEqual({
      data: [
        {
          id: 3669,
          title: 'Teaching Clips',
          description: null,
          type: 'TEACHING_CLIPS',
          total: 1,
          videos: ['52186'],
        },
      ],
      next_page_token: '',
    });
    await expect(videos.getPlaylists(organizationId, { accept_language: 'de' })).resolves.toEqual({
      data: [],
      next_page_token: null,
    });
  });

  it('preserves thumbnail query bytes while selecting every supported rendition', async () => {
    const videos = createVideosClient();
    const thumbnailUrls: ThumbnailFixtures = {
      untouched: 'https://cdn.example/video.jpg?signature=a%20b&flag#frame',
      default: 'https://cdn.example/video.jpg?size=thumb&size=card&token=one#frame',
      thumb: 'https://cdn.example/video.jpg?size=card&signature=a%20b&flag#frame',
      full: 'https://cdn.example/video.jpg?size=thumb&token=one#frame',
      null: null,
    };

    server.use(
      http.get(`https://${apiHost}/v1/videos/:videoId`, ({ params }) => {
        const videoId = String(params.videoId);
        return HttpResponse.json({
          id: `returned-${videoId}`,
          thumbnail: { url: thumbnailUrls[videoId], width: null, height: null },
          playback_sources: [],
          playback_preview_sources: [],
        });
      }),
    );

    const untouched = await videos.getVideo('untouched');
    const defaultSize = await videos.getVideo('default');
    const thumbnail = await videos.getVideo('thumb', { thumbnailSize: 'thumb' });
    const full = await videos.getVideo('full', { thumbnailSize: 'full' });
    const noThumbnailUrl = await videos.getVideo('null');

    expect(untouched.thumbnail?.url).toBe(
      'https://cdn.example/video.jpg?signature=a%20b&flag#frame',
    );
    expect(defaultSize.thumbnail?.url).toBe('https://cdn.example/video.jpg?token=one#frame');
    expect(thumbnail.thumbnail?.url).toBe(
      'https://cdn.example/video.jpg?signature=a%20b&flag&size=thumb#frame',
    );
    expect(full.thumbnail?.url).toBe('https://cdn.example/video.jpg?token=one&size=full#frame');
    expect(noThumbnailUrl.thumbnail).toEqual({ url: null, width: null, height: null });
  });

  it('validates playlist inputs and full detail responses while preserving HTTP status errors', async () => {
    const videos = createVideosClient();
    const organizationId = '550e8400-e29b-41d4-a716-446655440000';
    const fetchSpy = vi.spyOn(global, 'fetch');

    try {
      server.use(
        http.get(
          `https://${apiHost}/v1/organizations/:organizationId/playlists/:playlistId`,
          ({ params }) => {
            expect(params.organizationId).toBe(organizationId);
            return HttpResponse.json({ id: 3669 });
          },
        ),
        http.get(`https://${apiHost}/v1/videos/missing`, () =>
          HttpResponse.json({ message: 'not found' }, { status: 404 }),
        ),
      );

      await expect(videos.getPlaylists('not-a-uuid')).rejects.toThrow(
        'Organization ID must be a valid UUID',
      );
      await expect(videos.getPlaylists(organizationId, { page_size: '*' })).rejects.toThrow(
        'page_size="*" requires 1-3 fields to be specified',
      );
      await expect(videos.getPlaylists(organizationId, { page_size: 100 })).rejects.toThrow(
        'Page size must be an integer from 1 to 99',
      );
      await expect(videos.getPlaylist(organizationId, 2_147_483_648)).rejects.toThrow(
        'Playlist ID must be a 32-bit integer',
      );
      // @ts-expect-error verifies runtime validation for unsafe JavaScript callers
      await expect(videos.getPlaylists(organizationId, null)).rejects.toThrow();
      await expect(videos.getVideo('   ')).rejects.toThrow('Video ID must be a non-empty string');
      await expect(videos.getVideo('..')).rejects.toThrow('Video ID must not be a URL dot segment');
      expect(fetchSpy).not.toHaveBeenCalled();

      await expect(videos.getPlaylist(organizationId, 3669)).rejects.toThrow(
        'Unexpected playlists API response',
      );
      try {
        await videos.getVideo('missing');
        throw new Error('expected getVideo to reject');
      } catch (error) {
        expect(getHttpStatus(error)).toBe(404);
      }
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
