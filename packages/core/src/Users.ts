import type { AuthenticationScopes, SignInWithYouVersionPermissionValues } from './types';
import { YouVersionUserInfo } from './YouVersionUserInfo';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import { SignInWithYouVersionPKCEAuthorizationRequestBuilder } from './SignInWithYouVersionPKCE';
import { SignInWithYouVersionResult } from './SignInWithYouVersionResult';
import { parseGrantedPermissions, parsePermissionList } from './permissions';
import {
  IdTokenClaimsSchema,
  StatePermissionsStashSchema,
  TokenExchangeResponseSchema,
  TokenRefreshResponseSchema,
  type IdTokenClaims,
  type StatePermissionsStash,
  type TokenExchangeResponse,
} from './schemas/auth';
import { getLocalStorage, removeStorageItem, setStorageItem } from './web-storage';

const MISSING_LOCAL_STORAGE_MESSAGE =
  'Sign In with YouVersion requires localStorage, which is not available in this environment';

/**
 * A resolvable store is not a writable one, so the two failures get separate
 * messages: this is the one you see when the store exists and refused the write
 * — Safari private mode's zero-byte quota, or a genuinely full one.
 */
const REJECTED_LOCAL_STORAGE_WRITE_MESSAGE =
  'Sign In with YouVersion could not write to localStorage; the store rejected the write (its quota may be full, as it always is in Safari private browsing)';

/**
 * The OAuth handoff has to survive a full-page redirect, so it cannot fall back
 * to memory the way the fail-soft accessors do.
 */
const requireLocalStorage = (): Storage => {
  const storage = getLocalStorage();
  if (!storage) {
    throw new Error(MISSING_LOCAL_STORAGE_MESSAGE);
  }
  return storage;
};

/**
 * Writes a value the OAuth callback cannot proceed without. A resolvable store
 * can still reject writes (Safari private mode), and silently losing the
 * verifier here would surface after the redirect as the far more confusing
 * "Missing required authentication parameters" — so fail now, before redirecting.
 */
const persistOrThrow = (storage: Storage, key: string, value: string): void => {
  if (!setStorageItem(storage, key, value)) {
    throw new Error(REJECTED_LOCAL_STORAGE_WRITE_MESSAGE);
  }
};

/** Stash key for `granted_permissions` seen on the pre-code OAuth hop. */
const PENDING_GRANTED_PERMISSIONS_KEY = 'youversion-auth-pending-granted-permissions';

/**
 * Stash key for the data-exchange permissions REQUESTED at `signIn` (e.g.
 * `highlights`), bound to the OAuth `state`. Seeded optimistically into the
 * granted cache on callback because the web flow returns no grant echo — see
 * the union in {@link YouVersionAPIUsers.exchangeCodeForTokens}.
 */
const REQUESTED_PERMISSIONS_KEY = 'youversion-auth-requested-permissions';

/** OIDC scopes that must not be stored in the data-exchange permission cache. */
const OIDC_SCOPES = new Set(['openid', 'profile', 'email', 'offline_access']);

type PendingGrantedPermissionsStash = StatePermissionsStash;

type RequestedPermissionsStash = StatePermissionsStash;

/**
 * Dedupe map for in-flight/settled code-for-token exchanges, keyed by the
 * single-use authorization `code`. Under React StrictMode the auth init effect
 * double-invokes and both runs call {@link YouVersionAPIUsers.handleAuthCallback}
 * with the same `code` still in the URL; without deduping, the second exchange
 * 400s (single-use code already spent) and its catch path clears the tokens and
 * granted-permissions cache the first run just seeded. Entries are kept after
 * settlement — a code is single-use per page load, and a failed exchange must
 * not be retried — and module state resets naturally on reload.
 */
const inFlightCodeExchanges = new Map<string, Promise<SignInWithYouVersionResult>>();

/** Test-only: clears the code-exchange dedupe map between test cases. */
export function __resetAuthCallbackDedupeForTests(): void {
  inFlightCodeExchanges.clear();
}

