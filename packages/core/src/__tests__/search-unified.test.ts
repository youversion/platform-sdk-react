import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from '../client';
import { SearchClient } from '../search';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

function createSearchClient(): SearchClient {
  const apiClient = new ApiClient({
    apiHost,
    appKey: 'test-app',
    installationId: 'test-installation',
  });
  return new SearchClient(apiClient);
}

describe('SearchClient.searchUnified', () => {
  it('requests verses only, maps references, and sends no paging params', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('query')).toBe('psalm 23');
        expect(url.searchParams.get('bible_id')).toBe('111');
        expect(url.searchParams.getAll('language_ranges[]')).toEqual(['en']);
        expect(url.searchParams.getAll('fields[]')).toEqual(['verses']);
        expect(url.searchParams.get('user_intent')).toBe('topical');
        expect(url.searchParams.has('page_size')).toBe(false);
        expect(url.searchParams.has('page_token')).toBe(false);
        return HttpResponse.json({
          verses: [{ reference: 'PSA.23.1' }],
          topics: [],
          user_intent: null,
          did_you_mean: ['psalm'],
          search_instead_for: 'psalm 23',
        });
      }),
    );

    const result = await searchClient.searchUnified('psalm 23', 111, 'en', {
      fields: ['verses'],
      userIntent: 'topical',
    });

    expect(result).toEqual({
      verses: [{ id: 'PSA.23.1' }],
      topics: [],
      didYouMean: ['psalm'],
      searchInsteadFor: 'psalm 23',
    });
    expect(result).not.toHaveProperty('userIntent');
  });

  it('preserves nullable metadata and topic IDs for a topics-only snapshot', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.getAll('fields[]')).toEqual(['topics']);
        return HttpResponse.json({
          verses: [],
          topics: [{ id: null, text: 'hope', subtopics: [] }],
          user_intent: null,
          did_you_mean: [],
          search_instead_for: null,
        });
      }),
    );

    const result = await searchClient.searchUnified('psalm 23', 111, 'en', {
      fields: ['topics'],
    });

    expect(result).toEqual({
      verses: [],
      topics: [{ id: null, text: 'hope', subtopics: [] }],
      didYouMean: [],
      searchInsteadFor: null,
    });
  });

  it('drops a malformed verse and keeps valid verses and topics', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.getAll('fields[]')).toEqual(['verses', 'topics']);
        expect(url.searchParams.getAll('language_ranges[]')).toEqual(['en', 'es']);
        expect(url.searchParams.has('user_intent')).toBe(false);
        expect(url.searchParams.has('page_size')).toBe(false);
        expect(url.searchParams.has('page_token')).toBe(false);
        return HttpResponse.json({
          verses: [{ reference: 'JHN.6.35' }, { reference: 'BAD' }],
          topics: [{ id: 7, text: 'faith', subtopics: [] }],
          user_intent: 'topical',
          did_you_mean: [],
          search_instead_for: null,
        });
      }),
    );

    const result = await searchClient.searchUnified('faith', 111, ['en', 'es'], {
      fields: ['verses', 'topics'],
    });

    expect(result).toEqual({
      verses: [{ id: 'JHN.6.35' }],
      topics: [{ id: 7, text: 'faith', subtopics: [] }],
      userIntent: 'topical',
      didYouMean: [],
      searchInsteadFor: null,
    });
  });

  it('omits fields[] when fields is unset and normalizes language ranges', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('query')).toBe('hope');
        expect(url.searchParams.get('bible_id')).toBe('111');
        expect(url.searchParams.getAll('language_ranges[]')).toEqual(['en-us', 'es']);
        expect(url.searchParams.has('fields[]')).toBe(false);
        expect(url.searchParams.has('user_intent')).toBe(false);
        expect(url.searchParams.has('page_size')).toBe(false);
        expect(url.searchParams.has('page_token')).toBe(false);
        return HttpResponse.json({
          verses: [],
          topics: [{ id: 42, text: 'hope', subtopics: ['trust'] }],
          did_you_mean: [],
          user_intent: null,
          search_instead_for: null,
        });
      }),
    );

    const result = await searchClient.searchUnified('hope', 111, ['en_US', 'es']);

    expect(result).toEqual({
      verses: [],
      topics: [{ id: 42, text: 'hope', subtopics: ['trust'] }],
      didYouMean: [],
      searchInsteadFor: null,
    });
    expect(result).not.toHaveProperty('userIntent');
  });

  it('sends the first of each repeated field in caller order', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.getAll('fields[]')).toEqual(['topics', 'verses']);
        return HttpResponse.json({
          verses: [],
          topics: [],
          user_intent: null,
          did_you_mean: [],
          search_instead_for: null,
        });
      }),
    );

    const result = await searchClient.searchUnified('faith', 111, 'en', {
      fields: ['topics', 'verses', 'topics'],
    });

    expect(result).toEqual({
      verses: [],
      topics: [],
      didYouMean: [],
      searchInsteadFor: null,
    });
  });

  it('rejects empty fields and invalid input before networking', async () => {
    const searchClient = createSearchClient();
    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, () =>
        HttpResponse.json({
          verses: [],
          topics: [],
          user_intent: null,
          did_you_mean: [],
          search_instead_for: null,
        }),
      ),
    );
    const fetchSpy = vi.spyOn(global, 'fetch');

    await expect(searchClient.searchUnified('', 111, 'en')).rejects.toThrow(
      'Query must be between 1 and 100 characters',
    );
    await expect(searchClient.searchUnified('faith', 0, 'en')).rejects.toThrow(
      'Version ID must be a positive integer',
    );
    await expect(searchClient.searchUnified('faith', 111, [])).rejects.toThrow(
      'At least one language range is required',
    );
    await expect(searchClient.searchUnified('faith', 111, 'en', { fields: [] })).rejects.toThrow(
      'At least one search field is required',
    );
    await expect(
      searchClient.searchUnified('faith', 111, 'en', {
        // @ts-expect-error - verifies runtime validation for unsafe JavaScript callers
        fields: ['nope'],
      }),
    ).rejects.toThrow('Search field must be verses or topics');
    await expect(
      searchClient.searchUnified('faith', 111, 'en', {
        // @ts-expect-error - verifies runtime validation for unsafe JavaScript callers
        userIntent: 'not-a-known-intent',
      }),
    ).rejects.toThrow();

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('preserves future response intents and defaults omitted wire fields for filtered search', async () => {
    const searchClient = createSearchClient();
    const snapshot = {
      verses: [{ reference: 'JHN.3.16' }],
      topics: [{ id: null, text: 'love', subtopics: [] }],
      user_intent: 'future-intent',
      did_you_mean: [],
      search_instead_for: null,
    };

    server.use(http.get(`https://${apiHost}/v1/search-unified`, () => HttpResponse.json(snapshot)));

    expect(await searchClient.searchUnified('love', 111, 'en')).toEqual({
      verses: [{ id: 'JHN.3.16' }],
      topics: [{ id: null, text: 'love', subtopics: [] }],
      userIntent: 'future-intent',
      didYouMean: [],
      searchInsteadFor: null,
    });

    for (const field of ['verses', 'topics', 'user_intent', 'search_instead_for'] as const) {
      server.use(
        http.get(`https://${apiHost}/v1/search-unified`, () =>
          HttpResponse.json({ ...snapshot, [field]: undefined }),
        ),
      );
      const result = await searchClient.searchUnified('love', 111, 'en', { fields: ['topics'] });
      expect(result.verses).toEqual(field === 'verses' ? [] : [{ id: 'JHN.3.16' }]);
      expect(result.topics).toEqual(
        field === 'topics' ? [] : [{ id: null, text: 'love', subtopics: [] }],
      );
      expect(result.didYouMean).toEqual([]);
      expect(result.searchInsteadFor).toBeNull();
      if (field === 'user_intent') {
        expect(result).not.toHaveProperty('userIntent');
      } else {
        expect(result.userIntent).toBe('future-intent');
      }
    }
  });

  it('drops malformed verse and topic hits without failing the response', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, () =>
        HttpResponse.json({
          verses: [{ reference: 'JHN.3.16' }, { reference: null }, { reference: 'BAD' }],
          topics: [
            { id: null, text: 'love', subtopics: [] },
            { text: 'missing id', subtopics: [] },
            { id: null, text: 'hope', subtopics: 'not-an-array' },
          ],
          did_you_mean: [],
        }),
      ),
    );

    expect(await searchClient.searchUnified('love', 111, 'en')).toEqual({
      verses: [{ id: 'JHN.3.16' }],
      topics: [{ id: null, text: 'love', subtopics: [] }],
      didYouMean: [],
      searchInsteadFor: null,
    });
  });

  it('defaults did_you_mean when omitted on the wire', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, () =>
        HttpResponse.json({
          verses: [],
          topics: [],
        }),
      ),
    );

    expect(await searchClient.searchUnified('faith', 111, 'en')).toEqual({
      verses: [],
      topics: [],
      didYouMean: [],
      searchInsteadFor: null,
    });
  });
});
