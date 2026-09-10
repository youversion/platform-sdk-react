import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient } from '../client';
import { SearchClient } from '../search';

const shouldRunLiveSmoke =
  process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.YVP_APP_KEY);

(shouldRunLiveSmoke ? describe : describe.skip)('SearchClient live smoke', () => {
  let searchClient: SearchClient;

  beforeEach(() => {
    const apiClient = new ApiClient({
      apiHost: process.env.YVP_API_HOST,
      appKey: process.env.YVP_APP_KEY || '',
      installationId: 'integration-test',
    });
    searchClient = new SearchClient(apiClient);
  });

  it('fetches trending queries for English', async () => {
    const result = await searchClient.getTrendingQueries('en');
    expect(Array.isArray(result.queries)).toBe(true);
  });

  it('searches verses in an authorized Bible version', async () => {
    const versionId = Number(process.env.YVP_SEARCH_BIBLE_ID || 111);
    const result = await searchClient.searchVerses('faith', versionId, { pageSize: 5 });
    expect(Array.isArray(result.verses)).toBe(true);
    expect(Array.isArray(result.didYouMean)).toBe(true);
  });
});
