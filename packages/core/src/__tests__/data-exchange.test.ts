import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from '../client';
import {
  DataExchangeClient,
  buildDataExchangeUrl,
  parseDataExchangeCallback,
} from '../data-exchange';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

describe('DataExchangeClient.updateToken', () => {
  let client: DataExchangeClient;

  beforeEach(() => {
    client = new DataExchangeClient(
      new ApiClient({ apiHost, appKey: 'test-app', installationId: 'test-installation' }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('POSTs requested_permissions with app-key query + Bearer auth and returns the token', async () => {
    let seenAuth: string | null = null;
    let seenBody: unknown = null;
    let seenUrl = '';
    server.use(
      http.post(`https://${apiHost}/data-exchange/token`, async ({ request }) => {
        seenAuth = request.headers.get('Authorization');
        seenBody = await request.json();
        seenUrl = request.url;
        return HttpResponse.json({ token: 'dx-token-123' }, { status: 201 });
      }),
    );

    const token = await client.updateToken(['highlights'], 'my-access-token');

    expect(token).toBe('dx-token-123');
    expect(seenAuth).toBe('Bearer my-access-token');
    expect(seenBody).toEqual({ requested_permissions: ['highlights'] });
    expect(seenUrl).toContain('app-key=test-app');
  });

  it('throws (401 = not permitted) when the server rejects', async () => {
    server.use(
      http.post(
        `https://${apiHost}/data-exchange/token`,
        () => new HttpResponse(null, { status: 401 }),
      ),
    );

    await expect(client.updateToken(['highlights'], 'tok')).rejects.toThrow();
  });

  it('throws when the response fails schema validation', async () => {
    server.use(
      http.post(`https://${apiHost}/data-exchange/token`, () =>
        HttpResponse.json({ not_a_token: true }, { status: 201 }),
      ),
    );

    await expect(client.updateToken(['highlights'], 'tok')).rejects.toThrow(
      /Unexpected data exchange token response/,
    );
  });
});

describe('buildDataExchangeUrl', () => {
  it('builds the hosted consent URL with token + both app-key params', () => {
    const url = new URL(buildDataExchangeUrl('tok-9', 'app-42', 'api.example.com'));
    expect(url.origin + url.pathname).toBe('https://api.example.com/data-exchange');
    expect(url.searchParams.get('token')).toBe('tok-9');
    expect(url.searchParams.get('app_key')).toBe('app-42');
    expect(url.searchParams.get('x-yvp-app-key')).toBe('app-42');
  });
});

describe('parseDataExchangeCallback', () => {
  it('returns null when there is no data_exchange_status', () => {
    expect(parseDataExchangeCallback('?state=abc&code=1')).toBeNull();
  });

  it('parses a granted return with granted_permissions', () => {
    expect(
      parseDataExchangeCallback('?data_exchange_status=granted&granted_permissions=highlights'),
    ).toEqual({ status: 'granted', grantedPermissions: ['highlights'] });
  });

  it('maps cancel verbatim and treats anything else as failure', () => {
    expect(parseDataExchangeCallback('?data_exchange_status=cancel')).toEqual({
      status: 'cancel',
      grantedPermissions: [],
    });
    expect(parseDataExchangeCallback('?data_exchange_status=weird')).toEqual({
      status: 'failure',
      grantedPermissions: [],
    });
    // Present but empty value → failure.
    expect(parseDataExchangeCallback('?data_exchange_status=')).toEqual({
      status: 'failure',
      grantedPermissions: [],
    });
  });
});