/**
 * In-flight token refresh shared across concurrent callers. There is only ever
 * one refresh token, so a single slot suffices (no keying needed). Under React
 * StrictMode the auth init effect double-invokes and both runs call
 * {@link YouVersionAPIUsers.refreshTokenIfNeeded} while the token reads expired;
 * without sharing, both spend the same single-use refresh token and the loser's
 * failure runs {@link YouVersionPlatformConfiguration.clearAuthTokens}, wiping
 * the session and granted-permissions cache the winner just re-established.
 *
 * Unlike the code-exchange map, this slot is CLEARED once settled: a later,
 * genuine refresh (e.g. the token expiring an hour on) must be able to run.
 * Sharing applies only to calls that overlap in time.
 */
let inFlightRefresh: Promise<boolean> | null = null;

/** Test-only: clears the shared in-flight refresh between test cases. */
export function __resetTokenRefreshDedupeForTests(): void {
  inFlightRefresh = null;
}

/**
 * Discards everything the OAuth handoff stashed for the redirect round-trip.
 * Cleanup only — it never throws, so it is safe on both the success and the
 * failure path of the code exchange.
 */
const clearOAuthHandoff = (storage: Storage | null): void => {
  removeStorageItem(storage, 'youversion-auth-code-verifier');
  removeStorageItem(storage, 'youversion-auth-redirect-uri');
  removeStorageItem(storage, 'youversion-auth-state');
  removeStorageItem(storage, PENDING_GRANTED_PERMISSIONS_KEY);
  removeStorageItem(storage, REQUESTED_PERMISSIONS_KEY);
};

/**
 * Persist early grants bound to the OAuth `state` that produced them.
 *
 * Takes the store the caller already resolved rather than re-resolving: the
 * callback path holds a {@link requireLocalStorage} handle, and re-reading the
 * global here could silently write somewhere else (or nowhere).
 *
 * This one write is deliberately soft. It happens mid-callback, after signIn
 * already proved the store accepts writes, and losing it costs only the grant
 * echo — the permission cache degrades to "not granted" and the permission
 * machine re-prompts. Failing the callback outright would turn a sign-in that
 * can still complete into a hard error, which is strictly worse.
 */
const stashPendingGrantedPermissions = (
  storage: Storage,
  state: string,
  permissions: string[],
): void => {
  const payload: PendingGrantedPermissionsStash = {
    state,
    permissions,
  };
  setStorageItem(storage, PENDING_GRANTED_PERMISSIONS_KEY, JSON.stringify(payload));
};

/**
 * Read early grants only when they were stashed for this OAuth `state`.
 * Mismatched or legacy unbound values are discarded (fail closed).
 */
const readPendingGrantedPermissions = (storage: Storage | null, state: string): string[] => {
  const raw = storage?.getItem(PENDING_GRANTED_PERMISSIONS_KEY);
  removeStorageItem(storage, PENDING_GRANTED_PERMISSIONS_KEY);
  if (!raw) return [];

  try {
    const parsed = StatePermissionsStashSchema.safeParse(JSON.parse(raw));
    if (parsed.success && parsed.data.state === state) {
      return parsed.data.permissions;
    }
  } catch {
    // Legacy plain comma-list (no state binding) — discard.
  }
  return [];
};

/**
 * Persist the requested data-exchange permissions bound to the OAuth `state`.
 *
 * Written with {@link persistOrThrow} into the caller's resolved store: this is
 * part of the pre-redirect handoff, and since the web flow echoes no grants, it
 * is the ONLY evidence the callback has that these permissions were requested.
 * Losing it would surface after the redirect as a permission re-prompt the user
 * just consented to, so fail here, before we navigate away.
 */
const stashRequestedPermissions = (
  storage: Storage,
  state: string,
  permissions: string[],
): void => {
  const payload: RequestedPermissionsStash = {
    state,
    permissions,
  };
  persistOrThrow(storage, REQUESTED_PERMISSIONS_KEY, JSON.stringify(payload));
};

/**
 * Read the requested permissions only when they were stashed for this OAuth
 * `state`. Mismatched or malformed values are discarded (fail closed), mirroring
 * {@link readPendingGrantedPermissions}.
 */
const readRequestedPermissions = (storage: Storage | null, state: string): string[] => {
  const raw = storage?.getItem(REQUESTED_PERMISSIONS_KEY);
  removeStorageItem(storage, REQUESTED_PERMISSIONS_KEY);
  if (!raw) return [];

  try {
    const parsed = StatePermissionsStashSchema.safeParse(JSON.parse(raw));
    if (parsed.success && parsed.data.state === state) {
      return parsed.data.permissions;
    }
  } catch {
    // Malformed stash — discard.
  }
  return [];
};

