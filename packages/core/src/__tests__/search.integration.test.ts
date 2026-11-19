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
  it('resolves video ids returned by playlists and dedicated search', async () => {
    const apiClient = createApiClient();
    const search = new SearchClient(apiClient);
    const videos = new VideosClient(apiClient);
    const organizationId = process.env.YVP_VIDEO_ORGANIZATION_ID || '';

    const playlists = await videos.getPlaylists(organizationId, {
      fields: ['id', 'videos'],
      page_size: 1,
    });
    const playlistVideoId = playlists.data[0]?.videos?.[0];
    expect(playlistVideoId).toBeTruthy();
    const playlistVideo = await videos.getVideo(playlistVideoId || '');
    expect(playlistVideo.id).toBe(playlistVideoId);

    const searchResult = await search.searchVideos('faith', {
      organizationIds: [organizationId],
      pageSize: 1,
    });
    expect(Array.isArray(searchResult.videos)).toBe(true);
    const searchVideoId = searchResult.videos[0]?.id;
    if (searchVideoId !== undefined) {
      const searchVideo = await videos.getVideo(searchVideoId);
      expect(searchVideo.id).toBe(searchVideoId);
    }
  });
});
