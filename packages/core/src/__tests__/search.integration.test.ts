import { describe, it, expect } from 'vitest';
import { ApiClient } from '../client';
import { SearchClient } from '../search';
import { VideosClient } from '../videos';

const shouldRunLiveSmoke =
  process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.YVP_APP_KEY);

function createSearchClient(): SearchClient {
  return new SearchClient(createApiClient());
}

function createApiClient(): ApiClient {
  return new ApiClient({
    apiHost: process.env.YVP_API_HOST,
    appKey: process.env.YVP_APP_KEY || '',
    installationId: 'integration-test',
  });
}

(shouldRunLiveSmoke ? describe : describe.skip)('SearchClient live smoke', () => {
  it('fetches trending queries for English', async () => {
    const searchClient = createSearchClient();
    const result = await searchClient.getTrendingQueries('en');
    expect(Array.isArray(result.queries)).toBe(true);
  });

  it('searches verses in an authorized Bible version', async () => {
    const searchClient = createSearchClient();
    const versionId = Number(process.env.YVP_SEARCH_BIBLE_ID || 111);
    const result = await searchClient.searchVerses('faith', versionId, { pageSize: 5 });
    expect(Array.isArray(result.verses)).toBe(true);
    expect(Array.isArray(result.didYouMean)).toBe(true);
  });
});

const shouldRunVideoSmoke = shouldRunLiveSmoke && Boolean(process.env.YVP_VIDEO_ORGANIZATION_ID);

(shouldRunVideoSmoke ? describe : describe.skip)('Content Library live smoke', () => {
  it('resolves a video id returned by the organization playlists', async () => {
    const apiClient = createApiClient();
    const videos = new VideosClient(apiClient);
    const organizationId = process.env.YVP_VIDEO_ORGANIZATION_ID || '';

    const playlists = await videos.getPlaylists(organizationId, {
      fields: ['id', 'videos'],
      page_size: '*',
    });
    const playlistVideoId = playlists.data.flatMap((playlist) => playlist.videos ?? [])[0];
    expect(playlistVideoId).toBeTruthy();
    const playlistVideo = await videos.getVideo(playlistVideoId || '');
    expect(playlistVideo.id.length).toBeGreaterThan(0);
    expect(Array.isArray(playlistVideo.playback_sources)).toBe(true);
    expect(Array.isArray(playlistVideo.playback_preview_sources)).toBe(true);
  });
});
