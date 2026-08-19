import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { CreateHighlightEnvelopeSchema } from '../schemas/highlight';
import type { Collection, Language } from '../types';
import { mockLanguages } from './MockLanguages';
import { mockVersions, mockVersionKJV } from './MockVersions';
import { mockOrganizations } from './MockOrganizations';
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

const PageCursorSchema = z.object({
  start: z.number().optional(),
});

/** Mirrors the live API's 401 when no `Authorization: Bearer` header is sent. */
function requireBearerAuth(request: Request): Response | null {
  if (request.headers.get('Authorization')?.startsWith('Bearer ')) {
    return null;
  }
  return HttpResponse.json(
    { error: 'invalid_request', error_description: 'Missing or invalid Bearer token' },
    { status: 401 },
  );
}

export const handlers = [
  // Organizations endpoints
  http.get(`https://${apiHost}/v1/organizations/:organizationId`, ({ params }) => {
    const { organizationId } = params;
    const organization = mockOrganizations.find((org) => org.id === organizationId);

    if (!organization) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json(organization);
  }),
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
        const decoded = PageCursorSchema.safeParse(JSON.parse(atob(pageToken)));
        start = decoded.success ? (decoded.data.start ?? 0) : 0;
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

  // Highlights endpoints. These handlers intentionally enforce the documented
  // API contract (Bearer auth, `bible_id` naming, enveloped POST body) so the
  // client cannot drift from it without tests failing.
  http.get(`https://${apiHost}/v1/highlights`, ({ request }) => {
    const authError = requireBearerAuth(request);
    if (authError) return authError;

    const url = new URL(request.url);
    const bibleId = url.searchParams.get('bible_id');
    const passageId = url.searchParams.get('passage_id');
    if (!bibleId || !passageId) {
      return HttpResponse.json(
        { error: 'invalid_request', error_description: 'bible_id and passage_id are required' },
        { status: 400 },
      );
    }

    return HttpResponse.json({
      data: [
        { bible_id: Number(bibleId), passage_id: `${passageId}.1`, color: 'fffe00' },
        { bible_id: Number(bibleId), passage_id: `${passageId}.2`, color: '5dff79' },
      ],
    });
  }),

  http.post(`https://${apiHost}/v1/highlights`, async ({ request }) => {
    const authError = requireBearerAuth(request);
    if (authError) return authError;

    const body = CreateHighlightEnvelopeSchema.safeParse(await request.json());
    if (!body.success) {
      return HttpResponse.json(
        {
          error: 'invalid_request',
          error_description:
            'Body must be { request_id, highlight: { bible_id, passage_id, color } }',
        },
        { status: 400 },
      );
    }

    return HttpResponse.json(body.data.highlight, { status: 201 });
  }),

  http.delete(`https://${apiHost}/v1/highlights/:passageId`, ({ request }) => {
    const authError = requireBearerAuth(request);
    if (authError) return authError;

    const url = new URL(request.url);
    if (!url.searchParams.get('bible_id')) {
      return HttpResponse.json(
        { error: 'invalid_request', error_description: 'bible_id is required' },
        { status: 400 },
      );
    }

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
        const decoded = PageCursorSchema.safeParse(JSON.parse(atob(pageToken)));
        start = decoded.success ? (decoded.data.start ?? 0) : 0;
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
