import { http, HttpResponse } from 'msw';
import type { Collection, Highlight } from '../types';

const baseUrl = 'https://api.youversion.com';

export const handlers = [
  // Highlights endpoints
  http.get(`${baseUrl}/v1/highlights`, ({ request }) => {
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

  http.post(`${baseUrl}/v1/highlights`, async ({ request }) => {
    const body = (await request.json()) as Highlight;

    return HttpResponse.json(body, { status: 201 });
  }),

  http.delete(`${baseUrl}/v1/highlights/:passageId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
