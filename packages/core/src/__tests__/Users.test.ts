import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  YouVersionAPIUsers,
  __resetAuthCallbackDedupeForTests,
  __resetTokenRefreshDedupeForTests,
} from '../Users';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';
import { YouVersionUserInfo } from '../YouVersionUserInfo';
import { setupBrowserMocks, cleanupBrowserMocks } from './mocks/browser';

const mockFetch = vi.fn();

// Shared JWT fixture (HS256 header + `{sub,name,iat,email,profile_picture}`
// payload + invalid signature) reused across the token-exchange tests.
const MOCK_ID_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJwcm9maWxlX3BpY3R1cmUiOiJodHRwczovL2V4YW1wbGUuY29tL2F2YXRhci5qcGcifQ.invalid-signature';

/** Builds the token payload the /auth/token exchange returns; only `scope` varies per test. */
function makeTokens(scope: string) {
  return {
    access_token: 'access-token-123',
    expires_in: 3600,
    id_token: MOCK_ID_TOKEN,
    refresh_token: 'refresh-token-456',
    scope,
    token_type: 'Bearer',
  };
}

describe('YouVersionAPIUsers', () => {
  let mocks: ReturnType<typeof setupBrowserMocks>;

  const STANDARD_CALLBACK_SEARCH = '?state=test-state&code=auth-code';
  const STANDARD_CALLBACK_HREF = 'https://example.com/callback?state=test-state&code=auth-code';
  const DEFAULT_CALLBACK_PROFILE = {
    sub: '1234567890',
    name: 'John Doe',
    email: 'john@example.com',
  };

  /**
   * Stubs the crypto primitives (`getRandomValues`, `subtle.digest`, `btoa`)
   * that the PKCE `signIn` flow needs to build a deterministic authorize URL.
   */
  function stubSignInCrypto() {
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((array: ArrayBufferView) => {
      if (array instanceof Uint8Array) {
        for (let i = 0; i < array.length; i++) {
          array[i] = i;
        }
      }
      return array;
    });

    vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(new Uint8Array(32).buffer);
    mocks.btoa.mockReturnValue('mockBase64Value');
  }

  /**
   * Wires up the shared handleAuthCallback token-exchange setup: callback URL,
   * localStorage reads (state/verifier/redirect-uri + optional pending grant),
   * a successful token response for `scope`, and the decoded JWT profile.
   */
  function setupCallbackFlow({
    scope,
    pendingGrant,
    requestedGrant,
    search = STANDARD_CALLBACK_SEARCH,
    href = STANDARD_CALLBACK_HREF,
    profile = DEFAULT_CALLBACK_PROFILE,
  }: {
    scope: string;
    pendingGrant?: string;
    requestedGrant?: string;
    search?: string;
    href?: string;
    profile?: Record<string, unknown>;
  }) {
    mocks.window.location.search = search;
    mocks.window.location.href = href;

    mocks.localStorage.getItem.mockImplementation((key: string) => {
      switch (key) {
        case 'youversion-auth-state':
          return 'test-state';
        case 'youversion-auth-code-verifier':
          return 'code-verifier-123';
        case 'youversion-auth-redirect-uri':
          return 'https://example.com/callback';
        case 'youversion-auth-pending-granted-permissions':
          return pendingGrant ?? null;
        case 'youversion-auth-requested-permissions':
          return requestedGrant ?? null;
        default:
          return null;
      }
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: vi.fn().mockResolvedValue(JSON.stringify(makeTokens(scope))),
    });

    vi.mocked(atob).mockReturnValue(JSON.stringify(profile));
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // The code-exchange dedupe map is module-scoped and persists across test
    // cases within this file (it only resets on page reload in production).
    // Clear it so tests reusing `code=auth-code` don't see a prior exchange.
    __resetAuthCallbackDedupeForTests();

    // Setup global mocks
    mocks = setupBrowserMocks();
    vi.stubGlobal('fetch', mockFetch);

    // Override randomUUID for this test suite
    mocks.crypto.randomUUID = vi.fn(() => 'test-installation-id');

    // Reset location
    mocks.window.location.href = '';
    mocks.window.location.search = '';

    // Setup YouVersionPlatformConfiguration
    YouVersionPlatformConfiguration.appKey = 'test-app-key';
    YouVersionPlatformConfiguration.apiHost = 'api.youversion.com';
  });

  afterEach(() => {
    cleanupBrowserMocks();
    vi.unstubAllGlobals();
    YouVersionPlatformConfiguration.appKey = null;
  });

  describe('signIn', () => {
    afterEach(() => {
      // Restore the crypto spies here so restoration still happens even when an
      // assertion throws mid-test.
      vi.restoreAllMocks();
    });

    it('should throw error when appKey is not set', async () => {
      YouVersionPlatformConfiguration.appKey = null;

      await expect(YouVersionAPIUsers.signIn('https://example.com/callback')).rejects.toThrow(
        'YouVersionPlatformConfiguration.appKey must be set before calling signIn',
      );
    });

    it('should report the missing capability when localStorage is unusable', async () => {
      // React Native defines `window` but no Web Storage, so the PKCE handoff has
      // nowhere to stash the verifier — fail loudly rather than with a TypeError.
      stubSignInCrypto();
      vi.stubGlobal('localStorage', undefined);

      await expect(YouVersionAPIUsers.signIn('https://example.com/callback')).rejects.toThrow(
        'Sign In with YouVersion requires localStorage, which is not available in this environment',
      );
    });

    it('should report the missing capability when the store rejects the write', async () => {
      // Safari private mode hands out a readable store with a zero-byte quota:
      // `getItem` works, `setItem` throws. Losing the verifier here would only
      // surface after the redirect as "Missing required authentication
      // parameters", so fail before navigating away.
      stubSignInCrypto();
      mocks.localStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      await expect(YouVersionAPIUsers.signIn('https://example.com/callback')).rejects.toThrow(
        'Sign In with YouVersion requires localStorage, which is not available in this environment',
      );
      expect(mocks.window.location.href).toBe('');
    });

    it('should create authorization request and redirect on successful signIn', async () => {
      stubSignInCrypto();

      const redirectURL = 'https://example.com/callback';

      await YouVersionAPIUsers.signIn(redirectURL);

      // Verify localStorage items stored
      expect(mocks.localStorage.setItem).toHaveBeenCalledWith(
        'youversion-auth-code-verifier',
        expect.any(String),
      );
      expect(mocks.localStorage.setItem).toHaveBeenCalledWith(
        'youversion-auth-redirect-uri',
        redirectURL,
      );
      expect(mocks.localStorage.setItem).toHaveBeenCalledWith(
        'youversion-auth-state',
        expect.any(String),
      );

      // Verify redirect occurred
      expect(mocks.window.location.href).toContain('https://api.youversion.com/auth/authorize');
    });

    it('should forward requested permissions to the authorize URL', async () => {
      stubSignInCrypto();

      await YouVersionAPIUsers.signIn('https://example.com/callback', ['profile'], ['highlights']);

      expect(mocks.window.location.href).toContain('requested_permissions=highlights');
    });

    it('clears any stale pre-code granted-permissions stash from a prior abandoned flow', async () => {
      stubSignInCrypto();

      await YouVersionAPIUsers.signIn('https://example.com/callback');

      expect(mocks.localStorage.removeItem).toHaveBeenCalledWith(
        'youversion-auth-pending-granted-permissions',
      );
    });

    it('clears any stale requested-permissions stash from a prior abandoned flow', async () => {
      stubSignInCrypto();

      await YouVersionAPIUsers.signIn('https://example.com/callback');

      expect(mocks.localStorage.removeItem).toHaveBeenCalledWith(
        'youversion-auth-requested-permissions',
      );
    });

    it('stashes the requested data-exchange permissions bound to the OAuth state', async () => {
      stubSignInCrypto();

      await YouVersionAPIUsers.signIn('https://example.com/callback', ['profile'], ['highlights']);

      // The stash is keyed by the generated state; assert the payload shape and
      // that the requested permissions (not the OIDC scopes) are what's stored.
      const requestedCall = mocks.localStorage.setItem.mock.calls.find(
        (args: unknown[]) => args[0] === 'youversion-auth-requested-permissions',
      ) as [string, string] | undefined;
      expect(requestedCall).toBeTruthy();
      const stored = JSON.parse(requestedCall![1]) as { state: string; permissions: string[] };
      expect(stored.permissions).toEqual(['highlights']);
      expect(typeof stored.state).toBe('string');
    });

    it('fails before redirecting when the requested-permissions stash cannot be written', async () => {
      // The web flow echoes no grants, so this stash is the callback's only
      // evidence of what was requested. A store that accepts the verifier but
      // rejects this key (quota reached mid-call) would otherwise redirect and
      // then re-prompt for a permission the user just consented to.
      stubSignInCrypto();
      mocks.localStorage.setItem.mockImplementation((key: string) => {
        if (key === 'youversion-auth-requested-permissions') {
          throw new Error('QuotaExceededError');
        }
      });

      await expect(
        YouVersionAPIUsers.signIn('https://example.com/callback', ['profile'], ['highlights']),
      ).rejects.toThrow(
        'Sign In with YouVersion requires localStorage, which is not available in this environment',
      );
      expect(mocks.window.location.href).toBe('');
    });

    it('does not stash requested permissions when none are requested', async () => {
      stubSignInCrypto();

      await YouVersionAPIUsers.signIn('https://example.com/callback', ['profile']);

      expect(mocks.localStorage.setItem).not.toHaveBeenCalledWith(
        'youversion-auth-requested-permissions',
        expect.any(String),
      );
    });
  });

  describe('handleAuthCallback', () => {
    it('should return null when no state or error in URL', async () => {
      mocks.window.location.search = '';

      const result = await YouVersionAPIUsers.handleAuthCallback();
      expect(result).toBeNull();
    });

    it('should throw error when OAuth error is present', async () => {
      mocks.window.location.search = '?error=access_denied&error_description=User denied access';

      await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow(
        'OAuth authentication failed: User denied access',
      );
    });

    it('should throw error when OAuth error is present without description', async () => {
      mocks.window.location.search = '?error=server_error';

      await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow(
        'OAuth authentication failed: server_error',
      );
    });

    it('should throw error when state parameter is invalid', async () => {
      mocks.window.location.search = '?state=invalid-state&code=auth-code';
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'youversion-auth-state') return 'valid-state';
        return null;
      });

      await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow(
        'Invalid state parameter - possible CSRF attack',
      );
    });

    it('should redirect to server when state exists but no code', async () => {
      mocks.window.location.href = 'https://example.com/callback?state=test-state';
      mocks.window.location.search = '?state=test-state';
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'youversion-auth-state') return 'test-state';
        return null;
      });

      // obtainLocation navigates away; we return null so we don't fall through
      // into the code-exchange path without a code.
      await expect(YouVersionAPIUsers.handleAuthCallback()).resolves.toBeNull();

      expect(mocks.window.location.href).toBe(
        'https://api.youversion.com/auth/callback?state=test-state',
      );
    });

    it('stashes granted_permissions from the pre-code OAuth hop', async () => {
      mocks.window.location.href =
        'https://example.com/callback?state=test-state&granted_permissions=highlights';
      mocks.window.location.search = '?state=test-state&granted_permissions=highlights';
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'youversion-auth-state') return 'test-state';
        return null;
      });

      await expect(YouVersionAPIUsers.handleAuthCallback()).resolves.toBeNull();

      expect(mocks.localStorage.setItem).toHaveBeenCalledWith(
        'youversion-auth-pending-granted-permissions',
        JSON.stringify({ state: 'test-state', permissions: ['highlights'] }),
      );
      expect(mocks.window.location.href).toBe(
        'https://api.youversion.com/auth/callback?state=test-state&granted_permissions=highlights',
      );
    });

    it('still redirects when the pre-code grant stash cannot be written', async () => {
      // Mid-callback the session is already recoverable: a rejected stash costs
      // only the grant echo (the permission machine re-prompts), so it must not
      // abort a sign-in that can still complete.
      mocks.window.location.href =
        'https://example.com/callback?state=test-state&granted_permissions=highlights';
      mocks.window.location.search = '?state=test-state&granted_permissions=highlights';
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'youversion-auth-state') return 'test-state';
        return null;
      });
      mocks.localStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      await expect(YouVersionAPIUsers.handleAuthCallback()).resolves.toBeNull();

      expect(mocks.window.location.href).toBe(
        'https://api.youversion.com/auth/callback?state=test-state&granted_permissions=highlights',
      );
    });

    it('should throw error when required parameters are missing', async () => {
      mocks.window.location.search = '?state=test-state&code=auth-code';
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'youversion-auth-state') return 'test-state';
        return null; // Missing other required parameters
      });

      await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow(
        'Missing required authentication parameters',
      );
    });

    it('should successfully exchange code for tokens', async () => {
      setupCallbackFlow({
        scope: 'bibles highlights openid',
        profile: { ...DEFAULT_CALLBACK_PROFILE, profile_picture: 'https://example.com/avatar.jpg' },
      });

      // Mock YouVersionPlatformConfiguration persistence
      const saveAuthDataSpy = vi.spyOn(YouVersionPlatformConfiguration, 'saveAuthData');
      const saveUserInfoSpy = vi.spyOn(YouVersionPlatformConfiguration, 'saveUserInfo');
      const saveGrantedPermissionsSpy = vi.spyOn(
        YouVersionPlatformConfiguration,
        'saveGrantedPermissions',
      );

      const result = await YouVersionAPIUsers.handleAuthCallback();

      expect(result).toBeTruthy();
      expect(result?.accessToken).toBe('access-token-123');
      expect(result?.refreshToken).toBe('refresh-token-456');
      expect(result?.yvpUserId).toBe('1234567890');
      expect(result?.name).toBe('John Doe');
      expect(result?.email).toBe('john@example.com');

      // Verify saveAuthData was called with tokens only (no id token persisted)
      expect(saveAuthDataSpy).toHaveBeenCalledWith(
        'access-token-123',
        'refresh-token-456',
        expect.any(Date),
      );

      // Verify the decoded profile was persisted instead of the id token
      expect(saveUserInfoSpy).toHaveBeenCalledWith({
        id: '1234567890',
        name: 'John Doe',
        email: 'john@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
      });

      // Token scope seeds the permission cache (OIDC scopes filtered out)
      expect(saveGrantedPermissionsSpy).toHaveBeenCalledWith(['bibles', 'highlights']);

      saveUserInfoSpy.mockRestore();
      saveGrantedPermissionsSpy.mockRestore();

      // Verify cleanup
      expect(mocks.localStorage.removeItem).toHaveBeenCalledWith('youversion-auth-code-verifier');
      expect(mocks.localStorage.removeItem).toHaveBeenCalledWith('youversion-auth-redirect-uri');
      expect(mocks.localStorage.removeItem).toHaveBeenCalledWith('youversion-auth-state');
      expect(mocks.localStorage.removeItem).toHaveBeenCalledWith(
        'youversion-auth-pending-granted-permissions',
      );

      expect(mocks.window.history.replaceState).toHaveBeenCalledWith(
        {},
        '',
        'https://example.com/callback',
      );

      saveAuthDataSpy.mockRestore();
    });

    it('keeps the new session when post-exchange cleanup cannot write to storage', async () => {
      // A store can read fine and still throw on every mutation (Safari private
      // mode). The tokens are already persisted by the time cleanup runs, so a
      // throwing `removeItem` must not fall into the catch path — that would
      // clear the session a successful exchange just established.
      setupCallbackFlow({ scope: 'bibles openid' });
      mocks.localStorage.removeItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      const clearAuthTokensSpy = vi.spyOn(YouVersionPlatformConfiguration, 'clearAuthTokens');

      const result = await YouVersionAPIUsers.handleAuthCallback();

      expect(result?.accessToken).toBe('access-token-123');
      expect(clearAuthTokensSpy).not.toHaveBeenCalled();
      expect(mocks.window.history.replaceState).toHaveBeenCalled();

      clearAuthTokensSpy.mockRestore();
    });

    it('unions stashed early grants with token scope when final URL omits them', async () => {
      setupCallbackFlow({
        scope: 'openid profile email',
        pendingGrant: JSON.stringify({ state: 'test-state', permissions: ['highlights'] }),
      });

      const saveGrantedPermissionsSpy = vi.spyOn(
        YouVersionPlatformConfiguration,
        'saveGrantedPermissions',
      );

      await YouVersionAPIUsers.handleAuthCallback();

      expect(saveGrantedPermissionsSpy).toHaveBeenCalledWith(['highlights']);
      saveGrantedPermissionsSpy.mockRestore();
    });

    it('persists highlights when the final callback echoes granted_permissions[] (server bracket notation)', async () => {
      // Models the real one-shot return: the hosted /auth/consent flow redirects
      // straight to the app with the code AND the grant echo, and the server
      // encodes that echo with bracket-array notation (as seen live on the
      // outbound `requested_permissions[]`). The token scope does NOT carry the
      // data-exchange `highlights` permission, so the URL echo is the only signal.
      setupCallbackFlow({
        scope: 'profile openid',
        search: '?state=test-state&code=auth-code&granted_permissions%5B%5D=highlights',
        href: 'https://example.com/callback?state=test-state&code=auth-code&granted_permissions%5B%5D=highlights',
      });

      const saveGrantedPermissionsSpy = vi.spyOn(
        YouVersionPlatformConfiguration,
        'saveGrantedPermissions',
      );

      await YouVersionAPIUsers.handleAuthCallback();

      expect(saveGrantedPermissionsSpy).toHaveBeenCalledWith(['highlights']);
      saveGrantedPermissionsSpy.mockRestore();
    });

    it('stashes bracket-array granted_permissions[] from the pre-code OAuth hop', async () => {
      mocks.window.location.href =
        'https://example.com/callback?state=test-state&granted_permissions%5B%5D=highlights';
      mocks.window.location.search = '?state=test-state&granted_permissions%5B%5D=highlights';
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'youversion-auth-state') return 'test-state';
        return null;
      });

      await expect(YouVersionAPIUsers.handleAuthCallback()).resolves.toBeNull();

      expect(mocks.localStorage.setItem).toHaveBeenCalledWith(
        'youversion-auth-pending-granted-permissions',
        JSON.stringify({ state: 'test-state', permissions: ['highlights'] }),
      );
    });

    it('discards stashed early grants bound to a different OAuth state', async () => {
      setupCallbackFlow({
        scope: 'openid profile email',
        pendingGrant: JSON.stringify({ state: 'other-flow-state', permissions: ['highlights'] }),
      });

      const saveGrantedPermissionsSpy = vi.spyOn(
        YouVersionPlatformConfiguration,
        'saveGrantedPermissions',
      );

      await YouVersionAPIUsers.handleAuthCallback();

      expect(saveGrantedPermissionsSpy).not.toHaveBeenCalled();
      saveGrantedPermissionsSpy.mockRestore();
    });

    it('discards legacy unbound pre-code grant stash (plain comma list)', async () => {
      setupCallbackFlow({ scope: 'openid profile email', pendingGrant: 'highlights' });

      const saveGrantedPermissionsSpy = vi.spyOn(
        YouVersionPlatformConfiguration,
        'saveGrantedPermissions',
      );

      await YouVersionAPIUsers.handleAuthCallback();

      expect(saveGrantedPermissionsSpy).not.toHaveBeenCalled();
      saveGrantedPermissionsSpy.mockRestore();
    });

    it('seeds the requested permission when the server returns no grant echo (the live web-flow shape)', async () => {
      // The exact captured failure (2026-07-23): signIn requested `highlights`,
      // consent was granted, but the callback carries no `granted_permissions`
      // and the token scope is only `profile openid`. Sources (1)-(3) are all
      // empty; only the optimistic requested-permissions seed keeps `highlights`.
      setupCallbackFlow({
        scope: 'profile openid',
        requestedGrant: JSON.stringify({ state: 'test-state', permissions: ['highlights'] }),
      });

      const saveGrantedPermissionsSpy = vi.spyOn(
        YouVersionPlatformConfiguration,
        'saveGrantedPermissions',
      );

      await YouVersionAPIUsers.handleAuthCallback();

      expect(saveGrantedPermissionsSpy).toHaveBeenCalledWith(['highlights']);
      saveGrantedPermissionsSpy.mockRestore();
    });

    it('discards a requested-permissions stash bound to a different OAuth state (fail closed)', async () => {
      setupCallbackFlow({
        scope: 'profile openid',
        requestedGrant: JSON.stringify({ state: 'other-flow-state', permissions: ['highlights'] }),
      });

      const saveGrantedPermissionsSpy = vi.spyOn(
        YouVersionPlatformConfiguration,
        'saveGrantedPermissions',
      );

      await YouVersionAPIUsers.handleAuthCallback();

      expect(saveGrantedPermissionsSpy).not.toHaveBeenCalled();
      saveGrantedPermissionsSpy.mockRestore();
    });

    it('unions the requested-permissions seed with a server echo without duplicating', async () => {
      // If the server ever does echo the grant, the Set union must not double it.
      setupCallbackFlow({
        scope: 'profile openid',
        search: '?state=test-state&code=auth-code&granted_permissions=highlights',
        href: 'https://example.com/callback?state=test-state&code=auth-code&granted_permissions=highlights',
        requestedGrant: JSON.stringify({ state: 'test-state', permissions: ['highlights'] }),
      });

      const saveGrantedPermissionsSpy = vi.spyOn(
        YouVersionPlatformConfiguration,
        'saveGrantedPermissions',
      );

      await YouVersionAPIUsers.handleAuthCallback();

      expect(saveGrantedPermissionsSpy).toHaveBeenCalledWith(['highlights']);
      saveGrantedPermissionsSpy.mockRestore();
    });

    it('should handle token exchange failure', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      };

      mocks.window.location.search = '?state=test-state&code=auth-code';
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'youversion-auth-state':
            return 'test-state';
          case 'youversion-auth-code-verifier':
            return 'code-verifier-123';
          case 'youversion-auth-redirect-uri':
            return 'https://example.com/callback';
          default:
            return null;
        }
      });

      mockFetch.mockResolvedValue(mockResponse);

      await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow(
        'Token exchange failed: 400 Bad Request',
      );

      // Verify cleanup on error
      expect(mocks.localStorage.removeItem).toHaveBeenCalledWith('youversion-auth-code-verifier');
      expect(mocks.localStorage.removeItem).toHaveBeenCalledWith('youversion-auth-redirect-uri');
      expect(mocks.localStorage.removeItem).toHaveBeenCalledWith('youversion-auth-state');
    });

    it('dedupes concurrent callbacks for the same code (one exchange, grants survive)', async () => {
      setupCallbackFlow({
        scope: 'highlights openid',
        profile: { ...DEFAULT_CALLBACK_PROFILE, profile_picture: 'https://example.com/avatar.jpg' },
      });

      // A second token request for the same single-use code would 400 on the
      // server. Model that: first fetch succeeds, any subsequent fetch fails.
      let tokenRequestCount = 0;
      mockFetch.mockImplementation(() => {
        tokenRequestCount += 1;
        if (tokenRequestCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            text: vi.fn().mockResolvedValue(JSON.stringify(makeTokens('highlights openid'))),
          });
        }
        return Promise.resolve({ ok: false, status: 400, statusText: 'Bad Request' });
      });

      const clearAuthTokensSpy = vi.spyOn(YouVersionPlatformConfiguration, 'clearAuthTokens');
      const saveGrantedPermissionsSpy = vi.spyOn(
        YouVersionPlatformConfiguration,
        'saveGrantedPermissions',
      );

      // Two concurrent invocations, as StrictMode's double-mount produces.
      const [first, second] = await Promise.all([
        YouVersionAPIUsers.handleAuthCallback(),
        YouVersionAPIUsers.handleAuthCallback(),
      ]);

      // A repeat sequential call this page load must also reuse the exchange.
      const third = await YouVersionAPIUsers.handleAuthCallback();

      // Exactly one token request was made despite three callback invocations.
      expect(tokenRequestCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // All callers observe the same successful result.
      expect(first).toBeTruthy();
      expect(first?.accessToken).toBe('access-token-123');
      expect(second).toBe(first);
      expect(third).toBe(first);

      // The destructive catch path never ran, so the seeded grants survive.
      expect(clearAuthTokensSpy).not.toHaveBeenCalled();
      expect(saveGrantedPermissionsSpy).toHaveBeenCalledWith(['highlights']);

      clearAuthTokensSpy.mockRestore();
      saveGrantedPermissionsSpy.mockRestore();
    });
  });

  describe('obtainLocation', () => {
    it('should redirect to server callback with correct parameters', () => {
      YouVersionPlatformConfiguration.apiHost = 'api-test.youversion.com';

      const callbackURL = 'https://example.com/callback?state=test-state&user=123';
      const state = 'test-state';

      // Access private method
      // @ts-expect-error - accessing private method for testing
      YouVersionAPIUsers.obtainLocation(callbackURL, state);

      expect(mocks.window.location.href).toBe(
        'https://api-test.youversion.com/auth/callback?state=test-state&user=123',
      );
    });

    it('should throw error when state parameter is invalid', () => {
      const callbackURL = 'https://example.com/callback?state=invalid-state';
      const state = 'valid-state';

      expect(() => {
        // @ts-expect-error - accessing private method for testing
        YouVersionAPIUsers.obtainLocation(callbackURL, state);
      }).toThrow('Invalid state parameter');
    });
  });

  describe('extractSignInResult', () => {
    it('should extract sign-in result from tokens', () => {
      const fixedDate = new Date(2025, 2, 11, 12, 0, 0);
      vi.setSystemTime(fixedDate);
      const tokens = {
        access_token: 'access-token-123',
        expires_in: 3600,
        id_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJwcm9maWxlX3BpY3R1cmUiOiJodHRwczovL2V4YW1wbGUuY29tL2F2YXRhci5qcGcifQ.invalid',
        refresh_token: 'refresh-token-456',
        scope: 'bibles highlights openid',
        token_type: 'Bearer',
      };

      // Mock JWT decoding
      vi.mocked(atob).mockReturnValue(
        JSON.stringify({
          sub: '1234567890',
          name: 'John Doe',
          email: 'john@example.com',
          profile_picture: 'https://example.com/avatar.jpg',
        }),
      );

      // @ts-expect-error - accessing private method for testing
      const result = YouVersionAPIUsers.extractSignInResult(tokens);

      expect(result.accessToken).toBe('access-token-123');
      expect(result.expiryDate).toStrictEqual(new Date(fixedDate.getTime() + 60 * 60 * 1000));
      expect(result.refreshToken).toBe('refresh-token-456');
      expect(result.yvpUserId).toBe('1234567890');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.profilePicture).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('decodeJWT', () => {
    it('should decode valid JWT token', () => {
      const payload = { sub: '123', name: 'John' };
      const base64Payload = String(mocks.btoa(JSON.stringify(payload)) || 'mockbase64');
      const token = `header.${base64Payload}.signature`;

      vi.mocked(atob).mockReturnValue(JSON.stringify(payload));

      // @ts-expect-error - accessing private method for testing
      const result = YouVersionAPIUsers.decodeJWT(token);

      expect(result).toEqual(payload);
    });

    it('should decode UTF-8 characters from JWT payload', () => {
      const payload = {
        sub: '123',
        name: 'Marcônio Романов',
      };
      const base64UrlPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
      const token = `header.${base64UrlPayload}.signature`;
      const binaryPayload = Buffer.from(base64UrlPayload, 'base64url').toString('latin1');

      vi.mocked(atob).mockReturnValue(binaryPayload);

      // @ts-expect-error - accessing private method for testing
      const result = YouVersionAPIUsers.decodeJWT(token);

      expect(result).toEqual(payload);
    });

    it('should return empty object for invalid token format', () => {
      // @ts-expect-error - accessing private method for testing
      const result = YouVersionAPIUsers.decodeJWT('invalid.token');

      expect(result).toEqual({});
    });

    it('should handle base64 padding correctly', () => {
      const payload = { sub: '123' };
      const base64Payload = 'eyJzdWIiOiIxMjMifQ'; // Base64 without padding
      const token = `header.${base64Payload}.signature`;

      vi.mocked(atob).mockReturnValue(JSON.stringify(payload));

      // @ts-expect-error - accessing private method for testing
      const result = YouVersionAPIUsers.decodeJWT(token);

      expect(result).toEqual(payload);
    });

    it('should return empty object when atob throws', () => {
      const token = 'header.invalid-base64.signature';
      vi.mocked(atob).mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      // @ts-expect-error - accessing private method for testing
      const result = YouVersionAPIUsers.decodeJWT(token);

      expect(result).toEqual({});
    });

    it('should return empty object when JSON.parse throws', () => {
      const token = 'header.dmFsaWRiYXNlNjQ.signature';
      vi.mocked(atob).mockReturnValue('invalid json');

      // @ts-expect-error - accessing private method for testing
      const result = YouVersionAPIUsers.decodeJWT(token);

      expect(result).toEqual({});
    });
  });

  describe('signOut', () => {
    it('should call setAccessToken with null', () => {
      const setAccessTokenSpy = vi.spyOn(YouVersionPlatformConfiguration, 'clearAuthTokens');

      YouVersionAPIUsers.signOut();

      expect(setAccessTokenSpy).toHaveBeenCalled();

      setAccessTokenSpy.mockRestore();
    });
  });

  describe('userInfo', () => {
    it('should throw error for invalid access token', () => {
      expect(() => YouVersionAPIUsers.userInfo('')).toThrow(
        'Invalid access token: must be a non-empty string',
      );

      expect(() => {
        // @ts-expect-error - Testing invalid input type
        YouVersionAPIUsers.userInfo(null);
      }).toThrow('Invalid access token: must be a non-empty string');
    });

    it('should decode user info from valid JWT token', () => {
      const claims = {
        sub: 'user123',
        name: 'John Doe',
        profile_picture: 'https://example.com/avatar.jpg',
        email: 'john@example.com',
      };

      vi.mocked(atob).mockReturnValue(JSON.stringify(claims));

      const result = YouVersionAPIUsers.userInfo('valid.jwt.token');

      expect(result).toBeInstanceOf(YouVersionUserInfo);
      expect(result.userId).toBe('user123');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.avatarUrl).toStrictEqual(new URL('https://example.com/avatar.jpg'));
    });

    it('should throw error for empty JWT claims', () => {
      vi.mocked(atob).mockReturnValue('{}');

      expect(() => YouVersionAPIUsers.userInfo('valid.jwt.token')).toThrow(
        'Invalid JWT token: Unable to decode token payload',
      );
    });

    it('should throw error when JWT decoding fails', () => {
      vi.mocked(atob).mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      expect(() => YouVersionAPIUsers.userInfo('invalid.jwt.token')).toThrow(
        'Invalid JWT token: Unable to decode token payload',
      );
    });
  });

  describe('refreshTokens', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should throw error when no refresh token available', async () => {
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'refreshToken') return null;
        return null;
      });

      await expect(YouVersionAPIUsers.refreshTokens()).rejects.toThrow(
        'No refresh token available',
      );
    });

    it('should throw error when appKey is not set', async () => {
      YouVersionPlatformConfiguration.appKey = null;

      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'refreshToken') return 'refresh-token-123';
        return null;
      });

      await expect(YouVersionAPIUsers.refreshTokens()).rejects.toThrow(
        'YouVersionPlatformConfiguration.appKey must be set before refreshing tokens',
      );
    });

    it('should successfully rotate the access and refresh tokens', async () => {
      const originalAccessToken = 'old-access-token';
      const originalRefreshToken = 'old-refresh-token';

      const mockRefreshResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
        scope: 'bibles highlights openid',
        token_type: 'Bearer',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockRefreshResponse),
      };

      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'refreshToken') return originalRefreshToken;
        if (key === 'accessToken') return originalAccessToken;
        return null;
      });

      mockFetch.mockResolvedValue(mockResponse);

      const saveAuthDataSpy = vi.spyOn(YouVersionPlatformConfiguration, 'saveAuthData');
      const saveUserInfoSpy = vi.spyOn(YouVersionPlatformConfiguration, 'saveUserInfo');

      const result = await YouVersionAPIUsers.refreshTokens();

      expect(result).toBeTruthy();

      // Assert that access_token and refresh_token are new (different from original)
      expect(result?.accessToken).toBe('new-access-token');
      expect(result?.accessToken).not.toBe(originalAccessToken);
      expect(result?.refreshToken).toBe('new-refresh-token');
      expect(result?.refreshToken).not.toBe(originalRefreshToken);

      // Verify the refresh token request was made correctly
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://api.youversion.com/auth/token',
        }),
      );

      const [calledRequest] = mockFetch.mock.calls[0] as [Request];
      expect(calledRequest).toBeInstanceOf(Request);
      expect(calledRequest.method).toBe('POST');
      expect(calledRequest.url).toBe('https://api.youversion.com/auth/token');
      expect(calledRequest.headers.get('content-type')).toBe('application/x-www-form-urlencoded');
      const bodyText = await calledRequest.clone().text();
      const body = new URLSearchParams(bodyText);
      expect(body.get('grant_type')).toBe('refresh_token');

      // Verify saveAuthData was called with the rotated tokens only
      expect(saveAuthDataSpy).toHaveBeenCalledWith(
        'new-access-token',
        'new-refresh-token',
        expect.any(Date),
      );

      // The stored profile is left untouched by a refresh
      expect(saveUserInfoSpy).not.toHaveBeenCalled();

      saveAuthDataSpy.mockRestore();
      saveUserInfoSpy.mockRestore();
    });

    it('should handle refresh token request failure', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      };

      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'refreshToken') return 'refresh-token-123';
        if (key === 'idToken') return 'id-token-123';
        return null;
      });

      mockFetch.mockResolvedValue(mockResponse);

      await expect(YouVersionAPIUsers.refreshTokens()).rejects.toThrow(
        'Token refresh failed: 401 Unauthorized',
      );
    });

    it('should handle network errors during refresh', async () => {
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'refreshToken') return 'refresh-token-123';
        if (key === 'idToken') return 'id-token-123';
        return null;
      });

      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(YouVersionAPIUsers.refreshTokens()).rejects.toThrow(
        'Token refresh failed: Network error',
      );
    });
  });

  describe('isTokenExpired', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return true when no expiry date is available', () => {
      mocks.localStorage.getItem.mockReturnValue(null);

      const result = YouVersionAPIUsers.isTokenExpired();

      expect(result).toBe(true);
    });

    it('should return false when token is not expired', () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'expiryDate') return futureDate.toISOString();
        return null;
      });

      const result = YouVersionAPIUsers.isTokenExpired();

      expect(result).toBe(false);
    });

    it('should return true when token is expired', () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'expiryDate') return pastDate.toISOString();
        return null;
      });

      const result = YouVersionAPIUsers.isTokenExpired();

      expect(result).toBe(true);
    });
  });

  describe('refreshTokenIfNeeded', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // The in-flight refresh slot is module-scoped; clear it so a leftover
      // promise from a prior case can't be shared into this one.
      __resetTokenRefreshDedupeForTests();
    });

    it('should return true when token is not expired', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'expiryDate') return futureDate.toISOString();
        return null;
      });

      const result = await YouVersionAPIUsers.refreshTokenIfNeeded();

      expect(result).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should refresh tokens when expired and return true on success', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'expiryDate') return pastDate.toISOString();
        if (key === 'refreshToken') return 'refresh-token-123';
        if (key === 'idToken') return 'id-token-123';
        return null;
      });

      const mockRefreshResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
        scope: 'bibles highlights openid',
        token_type: 'Bearer',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue(mockRefreshResponse),
      });

      const result = await YouVersionAPIUsers.refreshTokenIfNeeded();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should return false and clear tokens when refresh fails', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'expiryDate') return pastDate.toISOString();
        if (key === 'refreshToken') return 'refresh-token-123';
        if (key === 'idToken') return 'id-token-123';
        return null;
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const clearAuthTokensSpy = vi.spyOn(YouVersionPlatformConfiguration, 'clearAuthTokens');

      const result = await YouVersionAPIUsers.refreshTokenIfNeeded();

      expect(result).toBe(false);
      expect(clearAuthTokensSpy).toHaveBeenCalled();

      clearAuthTokensSpy.mockRestore();
    });

    it('shares one refresh across concurrent callers so a duplicate cannot wipe the session', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'expiryDate') return pastDate.toISOString();
        if (key === 'refreshToken') return 'refresh-token-123';
        if (key === 'idToken') return 'id-token-123';
        return null;
      });

      // The refresh token is single-use: the first request succeeds; any second
      // request for the same token 400s on the server. If both concurrent
      // callers spent it, the loser's failure would clear the session.
      let refreshRequestCount = 0;
      mockFetch.mockImplementation(() => {
        refreshRequestCount += 1;
        if (refreshRequestCount === 1) {
          return Promise.resolve({
            ok: true,
            status: 200,
            statusText: 'OK',
            json: vi.fn().mockResolvedValue({
              access_token: 'new-access-token',
              expires_in: 3600,
              refresh_token: 'new-refresh-token',
              scope: 'bibles highlights openid',
              token_type: 'Bearer',
            }),
          });
        }
        return Promise.resolve({ ok: false, status: 400, statusText: 'Bad Request' });
      });

      const clearAuthTokensSpy = vi.spyOn(YouVersionPlatformConfiguration, 'clearAuthTokens');
      const saveAuthDataSpy = vi.spyOn(YouVersionPlatformConfiguration, 'saveAuthData');

      // Two concurrent invocations, as StrictMode's double-mount produces.
      const [first, second] = await Promise.all([
        YouVersionAPIUsers.refreshTokenIfNeeded(),
        YouVersionAPIUsers.refreshTokenIfNeeded(),
      ]);

      // Exactly one refresh network call despite two concurrent callers.
      expect(refreshRequestCount).toBe(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Both callers resolve true off the single shared refresh.
      expect(first).toBe(true);
      expect(second).toBe(true);

      // The destructive clear never ran, so tokens and grants survive; the
      // rotated tokens were persisted exactly once.
      expect(clearAuthTokensSpy).not.toHaveBeenCalled();
      expect(saveAuthDataSpy).toHaveBeenCalledTimes(1);
      expect(saveAuthDataSpy).toHaveBeenCalledWith(
        'new-access-token',
        'new-refresh-token',
        expect.any(Date),
      );

      clearAuthTokensSpy.mockRestore();
      saveAuthDataSpy.mockRestore();
    });

    it('clears the shared slot so a later refresh performs a new network call', async () => {
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);
      mocks.localStorage.getItem.mockImplementation((key: string) => {
        if (key === 'expiryDate') return pastDate.toISOString();
        if (key === 'refreshToken') return 'refresh-token-123';
        if (key === 'idToken') return 'id-token-123';
        return null;
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: vi.fn().mockResolvedValue({
          access_token: 'new-access-token',
          expires_in: 3600,
          refresh_token: 'new-refresh-token',
          scope: 'bibles highlights openid',
          token_type: 'Bearer',
        }),
      });

      // First refresh settles, clearing the in-flight slot.
      const firstResult = await YouVersionAPIUsers.refreshTokenIfNeeded();
      expect(firstResult).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // A later call (token still expired) is not merged into the settled
      // refresh; it performs a fresh network call.
      const secondResult = await YouVersionAPIUsers.refreshTokenIfNeeded();
      expect(secondResult).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