export class YouVersionAPIUsers {
  /**
   * Presents the YouVersion login flow to the user and returns the login result upon completion.
   *
   * This function authenticates the user with YouVersion.
   * The function redirects to the YouVersion authorization URL and expects the callback to be handled separately.
   *
   * @param redirectURL - The URL to redirect back to after authentication.
   * @param scopes - The OIDC scopes given to the authentication call (e.g. `profile`, `email`).
   * @param permissions - YouVersion data-exchange permissions to request (e.g. `highlights`).
   *   These are sent as a comma-joined `requested_permissions` param, separate from OIDC scopes.
   * @throws An error if authentication fails or configuration is invalid.
   */
  static async signIn(
    redirectURL: string,
    scopes?: AuthenticationScopes[],
    permissions?: SignInWithYouVersionPermissionValues[],
  ): Promise<void> {
    const appKey = YouVersionPlatformConfiguration.appKey;
    if (!appKey) {
      throw new Error('YouVersionPlatformConfiguration.appKey must be set before calling signIn');
    }

    const storage = requireLocalStorage();

    const authorizationRequest = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
      appKey,
      new URL(redirectURL),
      scopes,
      permissions,
    );

    // Store auth data for callback handler
    persistOrThrow(
      storage,
      'youversion-auth-code-verifier',
      authorizationRequest.parameters.codeVerifier,
    );
    const redirectUrlString = redirectURL.toString().endsWith('/')
      ? redirectURL.toString().slice(0, -1)
      : redirectURL.toString();
    persistOrThrow(storage, 'youversion-auth-redirect-uri', redirectUrlString);
    persistOrThrow(storage, 'youversion-auth-state', authorizationRequest.parameters.state);
    // Clear any stash left by a prior abandoned flow (it's only ever produced later,
    // during the callback pre-code hop, and never needs to survive a new signIn).
    // Otherwise a previous user's abandoned grants could leak into this flow.
    removeStorageItem(storage, PENDING_GRANTED_PERMISSIONS_KEY);
    // Same hygiene for a stale requested-permissions stash from an abandoned flow.
    removeStorageItem(storage, REQUESTED_PERMISSIONS_KEY);
    // Same hygiene for an abandoned just-in-time data-exchange initiator.
    YouVersionPlatformConfiguration.clearDataExchangeInitiator();

    // Stash the REQUESTED data-exchange permissions (not the OIDC scopes) bound
    // to this OAuth `state`. On the web flow the server returns no grant echo
    // (no URL param, no token scope) for these, so the callback seeds them
    // optimistically from here — see exchangeCodeForTokens. Empty/absent → no stash.
    if (permissions && permissions.length > 0) {
      stashRequestedPermissions(storage, authorizationRequest.parameters.state, permissions);
    }

