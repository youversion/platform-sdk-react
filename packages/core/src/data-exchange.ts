import type { ApiClient } from './client';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import { resolveAuthToken } from './auth-token';
import { parseGrantedPermissions } from './permissions';
import { DataExchangeTokenResponseSchema } from './schemas/data-exchange';

/**
 * Data exchange is YouVersion's just-in-time permission grant flow: a signed-in
 * user who has not yet granted an app a data-exchange permission (e.g.
 * `highlights`) is sent to a hosted consent page, and returns with the grant.
 *
 * The browser flow is:
 *   1. {@link DataExchangeClient.updateToken} mints a short-lived token
 *      (`POST /data-exchange/token`).
 *   2. The app full-page redirects to {@link buildDataExchangeUrl}.
 *   3. On return, the hosted page appends `data_exchange_status` and
 *      `granted_permissions`, parsed by {@link parseDataExchangeCallback}.
 *
 * Mirrors the Swift SDK's `YouVersionAPI.DataExchange` contract.
 */

export class DataExchangeClient {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Reads the auth token from the argument or the ambient platform
   * configuration, mirroring {@link HighlightsClient}. Server-side callers
   * (no `localStorage`) must pass `lat` explicitly.
   */
  private getAuthToken(lat?: string): string {
    return resolveAuthToken(lat, 'requesting a data exchange');
  }

  /**
   * Mints a short-lived data-exchange token for the given permissions.
   *
   * `POST https://<apiHost>/data-exchange/token?app-key=<appKey>` with
   * `Authorization: Bearer <accessToken>` and body
   * `{"requested_permissions": [...]}`. Expects `201 { "token": "..." }`.
   *
   * @throws when no app key or access token is available, or the server
   *   responds with a non-2xx status (401 = not permitted), or the response
   *   fails schema validation.
   */
  async updateToken(permissions: string[], lat?: string): Promise<string> {
    const appKey = this.client.config.appKey;
    if (!appKey) {
      throw new Error('App key is required to request a data exchange token.');
    }

    const response = await this.client.post<unknown>(
      `/data-exchange/token`,
      { requested_permissions: permissions },
      { 'app-key': appKey },
      { Authorization: `Bearer ${this.getAuthToken(lat)}` },
    );

    const parsed = DataExchangeTokenResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new Error(`Unexpected data exchange token response: ${parsed.error.message}`);
    }
    return parsed.data.token;
  }
}

/**
 * Builds the hosted data-exchange consent URL the app full-page redirects to.
 * Matches the Swift SDK: `token`, `app_key`, and `x-yvp-app-key` query params.
 */
export function buildDataExchangeUrl(
  token: string,
  appKey: string,
  apiHost: string = YouVersionPlatformConfiguration.apiHost,
): string {
  const url = new URL(`https://${apiHost}/data-exchange`);
  url.searchParams.set('token', token);
  url.searchParams.set('app_key', appKey);
  url.searchParams.set('x-yvp-app-key', appKey);
  return url.toString();
}

/**
 * The query params the data-exchange flow appends to the callback URL (parsed by
 * {@link parseDataExchangeCallback}). {@link handleDataExchangeCallback} strips
 * exactly these on cleanup, leaving any unrelated app params untouched.
 */
const DATA_EXCHANGE_CALLBACK_PARAMS = ['data_exchange_status', 'granted_permissions'] as const;

export type DataExchangeStatus = 'granted' | 'cancel' | 'failure';

export type DataExchangeCallbackResult = {
  status: DataExchangeStatus;
  grantedPermissions: string[];
};

/**
 * Parses a data-exchange return from a URL query string. Pure — no DOM. Returns
 * `null` when the query has no `data_exchange_status` (i.e. not a data-exchange
 * return). `data_exchange_status` maps `granted`/`cancel` verbatim; anything
 * else (including a missing value) is treated as `failure`.
 */
export function parseDataExchangeCallback(search: string): DataExchangeCallbackResult | null {
  const params = new URLSearchParams(search);
  if (!params.has('data_exchange_status')) return null;
  const raw = params.get('data_exchange_status');
  const status: DataExchangeStatus =
    raw === 'granted' ? 'granted' : raw === 'cancel' ? 'cancel' : 'failure';
  return { status, grantedPermissions: parseGrantedPermissions(params) };
}

/**
 * Browser entry point for handling a data-exchange return on page load. Reads
 * `window.location.search`; on a `granted` return it reconciles the permission
 * cache with the server-reported `granted_permissions`, then strips the query
 * params (mirroring the sign-in callback cleanup). Returns the parsed result, or
 * `null` when the current URL is not a data-exchange return.
 *
 * Cleanup surgically removes only the data-exchange params, preserving any
 * unrelated app query params and the hash fragment.
 *
 * Grant safety: the just-in-time data-exchange flow is a fire-and-forget
 * full-page redirect, so the user signed in when this callback loads is not
 * guaranteed to be the one who started the flow (e.g. user B signs in on another
 * tab mid-redirect). The grant is only saved when the initiator recorded at
 * {@link YouVersionPlatformConfiguration.saveDataExchangeInitiator} still matches
 * the current user. Any mismatch — a different user, or a missing initiator (a
 * legacy pending state or a return we did not originate) — fails closed: the
 * grant is discarded and the result is downgraded to a `failure` so callers
 * re-prompt instead of proceeding as granted. Dropping a legitimate grant is
 * harmless — it just re-prompts — whereas saving one for the wrong user is not.
 *
 * The sign-in callback (see `Users.ts`) needs no such check: it derives the user
 * profile from the same ID token that carries `granted_permissions`, so the
 * grant is inherently bound to the correct user.
 */
export function handleDataExchangeCallback(): DataExchangeCallbackResult | null {
  const browserWindow = globalThis.window;
  if (!browserWindow) return null;
  const parsed = parseDataExchangeCallback(browserWindow.location.search);
  if (!parsed) return null;

  // Read and clear the initiator up front so a stale value can never authorize a
  // later, unrelated return.
  const initiator = YouVersionPlatformConfiguration.dataExchangeInitiator;
  YouVersionPlatformConfiguration.clearDataExchangeInitiator();

  let result = parsed;
  if (parsed.status === 'granted' && parsed.grantedPermissions.length > 0) {
    const currentUserId = YouVersionPlatformConfiguration.storedUserInfo?.id ?? null;
    if (initiator && currentUserId && initiator === currentUserId) {
      YouVersionPlatformConfiguration.saveGrantedPermissions(parsed.grantedPermissions);
    } else {
      // Initiator missing or a different user is signed in: discard the grant
      // and degrade to a failed exchange.
      result = { status: 'failure', grantedPermissions: [] };
    }
  }

  const cleanUrl = new URL(browserWindow.location.href);
  for (const param of DATA_EXCHANGE_CALLBACK_PARAMS) {
    cleanUrl.searchParams.delete(param);
  }
  browserWindow.history.replaceState({}, '', cleanUrl.toString());

  return result;
}
