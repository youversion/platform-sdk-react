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
  it('requests images only, maps passage_id, and sends no paging params', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('query')).toBe('psalm 23');
        expect(url.searchParams.get('bible_id')).toBe('111');
        expect(url.searchParams.getAll('language_ranges[]')).toEqual(['en']);
        expect(url.searchParams.getAll('fields[]')).toEqual(['images']);
        expect(url.searchParams.get('user_intent')).toBe('topical');
        expect(url.searchParams.has('page_size')).toBe(false);
        expect(url.searchParams.has('page_token')).toBe(false);
        return HttpResponse.json({
          verses: [],
          topics: [],
          images: [{ id: 'img-9', passage_id: 'PSA.23.1' }],
          user_intent: null,
          did_you_mean: ['psalm'],
          search_instead_for: 'psalm 23',
        });
      }),
    );

    const result = await searchClient.searchUnified('psalm 23', 111, 'en', {
      fields: ['images'],
      userIntent: 'topical',
    });

    expect(result).toEqual({
      verses: [],
      topics: [],
      images: [{ id: 'img-9', passageId: 'PSA.23.1' }],
      didYouMean: ['psalm'],
      searchInsteadFor: 'psalm 23',
    });
    expect(result).not.toHaveProperty('userIntent');
  });

  it('defaults omitted sections to empty arrays when the API leaves unrequested keys out', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.getAll('fields[]')).toEqual(['images']);
        return HttpResponse.json({
          images: [{ id: 'img-2', passage_id: 'PSA.23.1' }],
          did_you_mean: [],
          search_instead_for: null,
        });
      }),
    );

    const result = await searchClient.searchUnified('psalm 23', 111, 'en', {
      fields: ['images'],
    });

    expect(result).toEqual({
      verses: [],
      topics: [],
      images: [{ id: 'img-2', passageId: 'PSA.23.1' }],
      didYouMean: [],
      searchInsteadFor: null,
    });
  });

  it('drops a malformed verse and keeps the image hit', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.getAll('fields[]')).toEqual(['images', 'verses']);
        expect(url.searchParams.has('user_intent')).toBe(false);
        expect(url.searchParams.has('page_size')).toBe(false);
        expect(url.searchParams.has('page_token')).toBe(false);
        return HttpResponse.json({
          verses: [{ reference: 'JHN.6.35' }, { reference: 'BAD' }],
          topics: [],
          images: [{ id: 'img-1', passage_id: 'PSA.23.1' }],
          user_intent: 'topical',
          did_you_mean: [],
          search_instead_for: null,
        });
      }),
    );

    const result = await searchClient.searchUnified('faith', 111, ['en', 'es'], {
      fields: ['images', 'verses'],
    });

    expect(result).toEqual({
      verses: [{ id: 'JHN.6.35' }],
      topics: [],
      images: [{ id: 'img-1', passageId: 'PSA.23.1' }],
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
          topics: [{ text: 'hope', subtopics: ['trust'] }],
          images: [],
          did_you_mean: [],
          user_intent: null,
        });
      }),
    );

    const result = await searchClient.searchUnified('hope', 111, ['en_US', 'es']);

    expect(result).toEqual({
      verses: [],
      topics: [{ text: 'hope', subtopics: ['trust'] }],
      images: [],
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
        expect(url.searchParams.getAll('fields[]')).toEqual(['topics', 'images']);
        return HttpResponse.json({
          verses: [],
          topics: [],
          images: [],
          did_you_mean: [],
          search_instead_for: null,
        });
      }),
    );

    const result = await searchClient.searchUnified('faith', 111, 'en', {
      fields: ['topics', 'images', 'topics'],
    });

    expect(result).toEqual({
      verses: [],
      topics: [],
      images: [],
      didYouMean: [],
      searchInsteadFor: null,
    });
  });

  it('rejects empty fields and invalid input before networking', async () => {
    const searchClient = createSearchClient();
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
    ).rejects.toThrow('Search field must be verses, topics, or images');

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('drops bad image hits and keeps verses and topics', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, () =>
        HttpResponse.json({
          verses: [{ reference: 'JHN.6.35' }],
          topics: [{ text: 'faith', subtopics: [] }],
          images: [
            { id: 'img-good', passage_id: 'PSA.23.1' },
            { id: '', passage_id: 'PSA.23.2' },
            { id: 'img-empty-passage', passage_id: '' },
            { id: 'img-bad', passage_id: 'BAD' },
            { id: 'img-book-only', passage_id: 'JHN' },
          ],
          did_you_mean: [],
          search_instead_for: null,
        }),
      ),
    );

    const result = await searchClient.searchUnified('faith', 111, 'en', {
      fields: ['verses', 'topics', 'images'],
    });

    expect(result).toEqual({
      verses: [{ id: 'JHN.6.35' }],
      topics: [{ text: 'faith', subtopics: [] }],
      images: [{ id: 'img-good', passageId: 'PSA.23.1' }],
      didYouMean: [],
      searchInsteadFor: null,
    });
  });

  it('throws when did_you_mean is missing', async () => {
    const searchClient = createSearchClient();

    server.use(
      http.get(`https://${apiHost}/v1/search-unified`, () =>
        HttpResponse.json({
          images: [{ id: 'img-1', passage_id: 'PSA.23.1' }],
          search_instead_for: null,
        }),
      ),
    );

    await expect(searchClient.searchUnified('faith', 111, 'en')).rejects.toThrow(
      'Unexpected search-unified API response',
    );
  });
});
