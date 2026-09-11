import { describe, it, expect } from 'vitest';
import { ApiClient } from '../client';
import { SearchClient } from '../search';

const shouldRunLiveSmoke =
  process.env.INTEGRATION_TESTS === 'true' && Boolean(process.env.YVP_APP_KEY);

function createSearchClient(): SearchClient {
  const apiClient = new ApiClient({
    apiHost: process.env.YVP_API_HOST,
    appKey: process.env.YVP_APP_KEY || '',
    installationId: 'integration-test',
  });
  return new SearchClient(apiClient);
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