    // Simple redirect to authorization URL
    window.location.href = authorizationRequest.url.toString();
  }

  /**
   * Handles the OAuth callback after user authentication.
   *
   * Call this method when your app loads to check if the current URL contains
   * an OAuth callback with authorization code. If found, it exchanges the code
   * for tokens and stores them.
   *
   * @returns Promise<SignInWithYouVersionResult | null> - SignInWithYouVersionResult if callback was handled, null otherwise
   * @throws An error if token exchange fails
   */
  static async handleAuthCallback(): Promise<SignInWithYouVersionResult | null> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    // Check if this is an OAuth callback
    if (!state && !error) {
      return null;
    }

    // Handle OAuth error
    if (error) {
      const errorDescription = urlParams.get('error_description') || error;
      throw new Error(`OAuth authentication failed: ${errorDescription}`);
    }

    const storage = requireLocalStorage();

    // Verify state parameter
    const storedState = storage.getItem('youversion-auth-state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // If we don't have a code, this might be the first callback with user data
    // We need to redirect to the server callback to get the authorization code.
    // Stash any granted_permissions from this hop first — Swift keeps the original
    // callback URL for grants, but the web flow navigates away to /auth/callback
    // and the final redirect with `code` may omit them.
    if (!code && state) {
      const earlyGrants = parseGrantedPermissions(urlParams);
      if (earlyGrants.length > 0) {
        stashPendingGrantedPermissions(storage, state, earlyGrants);
      }
      this.obtainLocation(window.location.href, state);
      return null;
    }

    // Get stored auth data
    const codeVerifier = storage.getItem('youversion-auth-code-verifier');
    const redirectUri = storage.getItem('youversion-auth-redirect-uri');

    if (!code || !codeVerifier || !redirectUri) {
      throw new Error('Missing required authentication parameters');
    }

    // Dedupe concurrent/repeated exchanges of this single-use code (e.g. the
    // StrictMode double-invocation) so only one token request is ever made and
    // no duplicate-400 catch path can wipe the grants the winning run seeded.
    // The synchronous get/set here (before the first await inside the exchange)
    // makes the check re-entrancy safe.
    const existingExchange = inFlightCodeExchanges.get(code);
    if (existingExchange) {
      return existingExchange;
    }

    const exchange = this.exchangeCodeForTokens(
      code,
      codeVerifier,
      redirectUri,
      state,
      urlParams,
      storage,
    );
    inFlightCodeExchanges.set(code, exchange);
    return exchange;
  }

  /**
   * Exchanges a single-use authorization `code` for tokens, persists the
   * resulting session/profile/grants, and returns the sign-in result. Callers
   * must dedupe by `code` (see {@link inFlightCodeExchanges}); on failure the
   * partial session is cleared and the error rethrown.
   *
   * `storage` is the store the caller already resolved via
   * {@link requireLocalStorage}, threaded in rather than re-resolved: the
   * handoff values read here were written to that store, and one policy for
   * the whole callback path keeps a mid-flow change in the global from
   * silently reading somewhere else (or nowhere).
   */
  private static async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string,
    state: string | null,
    urlParams: URLSearchParams,
    storage: Storage,
  ): Promise<SignInWithYouVersionResult> {
    try {
      // Exchange authorization code for tokens
      const tokenRequest = SignInWithYouVersionPKCEAuthorizationRequestBuilder.tokenURLRequest(
        code,
        codeVerifier,
        redirectUri,
      );

      const response = await fetch(tokenRequest);

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();

      const tokens = TokenExchangeResponseSchema.parse(JSON.parse(responseText));

      // Match Swift: union grants from (1) this URL, (2) stashed pre-code hop,
      // (3) token scope — then drop OIDC scopes before seeding the data-exchange
      // permission cache. Stash is state-bound so a leftover from another flow
      // cannot seed this user's optimistic permission cache.
      //
      // (4) is the optimistic seed of the permissions REQUESTED at signIn. On the
      // web flow the auth server returns ZERO grant evidence for data-exchange
      // permissions after consent — captured live 2026-07-23, the pre-code hop
      // carried only `state`, the code hop `scope="profile openid"`, and the token
      // body `scope: "profile openid"` — so sources (1)-(3) are all empty and the
      // machine would re-prompt right after sign-in. Seeding the request is
      // self-correcting: a 401/403 on the first write drops the permission
      // (removeGrantedPermission) and the machine's PERMISSION_LOST path re-prompts.
      // Same fail-closed state binding as the granted stash; a Set union means a
      // future server echo never double-counts.
      const stashedGrants = state ? readPendingGrantedPermissions(storage, state) : [];
      const requestedGrants = state ? readRequestedPermissions(storage, state) : [];
      const grantedPermissions = [
        ...new Set([
          ...parseGrantedPermissions(urlParams),
          ...stashedGrants,
          ...parsePermissionList(tokens.scope),
          ...requestedGrants,
        ]),
      ].filter((permission) => !OIDC_SCOPES.has(permission));

      // Extract user info from ID token
      const result = this.extractSignInResult(tokens);

      // Store tokens in configuration. The ID token is intentionally not
      // persisted — it is only used here to derive the user profile below.
      const tokensPersisted = YouVersionPlatformConfiguration.saveAuthData(
        result.accessToken || null,
        result.refreshToken || null,
        result.expiryDate || null,
      );

      // Persist the decoded user profile so it survives reloads without
      // retaining the ID token itself. This must happen before the permission
      // cache is seeded below, since grants are scoped to the current user.
      const profilePersisted = YouVersionPlatformConfiguration.saveUserInfo({
        id: result.yvpUserId,
        name: result.name,
        email: result.email,
        avatar_url: result.profilePicture,
      });

      // Every later read of the session goes back to storage, so a rejected
      // write means there is no session to return — fail into the catch below.
      if (!tokensPersisted || !profilePersisted) {
        throw new Error('Sign-in succeeded but the session could not be saved to browser storage');
      }

      // Persist the granted permissions into the optimistic permission cache so
      // a one-fell-swoop sign-in that requested `highlights` can apply a pending
      // highlight on return without a probe round-trip.
      if (grantedPermissions.length > 0) {
        YouVersionPlatformConfiguration.saveGrantedPermissions(grantedPermissions);
      }

      // Clean up localStorage. Never throwing matters most here: the session is
      // already persisted, so letting a store that rejects mutations (Safari
      // private mode) escape would drop us into the catch below, which would
      // clear the tokens a successful exchange just wrote.
      clearOAuthHandoff(storage);

      // Clean up URL
      const cleanUrl = new URL(window.location.href);
      cleanUrl.search = '';
      window.history.replaceState({}, '', cleanUrl.toString());

      return result;
    } catch (error) {
      YouVersionPlatformConfiguration.clearAuthTokens();
      clearOAuthHandoff(storage);
      throw error;
    }
  }

  /**
   * Redirects to the server callback endpoint to obtain authorization code
   */
  private static obtainLocation(callbackURL: string, state: string): void {
    const url = new URL(callbackURL);
    const params = new URLSearchParams(url.search);

    if (params.get('state') !== state) {
      throw new Error('Invalid state parameter');
    }

    // Redirect to the server callback endpoint with all the current parameters
    const serverCallbackUrl = new URL(
      `https://${YouVersionPlatformConfiguration.apiHost}/auth/callback`,
    );
    params.forEach((value, key) => {
      serverCallbackUrl.searchParams.set(key, value);
    });

    window.location.href = serverCallbackUrl.toString();
  }

  /**
   * Extracts sign-in result from token response
   */
  private static extractSignInResult(tokens: TokenExchangeResponse): SignInWithYouVersionResult {
    const idClaims = this.decodeJWT(tokens.id_token);

    const resultData = {
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
      refreshToken: tokens.refresh_token,
      yvpUserId: idClaims.sub,
      name: idClaims.name,
      profilePicture: idClaims.profile_picture,
      email: idClaims.email,
    };

    return new SignInWithYouVersionResult(resultData);
  }

  /**
   * Decodes JWT payload for UI display purposes.
   *
   * Note: We intentionally do not verify the JWT signature here because:
   *
   * 1. YouVersion's backend verifies all tokens on API requests
   * 2. This decoded data is only used for UI display
   * 3. No security decisions are made based on these claims
   *
   * @private
   */

  private static decodeJWT(token: string): IdTokenClaims {
    const segments = token.split('.');

    if (segments.length !== 3) {
      return {};
    }

    let base64 = segments[1]?.replace(/-/g, '+').replace(/_/g, '/');

    while (base64 && base64.length % 4 !== 0) {
      base64 += '=';
    }

    try {
      if (base64) {
        const data = atob(base64);
        // atob() returns a byte string (Latin-1); decode bytes as UTF-8 before JSON.parse.
        const bytes = Uint8Array.from(data, (char) => char.charCodeAt(0));
        const decodedPayload = new TextDecoder('utf-8').decode(bytes);
        const parsed = IdTokenClaimsSchema.safeParse(JSON.parse(decodedPayload));
        return parsed.success ? parsed.data : {};
      } else {
        return {};
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('JWT decode failed:', error);
      }
      return {};
    }
  }

  static signOut(): void {
    YouVersionPlatformConfiguration.clearAuthTokens();
  }

  /**
   * Retrieves user information for the authenticated user by decoding the provided JWT access token.
   *
   * This function extracts the user's profile information directly from the JWT token payload.
   *
   * @param accessToken - The JWT access token obtained from the login process.
   * @returns A Promise resolving to a YouVersionUserInfo object containing the user's profile information.
   * @throws An error if the access token is invalid or cannot be decoded.
   */
  static userInfo(idToken: string): YouVersionUserInfo {
    // Validate access token
    if (!idToken) {
      throw new Error('Invalid access token: must be a non-empty string');
    }

    try {
      // Decode JWT payload to extract user information
      const claims = this.decodeJWT(idToken);

      if (!claims || Object.keys(claims).length === 0) {
        throw new Error('Invalid JWT token: Unable to decode token payload');
      }

      const userInfoData = {
        id: claims.sub,
        name: claims.name,
        avatar_url: claims.profile_picture,
        email: claims.email,
      };

      return new YouVersionUserInfo(userInfoData);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to decode user information from JWT: ${error.message}`);
      } else {
        throw new Error('Failed to decode user information from JWT: Unknown error');
      }
    }
  }

  /**
   * Returns the user profile that was persisted at sign-in, or `null` if the
   * user is not signed in (or the stored profile is missing/invalid).
   *
   * This reads the decoded profile from storage rather than re-decoding the ID
   * token, which is never persisted.
   */
  static getStoredUserInfo(): YouVersionUserInfo | null {
    const stored = YouVersionPlatformConfiguration.storedUserInfo;
    if (!stored?.id) {
      return null;
    }
    return new YouVersionUserInfo(stored);
  }

  /**
   * Refreshes the access token using the stored refresh token.
   *
   * @returns Promise<SignInWithYouVersionResult | null> - New tokens if refresh succeeds, null otherwise
   * @throws An error if refresh fails or no refresh token is available
   */
  static async refreshTokens(): Promise<SignInWithYouVersionResult | null> {
    const refreshToken = YouVersionPlatformConfiguration.refreshToken;
    const appKey = YouVersionPlatformConfiguration.appKey;

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    if (!appKey) {
      throw new Error(
        'YouVersionPlatformConfiguration.appKey must be set before refreshing tokens',
      );
    }

    try {
      const url = new URL(`https://${YouVersionPlatformConfiguration.apiHost}/auth/token`);

      const parameters = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: appKey,
      });

      const request = new Request(url, {
        method: 'POST',
        body: parameters,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const response = await fetch(request);

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const tokens = TokenRefreshResponseSchema.parse(await response.json());

      // Create result with new tokens. The persisted user profile is left
      // untouched — refreshing only rotates the access/refresh tokens.
      const result = new SignInWithYouVersionResult({
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in,
        refreshToken: tokens.refresh_token,
      });

      // Store updated tokens. The rotation already spent the old refresh token,
      // so an unpersisted result is a dead session, not a refreshed one.
      const persisted = YouVersionPlatformConfiguration.saveAuthData(
        result.accessToken || null,
        result.refreshToken || null,
        result.expiryDate || null,
      );
      if (!persisted) {
        throw new Error('the rotated tokens could not be saved to browser storage');
      }

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Token refresh failed: ${error.message}`);
      } else {
        throw new Error('Token refresh failed: Unknown error');
      }
    }
  }

  /**
   * Checks if the current access token is expired or about to expire.
   *
   * @returns true if token is expired or about to expire
   */
  static isTokenExpired(): boolean {
    const expiryDate = YouVersionPlatformConfiguration.tokenExpiryDate;
    if (!expiryDate) {
      return true; // No expiry date means no token or invalid token
    }

    return new Date().getTime() >= expiryDate.getTime();
  }

  /**
   * Refreshes the access token if it's expired or about to expire.
   *
   * @returns Promise<boolean> - true if refresh was successful or not needed, false if failed
   */
  static async refreshTokenIfNeeded(): Promise<boolean> {
    if (!this.isTokenExpired()) {
      return true; // Token is still valid
    }

    // Share one refresh across overlapping callers so a duplicate (e.g. the
    // StrictMode double-invocation) can't spend the single-use refresh token a
    // second time and wipe the session on its failure. The get/set here is
    // synchronous before the first await, so the check is re-entrancy safe.
    const existingRefresh = inFlightRefresh;
    if (existingRefresh) {
      return existingRefresh;
    }

    const refresh = this.performTokenRefresh();
    inFlightRefresh = refresh;

    try {
      return await refresh;
    } finally {
      // Clear the slot once settled so a later, genuine refresh can run. Guard
      // against clobbering a newer refresh that a subsequent call may have set.
      if (inFlightRefresh === refresh) {
        inFlightRefresh = null;
      }
    }
  }

  /**
   * Performs a single token refresh, clearing the session exactly once on
   * failure. Callers must share this via {@link inFlightRefresh} so a duplicate
   * refresh never runs concurrently; a shared failure clears tokens once and
   * resolves false for every caller awaiting it.
   */
  private static async performTokenRefresh(): Promise<boolean> {
    try {
      const result = await this.refreshTokens();
      return !!result;
    } catch {
      // Refresh failed, clear tokens
      YouVersionPlatformConfiguration.clearAuthTokens();
      return false;
    }
  }
}
