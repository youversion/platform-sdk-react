import { http, HttpResponse } from 'msw';
import type { Collection, Highlight, Language } from '../types';
import { mockLanguages } from './MockLangauges';

const apiHost = process.env.YVP_API_HOST;
if (!apiHost) {
  throw new Error('YVP_API_HOST environment variable must be set to run handler tests.');
}

export const handlers = [
  // Languages endpoints
  http.get(`https://${apiHost}/v1/languages/:languageId`, ({ params }) => {
    const { languageId } = params;
    const language = mockLanguages.find((lang) => lang.id === languageId);

    if (!language) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(language);
  }),

  http.get(`https://${apiHost}/v1/languages`, ({ request }) => {
    const url = new URL(request.url);
    const country = url.searchParams.get('country');
    const pageSize = url.searchParams.get('page_size');
    const pageToken = url.searchParams.get('page_token');

    const filteredLanguages = country
      ? mockLanguages.filter((lang) => lang.countries?.includes(country))
      : mockLanguages;

    const defaultPageSize = 25;
    const size = pageSize ? parseInt(pageSize, 10) : defaultPageSize;
    let start = 0;

    if (pageToken) {
      try {
        const decoded = JSON.parse(atob(pageToken)) as { start?: number };
        start = decoded.start || 0;
      } catch {
        start = 0;
      }
    }

    const end = start + size;
    const paginatedLanguages = filteredLanguages.slice(start, end);
    const hasMore = end < filteredLanguages.length;

    const response: Collection<Language> = {
      data: paginatedLanguages,
      next_page_token: hasMore ? btoa(`{"start": ${end}}`) : null,
      total_size: filteredLanguages.length,
    };

    return HttpResponse.json(response);
  }),

  // Highlights endpoints
  http.get(`https://${apiHost}/v1/highlights`, ({ request }) => {
    const url = new URL(request.url);
    const bibleId = url.searchParams.get('version_id');
    const passageId = url.searchParams.get('passage_id');

    const highlights: Collection<Highlight> = {
      data: [
        {
          version_id: bibleId ? Number(bibleId) : 111,
          passage_id: passageId || 'MAT.1.1',
          color: 'fffe00',
        },
        {
          version_id: bibleId ? Number(bibleId) : 111,
          passage_id: passageId || 'MAT.1.2',
          color: '5dff79',
        },
      ],
      next_page_token: null,
    };

    return HttpResponse.json(highlights);
  }),

  http.post(`https://${apiHost}/v1/highlights`, async ({ request }) => {
    const body = (await request.json()) as Highlight;

    return HttpResponse.json(body, { status: 201 });
  }),

  http.delete(`https://${apiHost}/v1/highlights/:passageId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
