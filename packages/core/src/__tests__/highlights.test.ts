import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from '../client';
import { HighlightsClient } from '../highlights';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

describe('HighlightsClient', () => {
  let apiClient: ApiClient;
  let highlightsClient: HighlightsClient;

  beforeEach(() => {
    apiClient = new ApiClient({
      apiHost,
      appKey: 'test-app',
      installationId: 'test-installation',
    });
    highlightsClient = new HighlightsClient(apiClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('getHighlights', () => {
    it('fetches highlights with bible_id/passage_id params and maps the wire response', async () => {
      const highlights = await highlightsClient.getHighlights(
        { version_id: 111, passage_id: 'MAT.1' },
        'test-token',
      );

      // The MSW handler 401s without a Bearer header and 400s without
      // bible_id/passage_id, so a successful response also proves the request
      // contract. The wire `bible_id` must come back as `version_id`.
      expect(highlights.data).toHaveLength(2);
      expect(highlights.data[0]).toEqual({
        version_id: 111,
        passage_id: 'MAT.1.1',
        color: 'fffe00',
      });
      expect(highlights.next_page_token).toBeNull();
    });

    it('sends the token as an Authorization: Bearer header, not a query param', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      await highlightsClient.getHighlights({ version_id: 111, passage_id: 'MAT.1' }, 'my-token');

      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).not.toContain('lat=');
      expect(url).toContain('bible_id=111');
      expect(url).toContain('passage_id=MAT.1');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer my-token');
    });

    it('throws a helpful error when no token is available', async () => {
      await expect(
        highlightsClient.getHighlights({ version_id: 111, passage_id: 'MAT.1' }),
      ).rejects.toThrow(
        'Authentication required. Please provide a token or sign in before accessing highlights.',
      );
    });

    it('requires an explicit lat when localStorage is unavailable (SSR/Node)', async () => {
      // In an environment without `localStorage` there is no ambient token, so
      // the implicit fallback throws and callers must pass `lat` explicitly.
      vi.stubGlobal('localStorage', undefined);

      await expect(
        highlightsClient.getHighlights({ version_id: 111, passage_id: 'MAT.1' }),
      ).rejects.toThrow(
        'Authentication required. Please provide a token or sign in before accessing highlights.',
      );

      const highlights = await highlightsClient.getHighlights(
        { version_id: 111, passage_id: 'MAT.1' },
        'explicit-token',
      );
      expect(highlights.data).toHaveLength(2);
    });

    it('validates version_id and passage_id before making a request', async () => {
      await expect(
        highlightsClient.getHighlights({ version_id: 0, passage_id: 'MAT.1' }, 'token'),
      ).rejects.toThrow('Version ID must be a positive integer');

      await expect(
        highlightsClient.getHighlights({ version_id: 111, passage_id: '  ' }, 'token'),
      ).rejects.toThrow('Passage ID must be a non-empty string');
    });

    it('returns an empty collection when the API responds 204 (no highlights)', async () => {
      server.use(
        http.get(`https://${apiHost}/v1/highlights`, () => new HttpResponse(null, { status: 204 })),
      );

      const highlights = await highlightsClient.getHighlights(
        { version_id: 111, passage_id: 'MAT.1' },
        'test-token',
      );

      expect(highlights).toEqual({ data: [], next_page_token: null });
    });

    it('throws a helpful error when the API response is malformed', async () => {
      server.use(
        http.get(`https://${apiHost}/v1/highlights`, () =>
          HttpResponse.json({ data: [{ wrong_shape: true }] }),
        ),
      );

      await expect(
        highlightsClient.getHighlights({ version_id: 111, passage_id: 'MAT.1' }, 'token'),
      ).rejects.toThrow('Unexpected highlights API response');
    });
  });

  describe('createHighlight', () => {
    it('POSTs the enveloped body ({ request_id, highlight: { bible_id, ... } })', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(`https://${apiHost}/v1/highlights`, async ({ request }) => {
          capturedBody = await request.json();
          const body = capturedBody as { highlight: Record<string, unknown> };
          return HttpResponse.json(body.highlight, { status: 201 });
        }),
      );

      const highlight = await highlightsClient.createHighlight(
        { version_id: 111, passage_id: 'MAT.1.1', color: 'fffe00' },
        'test-token',
      );

      expect(capturedBody).toEqual({
        request_id: expect.stringMatching(/.+/) as string,
        highlight: { bible_id: 111, passage_id: 'MAT.1.1', color: 'fffe00' },
      });
      expect(highlight).toEqual({ version_id: 111, passage_id: 'MAT.1.1', color: 'fffe00' });
    });

    it('creates a highlight against the contract-enforcing default handler', async () => {
      const highlight = await highlightsClient.createHighlight(
        { version_id: 111, passage_id: 'MAT.1.1', color: 'fffe00' },
        'test-token',
      );

      expect(highlight).toEqual({ version_id: 111, passage_id: 'MAT.1.1', color: 'fffe00' });
    });

    it('normalizes an uppercase color to lowercase on the wire (API is lowercase-only)', async () => {
      let capturedBody: { highlight: { color: string } } | undefined;
      server.use(
        http.post(`https://${apiHost}/v1/highlights`, async ({ request }) => {
          capturedBody = (await request.json()) as { highlight: { color: string } };
          return HttpResponse.json(capturedBody.highlight, { status: 201 });
        }),
      );

      const highlight = await highlightsClient.createHighlight(
        { version_id: 111, passage_id: 'MAT.1.1', color: 'FFC66F' },
        'test-token',
      );

      expect(capturedBody?.highlight.color).toBe('ffc66f');
      expect(highlight).toEqual({ version_id: 111, passage_id: 'MAT.1.1', color: 'ffc66f' });
    });

    it('validates input before making a request', async () => {
      await expect(
        highlightsClient.createHighlight(
          { version_id: 0, passage_id: 'MAT.1.1', color: 'fffe00' },
          'token',
        ),
      ).rejects.toThrow('Version ID must be a positive integer');

      await expect(
        highlightsClient.createHighlight(
          { version_id: 111, passage_id: '', color: 'fffe00' },
          'token',
        ),
      ).rejects.toThrow('Passage ID must be a non-empty string');

      await expect(
        highlightsClient.createHighlight(
          { version_id: 111, passage_id: 'MAT.1.1', color: '#fffe00' },
          'token',
        ),
      ).rejects.toThrow('Color must be a 6-character hex string without #');
    });
  });

  describe('deleteHighlight', () => {
    it('DELETEs with a required bible_id param and Bearer auth', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');

      await expect(
        highlightsClient.deleteHighlight('MAT.1.1', { version_id: 111 }, 'test-token'),
      ).resolves.toBeUndefined();

      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/v1/highlights/MAT.1.1');
      expect(url).toContain('bible_id=111');
      expect(url).not.toContain('lat=');
      expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-token');
    });

    it('validates input before making a request', async () => {
      await expect(
        highlightsClient.deleteHighlight('', { version_id: 111 }, 'token'),
      ).rejects.toThrow('Passage ID must be a non-empty string');

      await expect(
        highlightsClient.deleteHighlight('MAT.1.1', { version_id: 0 }, 'token'),
      ).rejects.toThrow('Version ID must be a positive integer');
    });
  });
});
