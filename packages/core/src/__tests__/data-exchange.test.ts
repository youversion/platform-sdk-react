import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { ApiClient } from '../client';
import {
  DataExchangeClient,
  buildDataExchangeUrl,
  parseDataExchangeCallback,
  handleDataExchangeCallback,
} from '../data-exchange';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';
import {
  DataExchangeTokenRequestSchema,
  type DataExchangeTokenRequest,
} from '../schemas/data-exchange';
import { server } from './setup';

const apiHost = process.env.YVP_API_HOST;

/**
 * Stubs `window` with a location parsed from `href` plus a spyable
 * `history.replaceState`. `localStorage` is left as the test polyfill so
 * {@link YouVersionPlatformConfiguration} reads/writes real (mock) storage.
 */
function stubLocation(href: string): ReturnType<typeof vi.fn> {
  const replaceState = vi.fn();
  const url = new URL(href);
  vi.stubGlobal('window', {
    location: { href, search: url.search },
    history: { replaceState },
  });
  return replaceState;
}

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
    let seenBody: DataExchangeTokenRequest | null = null;
    let seenUrl = '';
    server.use(
      http.post(`https://${apiHost}/data-exchange/token`, async ({ request }) => {
        seenAuth = request.headers.get('Authorization');
        seenBody = DataExchangeTokenRequestSchema.parse(await request.json());
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

describe('handleDataExchangeCallback URL cleanup', () => {
  beforeEach(() => {
    // A signed-in user who is also the flow initiator, so a `granted` return is
    // honored and these tests can focus on URL cleanup.
    YouVersionPlatformConfiguration.clearAuthTokens();
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-a', name: 'A' });
    YouVersionPlatformConfiguration.saveDataExchangeInitiator();
  });

  afterEach(() => {
    YouVersionPlatformConfiguration.clearAuthTokens();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('strips only the data-exchange params, preserving app params and the hash', () => {
    const replaceState = stubLocation(
      'https://app.example.com/read?tab=notes&ref=abc&data_exchange_status=granted&granted_permissions=highlights#section',
    );

    const result = handleDataExchangeCallback();
    expect(result).toEqual({ status: 'granted', grantedPermissions: ['highlights'] });

    expect(replaceState).toHaveBeenCalledTimes(1);
    const cleaned = new URL(String(replaceState.mock.calls[0]?.[2]));
    expect(cleaned.searchParams.get('tab')).toBe('notes');
    expect(cleaned.searchParams.get('ref')).toBe('abc');
    expect(cleaned.searchParams.has('data_exchange_status')).toBe(false);
    expect(cleaned.searchParams.has('granted_permissions')).toBe(false);
    expect(cleaned.hash).toBe('#section');
  });

  it('leaves no dangling "?" when only exchange params were present', () => {
    const replaceState = stubLocation(
      'https://app.example.com/read?data_exchange_status=granted&granted_permissions=highlights',
    );

    handleDataExchangeCallback();

    const cleanedUrl = String(replaceState.mock.calls[0]?.[2]);
    expect(cleanedUrl).toBe('https://app.example.com/read');
    expect(cleanedUrl).not.toContain('?');
  });

  it('returns null and does not touch history when the URL is not a data-exchange return', () => {
    const replaceState = stubLocation('https://app.example.com/read?tab=notes');
    expect(handleDataExchangeCallback()).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe('handleDataExchangeCallback grant safety (initiating user)', () => {
  const GRANTED_URL =
    'https://app.example.com/read?data_exchange_status=granted&granted_permissions=highlights';

  beforeEach(() => {
    YouVersionPlatformConfiguration.clearAuthTokens();
  });

  afterEach(() => {
    YouVersionPlatformConfiguration.clearAuthTokens();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('saves the grant when the initiating user is still signed in on return', () => {
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-a', name: 'A' });
    YouVersionPlatformConfiguration.saveDataExchangeInitiator();

    stubLocation(GRANTED_URL);
    const result = handleDataExchangeCallback();

    expect(result).toEqual({ status: 'granted', grantedPermissions: ['highlights'] });
    expect(YouVersionPlatformConfiguration.grantedPermissions).toContain('highlights');
    // Consumed on return so it cannot authorize a later, unrelated callback.
    expect(YouVersionPlatformConfiguration.dataExchangeInitiator).toBeNull();
  });

  it('discards the grant when a different user signed in mid-redirect', () => {
    // User A initiates the flow...
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-a', name: 'A' });
    YouVersionPlatformConfiguration.saveDataExchangeInitiator();
    // ...then user B signs in on another tab before the redirect returns.
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-b', name: 'B' });

    const replaceState = stubLocation(GRANTED_URL);
    const result = handleDataExchangeCallback();

    // Grant is not honored; the result degrades to a failed exchange.
    expect(result).toEqual({ status: 'failure', grantedPermissions: [] });

    // Cache untouched for the signed-in user (B)...
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);
    // ...and for the initiating user (A) once they sign back in.
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-a', name: 'A' });
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);

    // URL cleanup still happens on mismatch.
    expect(replaceState).toHaveBeenCalledTimes(1);
    const cleaned = new URL(String(replaceState.mock.calls[0]?.[2]));
    expect(cleaned.searchParams.has('data_exchange_status')).toBe(false);
    expect(cleaned.searchParams.has('granted_permissions')).toBe(false);
  });

  it('discards the grant when no initiator was recorded (legacy pending state)', () => {
    // Signed-in user, but no initiator was ever stored for this return.
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-a', name: 'A' });

    const replaceState = stubLocation(GRANTED_URL);
    const result = handleDataExchangeCallback();

    expect(result).toEqual({ status: 'failure', grantedPermissions: [] });
    expect(YouVersionPlatformConfiguration.grantedPermissions).toEqual([]);

    // URL cleanup still happens.
    expect(replaceState).toHaveBeenCalledTimes(1);
    const cleaned = new URL(String(replaceState.mock.calls[0]?.[2]));
    expect(cleaned.searchParams.has('data_exchange_status')).toBe(false);
    expect(cleaned.searchParams.has('granted_permissions')).toBe(false);
  });
});
