import { http, HttpResponse } from 'msw';
import type { Collection, Highlight, Language } from '../types';
import { mockLanguages } from './MockLanguages';
import { mockVersions, mockVersionKJV } from './MockVersions';
import { mockBibleGenesis, mockBibleBooks } from './MockBibles';
import { mockChapterGenesis1, mockGenesisChapters } from './MockChapters';
import { mockGen1Verse1, mockGen1Verses } from './MockVerses';
import {
  mockNIVGen1PassageHTML,
  mockNIVGen1PassageText,
  mockNIVGen1Verse1PassageHTML,
  mockNIVGen1Verse1PassageText,
  mockNIVRom1PassageHTMLHeadings,
  mockNIVRom1PassageHTMLHeadingsNotes,
  mockNIVRom1PassageHTMLNotes,
} from './MockPassages';
import { mockAllVOTDs } from './MockVOTDs';

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
    const size =
      pageSize === '*'
        ? filteredLanguages.length
        : pageSize
          ? parseInt(pageSize, 10)
          : defaultPageSize;
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

  // Versions endpoints
  http.get(`https://${apiHost}/v1/bibles`, ({ request }) => {
    const url = new URL(request.url);
    const pageSize = url.searchParams.get('page_size');
    const pageToken = url.searchParams.get('page_token');

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
    const paginatedVersions = mockVersions.slice(start, end);
    const hasMore = end < mockVersions.length;

    return HttpResponse.json({
      data: paginatedVersions,
      next_page_token: hasMore ? btoa(JSON.stringify({ start: end })) : null,
      total_size: mockVersions.length,
    });
  }),

  http.get(`https://${apiHost}/v1/bibles/:id`, () => {
    return HttpResponse.json(mockVersionKJV);
  }),

  // Bible endpoints
  http.get(`https://${apiHost}/v1/bibles/:id/books`, () => {
    return HttpResponse.json({ data: mockBibleBooks });
  }),

  http.get(`https://${apiHost}/v1/bibles/:bible_id/books/:book_id`, () => {
    return HttpResponse.json(mockBibleGenesis);
  }),

  // Chapter endpoints
  http.get(`https://${apiHost}/v1/bibles/:bible_id/books/:book_id/chapters`, () => {
    return HttpResponse.json({ data: mockGenesisChapters });
  }),
  http.get(`https://${apiHost}/v1/bibles/:bible_id/books/:book_id/chapters/:chapter_id`, () => {
    return HttpResponse.json(mockChapterGenesis1);
  }),

  // Verse endpoints
  http.get(
    `https://${apiHost}/v1/bibles/:bible_id/books/:book_id/chapters/:chapter_id/verses`,
    () => {
      return HttpResponse.json({ data: mockGen1Verses });
    },
  ),
  http.get(
    `https://${apiHost}/v1/bibles/:bible_id/books/:book_id/chapters/:chapter_id/verses/:verse_id`,
    () => {
      return HttpResponse.json(mockGen1Verse1);
    },
  ),

  // Passage endpoints
  http.get(`https://${apiHost}/v1/bibles/:bible_id/passages/GEN.1`, ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format');
    if (format === 'html') {
      return HttpResponse.json(mockNIVGen1PassageHTML);
    }
    return HttpResponse.json(mockNIVGen1PassageText);
  }),
  http.get(`https://${apiHost}/v1/bibles/:bible_id/passages/GEN.1.1`, ({ request }) => {
    const url = new URL(request.url);
    const format = url.searchParams.get('format');
    if (format === 'html') {
      return HttpResponse.json(mockNIVGen1Verse1PassageHTML);
    }
    return HttpResponse.json(mockNIVGen1Verse1PassageText);
  }),
  http.get(`https://${apiHost}/v1/bibles/:bible_id/passages/ROM.1`, ({ request }) => {
    const url = new URL(request.url);
    const includeHeadings = url.searchParams.get('include_headings') === 'true';
    const includeNotes = url.searchParams.get('include_notes') === 'true';
    if (includeHeadings && !includeNotes) {
      return HttpResponse.json(mockNIVRom1PassageHTMLHeadings);
    } else if (!includeHeadings && includeNotes) {
      return HttpResponse.json(mockNIVRom1PassageHTMLNotes);
    } else if (includeNotes && includeHeadings) {
      return HttpResponse.json(mockNIVRom1PassageHTMLHeadingsNotes);
    }
  }),

  // Verse Of The Day endpoints
  http.get(`https://${apiHost}/v1/verse_of_the_days/:day`, ({ params }) => {
    const { day } = params;
    const votd = mockAllVOTDs.find((v) => v.day === Number(day));
    return HttpResponse.json(votd || mockAllVOTDs[0]);
  }),
  http.get(`https://${apiHost}/v1/verse_of_the_days`, () => {
    return HttpResponse.json({ data: mockAllVOTDs });
  }),
];
