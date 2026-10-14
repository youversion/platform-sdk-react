import { describe, it, expect, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient, getHttpStatus } from '../client';
import { ImagesClient, type ImagesClientOptions } from '../images';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

const image = {
  id: 'img-1',
  image_url: 'https://cdn.example/img-1.png?v=2',
  passage_id: 'JHN.3.16',
  attribution: 'YouVersion',
  language_tag: 'en',
  width: 1200,
  height: 800,
  aspect_ratio: 1.5,
};

function urlFromFetchInput(input: RequestInfo | URL | undefined): string {
  if (input instanceof Request) return input.url;
  if (input instanceof URL) return input.href;
  return input ?? '';
}

function createImagesClient(options?: ImagesClientOptions): ImagesClient {
  const apiClient = new ApiClient({
    apiHost,
    appKey: 'test-app',
    installationId: 'test-installation',
  });
  return new ImagesClient(apiClient, options);
}

describe('ImagesClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists one page from /v1/images with an empty query and the app key', async () => {
    const images = createImagesClient();
    const fetchSpy = vi.spyOn(global, 'fetch');

    server.use(
      http.get(`https://${apiHost}/v1/images`, () =>
        HttpResponse.json({
          data: [{ ...image, category: 'verse-art' }],
          next_page_token: null,
          total_size: 3,
        }),
      ),
    );

    const page = await images.getImages();

    expect(page).toEqual({ data: [image], next_page_token: null, total_size: 3 });
    const raw = urlFromFetchInput(fetchSpy.mock.calls[0]?.[0]);
    const url = new URL(raw);
    expect(url.pathname).toBe('/v1/images');
    expect(url.search).toBe('');
    expect(raw).not.toContain('fields');
    const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
    expect(headers.get('X-YVP-App-Key')).toBe('test-app');
    expect(headers.get('Authorization')).toBeNull();
  });

  it('sends trimmed filters as language_ranges[] and drops unknown response fields', async () => {
    const images = createImagesClient();
    const fetchSpy = vi.spyOn(global, 'fetch');
    const languageRanges: readonly string[] = [' EN ', 'es'];

    server.use(
      http.get(`https://${apiHost}/v1/images`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('passage_id')).toBe('jhn.3.16');
        expect(url.searchParams.get('page_size')).toBe('12');
        expect(url.searchParams.get('page_token')).toBe('tok-1');
        expect(url.searchParams.getAll('language_ranges[]')).toEqual(['EN', 'es']);
        expect(url.searchParams.has('fields')).toBe(false);
        expect(url.searchParams.has('fields[]')).toBe(false);
        return HttpResponse.json({
          data: [{ ...image, category: 'verse-art' }],
          next_page_token: 'next',
          total_size: 4,
        });
      }),
    );

    const page = await images.getImages({
      passage_id: '  jhn.3.16  ',
      language_ranges: languageRanges,
      page_size: 12,
      page_token: 'tok-1',
    });

    expect(page).toEqual({ data: [image], next_page_token: 'next', total_size: 4 });
    const raw = urlFromFetchInput(fetchSpy.mock.calls[0]?.[0]);
    expect(raw).toContain('language_ranges%5B%5D=EN');
    expect(raw).toContain('language_ranges%5B%5D=es');
    expect(raw).toContain('passage_id=jhn.3.16');
    expect(raw).not.toContain('fields');
    const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
    expect(headers.get('X-YVP-App-Key')).toBe('test-app');
    expect(headers.get('Authorization')).toBeNull();
  });

  it('omits filters the caller did not set', async () => {
    const images = createImagesClient();
    const fetchSpy = vi.spyOn(global, 'fetch');

    server.use(
      http.get(`https://${apiHost}/v1/images`, () =>
        HttpResponse.json({ data: [], next_page_token: null }),
      ),
    );

    await images.getImages({ page_size: 10 });

    const url = new URL(urlFromFetchInput(fetchSpy.mock.calls[0]?.[0]));
    expect(url.searchParams.get('page_size')).toBe('10');
    expect(url.searchParams.has('passage_id')).toBe(false);
    expect(url.searchParams.has('language_ranges[]')).toBe(false);
    expect(url.searchParams.has('page_token')).toBe(false);
    expect(url.searchParams.has('fields')).toBe(false);
    expect(url.searchParams.has('fields[]')).toBe(false);
  });

  it('sends no page_token when the cursor is null', async () => {
    const images = createImagesClient();
    const fetchSpy = vi.spyOn(global, 'fetch');

    server.use(
      http.get(`https://${apiHost}/v1/images`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('passage_id')).toBe('JHN.3.16');
        expect(url.searchParams.has('page_token')).toBe(false);
        return HttpResponse.json({ data: [image], next_page_token: null, total_size: 1 });
      }),
    );

    const page = await images.getImages({ passage_id: 'JHN.3.16', page_token: null });

    expect(page.total_size).toBe(1);
    const raw = urlFromFetchInput(fetchSpy.mock.calls[0]?.[0]);
    expect(raw).toContain('passage_id=JHN.3.16');
    expect(raw).not.toContain('page_token');
  });

  it('omits a null total_size and maps a missing cursor to null', async () => {
    const images = createImagesClient();

    server.use(
      http.get(`https://${apiHost}/v1/images`, () =>
        HttpResponse.json({ data: [image], next_page_token: 'next', total_size: null }),
      ),
    );

    const page = await images.getImages({ passage_id: 'JHN.3.16' });

    expect(page).toEqual({ data: [image], next_page_token: 'next' });
    expect(Object.hasOwn(page, 'total_size')).toBe(false);
  });

  it('omits total_size when the wire omits it and maps a missing cursor to null', async () => {
    const images = createImagesClient();

    server.use(
      http.get(`https://${apiHost}/v1/images`, () => HttpResponse.json({ data: [image] })),
    );

    const page = await images.getImages();

    expect(page).toEqual({ data: [image], next_page_token: null });
    expect(Object.hasOwn(page, 'total_size')).toBe(false);
  });

  it('maps an empty next_page_token to null and keeps a reported total', async () => {
    const images = createImagesClient();

    server.use(
      http.get(`https://${apiHost}/v1/images`, () =>
        HttpResponse.json({ data: [image], next_page_token: '', total_size: 2 }),
      ),
    );

    const page = await images.getImages({ passage_id: 'JHN.3.16' });

    expect(page).toEqual({ data: [image], next_page_token: null, total_size: 2 });
  });

  it('keeps total_size 0 on an empty page', async () => {
    const images = createImagesClient();

    server.use(
      http.get(`https://${apiHost}/v1/images`, () =>
        HttpResponse.json({ data: [], next_page_token: null, total_size: 0 }),
      ),
    );

    const page = await images.getImages({ passage_id: 'JHN.3.16' });

    expect(page).toEqual({ data: [], next_page_token: null, total_size: 0 });
  });

  it('returns an empty page for HTTP 204', async () => {
    const images = createImagesClient();

    server.use(
      http.get(`https://${apiHost}/v1/images`, () => new HttpResponse(null, { status: 204 })),
    );

    const page = await images.getImages();

    expect(page).toEqual({ data: [], next_page_token: null });
    expect(Object.hasOwn(page, 'total_size')).toBe(false);
  });

  it('returns an empty page for an empty JSON body', async () => {
    const images = createImagesClient();

    server.use(
      http.get(
        `https://${apiHost}/v1/images`,
        () =>
          new HttpResponse('', {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );

    const page = await images.getImages();

    expect(page).toEqual({ data: [], next_page_token: null });
  });

  it('rejects a list body that breaks the image contract', async () => {
    const images = createImagesClient();

    server.use(
      http.get(`https://${apiHost}/v1/images`, () =>
        HttpResponse.json({
          data: [
            {
              id: 'img-1',
              image_url: 'https://cdn.example/img-1.png?v=2',
              passage_id: 'JHN.3.16',
              attribution: 'YouVersion',
              language_tag: 'en',
              height: 800,
              aspect_ratio: 1.5,
            },
          ],
          next_page_token: null,
        }),
      ),
    );

    await expect(images.getImages()).rejects.toThrow(/Unexpected images API response/);
  });

  it('rejects a negative total_size', async () => {
    const images = createImagesClient();

    server.use(
      http.get(`https://${apiHost}/v1/images`, () =>
        HttpResponse.json({ data: [], next_page_token: null, total_size: -1 }),
      ),
    );

    await expect(images.getImages()).rejects.toThrow(/Unexpected images API response/);
  });

  it('rejects invalid input before sending a request, then sends a valid one', async () => {
    const images = createImagesClient();
    const fetchSpy = vi.spyOn(global, 'fetch');

    await expect(images.getImages({ passage_id: '' })).rejects.toThrow(
      'Passage ID must be a non-empty string',
    );
    await expect(images.getImages({ passage_id: '   ' })).rejects.toThrow(
      'Passage ID must be a non-empty string',
    );
    await expect(images.getImages({ page_size: 0 })).rejects.toThrow(
      'Page size must be an integer from 1 to 99',
    );
    await expect(images.getImages({ page_size: 100 })).rejects.toThrow(
      'Page size must be an integer from 1 to 99',
    );
    await expect(images.getImages({ page_size: 1.5 })).rejects.toThrow(
      'Page size must be an integer from 1 to 99',
    );
    await expect(images.getImages({ language_ranges: [] })).rejects.toThrow(
      'Pass at least one language range, or omit language_ranges',
    );
    await expect(images.getImages({ language_ranges: [' '] })).rejects.toThrow(
      'Language ranges must be a non-empty string',
    );
    await expect(images.getImages({ page_token: '' })).rejects.toThrow(
      'Page token must be a non-empty string',
    );
    await expect(images.getImage('')).rejects.toThrow('Image ID must be a non-empty string');
    await expect(images.getImage('  ')).rejects.toThrow('Image ID must be a non-empty string');
    expect(fetchSpy).not.toHaveBeenCalled();

    server.use(
      http.get(`https://${apiHost}/v1/images`, () =>
        HttpResponse.json({ data: [image], next_page_token: null, total_size: 1 }),
      ),
    );

    const page = await images.getImages({ passage_id: 'JHN.3.16' });

    expect(page).toEqual({ data: [image], next_page_token: null, total_size: 1 });
    const raw = urlFromFetchInput(fetchSpy.mock.calls[0]?.[0]);
    expect(raw).toContain('/v1/images');
    expect(raw).toContain('passage_id=JHN.3.16');
  });

  it('encodes an opaque id once on the detail path', async () => {
    const images = createImagesClient();
    const fetchSpy = vi.spyOn(global, 'fetch');

    server.use(
      http.get(`https://${apiHost}/v1/images/abc%2Fdef%3Fx`, () =>
        HttpResponse.json({ ...image, id: 'abc/def?x', category: 'verse-art' }),
      ),
    );

    const result = await images.getImage('  abc/def?x  ');

    expect(result).toEqual({ ...image, id: 'abc/def?x' });
    const raw = urlFromFetchInput(fetchSpy.mock.calls[0]?.[0]);
    expect(raw).toContain('/v1/images/abc%2Fdef%3Fx');
    expect(raw).not.toContain('fields');
    const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
    expect(headers.get('X-YVP-App-Key')).toBe('test-app');
    expect(headers.get('Authorization')).toBeNull();
  });

  it('exposes 404 from getImage through getHttpStatus', async () => {
    const images = createImagesClient();

    server.use(
      http.get(`https://${apiHost}/v1/images/missing`, () =>
        HttpResponse.json({ message: 'missing' }, { status: 404 }),
      ),
    );

    try {
      await images.getImage('missing');
      throw new Error('expected getImage to reject');
    } catch (error) {
      expect(getHttpStatus(error)).toBe(404);
    }
  });

  it('rejects a detail body that breaks the image contract', async () => {
    const images = createImagesClient();

    server.use(
      http.get(`https://${apiHost}/v1/images/img-1`, () => HttpResponse.json({ id: 'img-1' })),
    );

    await expect(images.getImage('img-1')).rejects.toThrow(/Unexpected images API response/);
  });

  it('sends a bare chapter and exposes the server 400 on list and detail', async () => {
    const images = createImagesClient();
    let seenPassage: string | null = null;

    server.use(
      http.get(`https://${apiHost}/v1/images`, ({ request }) => {
        seenPassage = new URL(request.url).searchParams.get('passage_id');
        return HttpResponse.json({ message: 'chapter' }, { status: 400 });
      }),
      http.get(`https://${apiHost}/v1/images/bad-id`, () =>
        HttpResponse.json({ message: 'bad id' }, { status: 400 }),
      ),
    );

    try {
      await images.getImages({ passage_id: 'JHN.3' });
      throw new Error('expected getImages to reject');
    } catch (error) {
      expect(seenPassage).toBe('JHN.3');
      expect(getHttpStatus(error)).toBe(400);
    }

    try {
      await images.getImage('bad-id');
      throw new Error('expected getImage to reject');
    } catch (error) {
      expect(getHttpStatus(error)).toBe(400);
    }
  });

  it('sends list and detail requests to /v1-beta/images when beta is set', async () => {
    const images = createImagesClient({ beta: true });
    const fetchSpy = vi.spyOn(global, 'fetch');

    server.use(
      http.get(`https://${apiHost}/v1-beta/images`, () =>
        HttpResponse.json({ data: [image], next_page_token: null, total_size: 1 }),
      ),
      http.get(`https://${apiHost}/v1-beta/images/img-1`, () => HttpResponse.json(image)),
    );

    const page = await images.getImages({ passage_id: 'JHN.3.16' });
    const result = await images.getImage('img-1');

    expect(page).toEqual({ data: [image], next_page_token: null, total_size: 1 });
    expect(result).toEqual(image);
    const listUrl = urlFromFetchInput(fetchSpy.mock.calls[0]?.[0]);
    const detailUrl = urlFromFetchInput(fetchSpy.mock.calls[1]?.[0]);
    expect(listUrl).toContain('/v1-beta/images');
    expect(listUrl).not.toContain('/v1/images');
    expect(detailUrl).toContain('/v1-beta/images/img-1');
    expect(detailUrl).not.toContain('/v1/images');
  });

  it('exports ImagesClient from the package entry', async () => {
    const core = await import('../index');
    const images = new core.ImagesClient(
      new ApiClient({
        apiHost,
        appKey: 'test-app',
        installationId: 'test-installation',
      }),
    );

    server.use(http.get(`https://${apiHost}/v1/images/img-1`, () => HttpResponse.json(image)));

    const result = await images.getImage('img-1');

    expect(result).toEqual(image);
    expect(core.ImagesClient).toBe(ImagesClient);
  });
});
