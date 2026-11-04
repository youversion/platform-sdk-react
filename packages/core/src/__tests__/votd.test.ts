import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient, BibleClient, getAllVOTDs, getHttpStatus, getVOTD, type VOTD } from '../index';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

function createClients() {
  const api = new ApiClient({
    apiHost,
    appKey: 'test-app',
    installationId: 'test-installation',
  });
  return { api, bible: new BibleClient(api) };
}

function urlFromFetchInput(input: RequestInfo | URL | undefined): string {
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.href;
  return input ?? '';
}

describe.skipIf(Boolean(process.env.INTEGRATION_TESTS))('verse of the day reads', () => {
  it('reads one day and the calendar on hyphenated routes', async () => {
    const { api, bible } = createClients();
    const fetchSpy = vi.spyOn(global, 'fetch');
    const legacyInput: VOTD = { day: 1, passage_id: 'ISA.43.19' };

    try {
      server.use(
        http.get(`https://${apiHost}/v1/verse-of-the-days/:day`, ({ params }) => {
          const day = String(params.day);
          if (day === '1') {
            return HttpResponse.json(legacyInput);
          }
          if (day === '2') {
            return HttpResponse.json({ day: 2, passage_id: 'HEB.13.5', image_id: null });
          }
          if (day === '366') {
            return HttpResponse.json({
              day: 366,
              passage_id: 'PSA.23.1',
              image_id: 'img/366?x',
            });
          }
          return HttpResponse.json({ day: Number(day), passage_id: 'JHN.3.16', image_id: '' });
        }),
        http.get(`https://${apiHost}/v1/verse-of-the-days`, ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.has('language_ranges[]')) {
            return HttpResponse.json({
              data: [
                { day: 1, passage_id: 'ISA.43.19', image_id: 'img/1?x' },
                { day: 2, passage_id: '1JN.2.15-16', image_id: null },
                { day: 3, passage_id: 'JHN.3.16' },
                { day: 366, passage_id: 'PSA.23.1', image_id: '' },
              ],
              next_page_token: 'calendar',
              total_size: 0,
            });
          }
          return HttpResponse.json({
            data: [
              { day: 1, passage_id: 'ISA.43.19' },
              { day: 2, passage_id: 'JHN.3.16' },
            ],
          });
        }),
      );

      const missingImage = await bible.getVOTD(1);
      expectTypeOf(missingImage.image_id).toEqualTypeOf<string | null>();
      expect(missingImage).toEqual({ day: 1, passage_id: 'ISA.43.19', image_id: null });

      const nullImage = await getVOTD(api, 2, { language_ranges: ['en'] });
      expectTypeOf(nullImage.image_id).toEqualTypeOf<string | null>();
      expect(nullImage).toEqual({ day: 2, passage_id: 'HEB.13.5', image_id: null });

      const curated = await bible.getVOTD(366, { language_ranges: [' EN ', 'en_US'] });
      expect(curated).toEqual({ day: 366, passage_id: 'PSA.23.1', image_id: 'img/366?x' });

      const legacy = await bible.getAllVOTDs();
      expectTypeOf<(typeof legacy.data)[number]['image_id']>().toEqualTypeOf<string | null>();
      expect(legacy).toEqual({
        data: [
          { day: 1, passage_id: 'ISA.43.19', image_id: null },
          { day: 2, passage_id: 'JHN.3.16', image_id: null },
        ],
        next_page_token: null,
      });
      expect(Object.hasOwn(legacy, 'total_size')).toBe(false);

      const calendar = await getAllVOTDs(api, { language_ranges: ['es', '*'] });
      expectTypeOf<(typeof calendar.data)[number]['image_id']>().toEqualTypeOf<string | null>();
      expect(calendar).toEqual({
        data: [
          { day: 1, passage_id: 'ISA.43.19', image_id: 'img/1?x' },
          { day: 2, passage_id: '1JN.2.15-16', image_id: null },
          { day: 3, passage_id: 'JHN.3.16', image_id: null },
          { day: 366, passage_id: 'PSA.23.1', image_id: '' },
        ],
        next_page_token: 'calendar',
        total_size: 0,
      });

      const urls = fetchSpy.mock.calls.map((call) => new URL(urlFromFetchInput(call[0])));
      expect(urls.map((url) => url.pathname)).toEqual([
        '/v1/verse-of-the-days/1',
        '/v1/verse-of-the-days/2',
        '/v1/verse-of-the-days/366',
        '/v1/verse-of-the-days',
        '/v1/verse-of-the-days',
      ]);
      expect(urls[0]?.searchParams.has('language_ranges[]')).toBe(false);
      expect(urls[1]?.searchParams.getAll('language_ranges[]')).toEqual(['en']);
      expect(urls[2]?.searchParams.getAll('language_ranges[]')).toEqual(['en', 'en-us']);
      expect(urls[3]?.searchParams.has('language_ranges[]')).toBe(false);
      expect(urls[4]?.searchParams.getAll('language_ranges[]')).toEqual(['es', '*']);
      expect(urls[2]?.search).toContain('language_ranges%5B%5D=en');
      expect(urls[2]?.search).toContain('language_ranges%5B%5D=en-us');

      const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
      expect(headers.get('X-YVP-App-Key')).toBe('test-app');
      expect(headers.get('Authorization')).toBeNull();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('rejects invalid verse-of-the-day input and broken responses', async () => {
    const { api, bible } = createClients();
    const fetchSpy = vi.spyOn(global, 'fetch');

    try {
      await expect(bible.getVOTD(0)).rejects.toThrow();
      await expect(bible.getVOTD(367)).rejects.toThrow();
      await expect(getVOTD(api, 1.5)).rejects.toThrow();
      await expect(bible.getAllVOTDs({ language_ranges: [] })).rejects.toThrow(
        /At least one language range/,
      );
      await expect(bible.getVOTD(1, { language_ranges: [' '] })).rejects.toThrow(
        'Language ranges must be a non-empty string',
      );
      await expect(getAllVOTDs(api, { language_ranges: ['not a range!!!'] })).rejects.toThrow(
        /Language range must/,
      );
      expect(fetchSpy).not.toHaveBeenCalled();

      server.use(
        http.get(`https://${apiHost}/v1/verse-of-the-days/:day`, () =>
          HttpResponse.json({ day: 1 }),
        ),
      );
      await expect(getVOTD(api, 1)).rejects.toThrow(/Unexpected verse-of-the-day API response/);

      server.use(
        http.get(`https://${apiHost}/v1/verse-of-the-days/:day`, () =>
          HttpResponse.json({ day: 1, passage_id: 'JHN.3.16', image_id: 4 }),
        ),
      );
      await expect(bible.getVOTD(1)).rejects.toThrow(/Unexpected verse-of-the-day API response/);

      server.use(
        http.get(
          `https://${apiHost}/v1/verse-of-the-days/:day`,
          () =>
            new HttpResponse('', {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
        ),
      );
      await expect(getVOTD(api, 1)).rejects.toThrow(/Unexpected verse-of-the-day API response/);

      server.use(
        http.get(
          `https://${apiHost}/v1/verse-of-the-days/:day`,
          () => new HttpResponse(null, { status: 204 }),
        ),
      );
      await expect(bible.getVOTD(1)).rejects.toThrow(/Unexpected verse-of-the-day API response/);

      server.use(
        http.get(`https://${apiHost}/v1/verse-of-the-days`, () =>
          HttpResponse.json({
            data: [
              { day: 1, passage_id: 'ISA.43.19' },
              { day: 400, passage_id: 'JHN.3.16' },
              { day: 3, passage_id: 'PSA.23.1' },
            ],
          }),
        ),
      );
      await expect(getAllVOTDs(api)).rejects.toThrow(/Unexpected verse-of-the-day API response/);

      server.use(
        http.get(
          `https://${apiHost}/v1/verse-of-the-days`,
          () => new HttpResponse(null, { status: 204 }),
        ),
      );
      await expect(bible.getAllVOTDs()).rejects.toThrow(/Unexpected verse-of-the-day API response/);

      server.use(
        http.get(`https://${apiHost}/v1/verse-of-the-days/:day`, () =>
          HttpResponse.json({ message: 'unavailable' }, { status: 500 }),
        ),
      );
      try {
        await getVOTD(api, 1);
        throw new Error('expected getVOTD to reject');
      } catch (error) {
        expect(getHttpStatus(error)).toBe(500);
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).not.toMatch(/Unexpected verse-of-the-day API response/);
        }
      }

      server.use(
        http.get(`https://${apiHost}/v1/verse-of-the-days`, () =>
          HttpResponse.json({ message: 'missing' }, { status: 404 }),
        ),
      );
      try {
        await bible.getAllVOTDs();
        throw new Error('expected getAllVOTDs to reject');
      } catch (error) {
        expect(getHttpStatus(error)).toBe(404);
      }
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
