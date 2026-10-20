import { expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient, SearchClient, searchUnified } from '../index';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

function createApiClient(): ApiClient {
  return new ApiClient({ apiHost, appKey: 'test-app', installationId: 'test-installation' });
}

it('returns a unified snapshot from one request, mapping hits and metadata without pagination', async () => {
  const requests: URL[] = [];
  server.use(
    http.get(`https://${apiHost}/v1/search-unified`, ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({
        verses: [{ reference: 'JHN.6.35' }, { reference: 'BAD' }],
        topics: [
          { id: 42, text: 'faith', subtopics: ['trust'] },
          { id: null, text: 'belief', subtopics: [] },
        ],
        user_intent: 'future-intent',
        did_you_mean: ['faith'],
        search_instead_for: 'faith',
      });
    }),
  );

  const result = await new SearchClient(createApiClient()).searchUnified(
    ' faith ',
    111,
    ['en_US', 'es'],
    { userIntent: 'topical', fields: ['topics', 'verses'] },
  );
  expect(result).toEqual({
    verses: [{ id: 'JHN.6.35' }],
    topics: [
      { id: 42, text: 'faith', subtopics: ['trust'] },
      { id: null, text: 'belief', subtopics: [] },
    ],
    userIntent: 'future-intent',
    didYouMean: ['faith'],
    searchInsteadFor: 'faith',
  });
  expect(requests).toHaveLength(1);
  const params = requests[0]!.searchParams;
  expect(params.get('query')).toBe('faith');
  expect(params.get('bible_id')).toBe('111');
  expect(params.getAll('language_ranges[]')).toEqual(['en-us', 'es']);
  expect(params.get('user_intent')).toBe('topical');
  expect(params.getAll('fields[]')).toEqual(['topics', 'verses']);
  expect(params.has('page_size')).toBe(false);
  expect(params.has('page_token')).toBe(false);
});

it('omits default intent and empty fields, accepting empty results and nullable metadata', async () => {
  const requests: URL[] = [];
  server.use(
    http.get(`https://${apiHost}/v1/search-unified`, ({ request }) => {
      requests.push(new URL(request.url));
      return HttpResponse.json({
        verses: [],
        topics: [],
        user_intent: null,
        did_you_mean: [],
        search_instead_for: null,
      });
    }),
  );
  const client = createApiClient();
  for (const options of [undefined, { fields: [] }]) {
    expect(await searchUnified(client, 'faith', 111, '*', options)).toEqual({
      verses: [],
      topics: [],
      didYouMean: [],
      searchInsteadFor: null,
    });
  }
  for (const url of requests) {
    expect(url.searchParams.getAll('language_ranges[]')).toEqual(['*']);
    expect(url.searchParams.has('fields[]')).toBe(false);
    expect(url.searchParams.has('user_intent')).toBe(false);
  }
});

it('rejects invalid inputs before networking and rejects malformed unified responses', async () => {
  let requests = 0;
  let response = HttpResponse.json({});
  server.use(
    http.get(`https://${apiHost}/v1/search-unified`, () => {
      requests += 1;
      return response;
    }),
  );
  const client = new SearchClient(createApiClient());
  await expect(client.searchUnified(' ', 111, 'en')).rejects.toThrow(/Query must/);
  await expect(client.searchUnified('a'.repeat(101), 111, 'en')).rejects.toThrow(/Query must/);
  await expect(client.searchUnified('faith', 0, 'en')).rejects.toThrow(/Version ID/);
  await expect(client.searchUnified('faith', 111, [])).rejects.toThrow(/language range/);
  await expect(client.searchUnified('faith', 111, 'en-abcdefghi')).rejects.toThrow(
    /Language range/,
  );
  expect(requests).toBe(0);

  const valid = {
    verses: [],
    topics: [],
    user_intent: null,
    did_you_mean: [],
    search_instead_for: null,
  };
  for (const malformed of [
    {},
    { ...valid, topics: null },
    { ...valid, verses: [{ reference: 7 }] },
    { ...valid, topics: [{ text: 'faith', subtopics: [] }] },
    { ...valid, user_intent: undefined },
    { ...valid, search_instead_for: undefined },
  ]) {
    response = HttpResponse.json(malformed);
    await expect(client.searchUnified('faith', 111, 'en')).rejects.toThrow(
      /Unexpected search-unified API response/,
    );
  }
});
