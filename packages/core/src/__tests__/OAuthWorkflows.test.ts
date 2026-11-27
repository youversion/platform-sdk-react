import { expect, it, onTestFinished, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { YouVersionAPIUsers } from '../Users';
import { YouVersionPlatformConfiguration as config } from '../YouVersionPlatformConfiguration';
import { setupBrowserMocks, cleanupBrowserMocks } from './mocks/browser';
import { server } from './setup';

const redirect = 'https://example.com/callback';

function createOAuthBrowser(transport: 'deferred' | 'msw' = 'deferred') {
  const browser = setupBrowserMocks();
  const fetch = vi.fn<(request: Request) => Promise<Response>>();
  if (transport === 'deferred') vi.stubGlobal('fetch', fetch);
  const previousAppKey = config.appKey;
  const previousHost = config.apiHost;
  config.appKey = 'test-app-key';
  config.apiHost = 'api.youversion.com';
  onTestFinished(() => {
    cleanupBrowserMocks();
    config.appKey = previousAppKey;
    config.apiHost = previousHost;
  });

  const values = new Map<string, string>();
  browser.localStorage.getItem.mockImplementation((key: string) => values.get(key) ?? null);
  browser.localStorage.setItem.mockImplementation((key: string, value: string) => {
    values.set(key, value);
  });
  browser.localStorage.removeItem.mockImplementation((key: string) => {
    values.delete(key);
  });
  browser.crypto.getRandomValues.mockImplementation((array: Uint8Array) => array);
  browser.crypto.subtle.digest.mockResolvedValue(new Uint8Array(32).buffer);
  browser.btoa.mockReturnValue('oauth-fixture');
  browser.atob.mockReturnValue(
    JSON.stringify({
      sub: '1234567890',
      name: 'John Doe',
      email: 'john@example.com',
      profile_picture: 'https://example.com/avatar.jpg',
    }),
  );

  function arriveWithCode(code: string) {
    const authorize = new URL(browser.window.location.href);
    const callback = new URL(redirect);
    callback.searchParams.set('state', authorize.searchParams.get('state') ?? '');
    callback.searchParams.set('code', code);
    browser.window.location.search = callback.search;
    browser.window.location.href = callback.href;
  }

  function holdTokenResponse() {
    let respond!: (response: Response) => void;
    fetch.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        respond = resolve;
      }),
    );
    return respond;
  }

  return { browser, fetch, values, arriveWithCode, holdTokenResponse };
}

function makeTokens(scope: string) {
  return {
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-456',
    id_token: 'e30.e30.fixture',
    expires_in: 3600,
    token_type: 'Bearer',
    scope,
  };
}

function tokenResponse(scope: string) {
  return Response.json({ ...makeTokens(scope), access_token: 'signed-in-access' });
}

it('reports whether any sign-in or the requested sign-in is pending', async () => {
  const { browser } = createOAuthBrowser();
  expect(YouVersionAPIUsers.isSignInPending()).toBe(false);
  await YouVersionAPIUsers.signIn(redirect);
  const state = new URL(browser.window.location.href).searchParams.get('state');
  if (!state) throw new Error('Expected an authorization state');
  expect(YouVersionAPIUsers.isSignInPending()).toBe(true);
  expect(YouVersionAPIUsers.isSignInPending(state)).toBe(true);
  expect(YouVersionAPIUsers.isSignInPending('another-state')).toBe(false);
  YouVersionAPIUsers.signOut();
  expect(YouVersionAPIUsers.isSignInPending()).toBe(false);
  expect(YouVersionAPIUsers.isSignInPending(state)).toBe(false);
});

it.each([
  { timing: 'before', signInFirst: true },
  { timing: 'after', signInFirst: false },
])('keeps an authorization that started $timing its failed refresh', async ({ signInFirst }) => {
  const { browser, fetch, holdTokenResponse, arriveWithCode } = createOAuthBrowser();
  config.saveAuthData('expired-access', 'old-refresh', new Date(0), {
    scope: 'profile',
    userId: 'alice',
  });
  config.saveUserInfo({ id: 'alice' });
  if (signInFirst) await YouVersionAPIUsers.signIn(redirect, ['write_notes']);
  const finishRefresh = holdTokenResponse();
  const refresh = YouVersionAPIUsers.refreshTokenIfNeeded();
  expect(fetch).toHaveBeenCalled();

  if (!signInFirst) await YouVersionAPIUsers.signIn(redirect, ['write_notes']);
  finishRefresh(new Response(null, { status: 401 }));
  await expect(refresh).resolves.toBe(false);
  expect(YouVersionAPIUsers.getStoredUserInfo()?.userId).toBe('alice');
  expect(config.accessToken).toBeNull();
  expect(config.refreshToken).toBeNull();

  arriveWithCode(`grant-after-failed-refresh-${signInFirst}`);
  browser.atob.mockReturnValue(JSON.stringify({ sub: 'alice' }));
  fetch.mockResolvedValueOnce(tokenResponse('write_notes'));
  await YouVersionAPIUsers.handleAuthCallback();
  expect(config.getOAuthAccessToken('alice', 'write_notes')).toBe('signed-in-access');
});

it('reports the same verified denial when StrictMode processes the callback twice', async () => {
  const { browser, fetch } = createOAuthBrowser();
  await YouVersionAPIUsers.signIn(redirect, ['write_notes']);
  const authorize = new URL(browser.window.location.href);
  const callback = new URL(redirect);
  callback.searchParams.set('state', authorize.searchParams.get('state') ?? '');
  callback.searchParams.set('error', 'access_denied');
  browser.window.location = { href: callback.href, search: callback.search };

  const first = YouVersionAPIUsers.handleAuthCallback();
  const second = YouVersionAPIUsers.handleAuthCallback();
  await Promise.all([
    expect(first).rejects.toThrow('OAuth authentication failed: access_denied'),
    expect(second).rejects.toThrow('OAuth authentication failed: access_denied'),
  ]);
  expect(fetch).not.toHaveBeenCalled();
});

it.each(['network', 'server'] as const)(
  'retains the current account and token when reauthorization encounters a %s failure',
  async (failure) => {
    const { fetch, arriveWithCode } = createOAuthBrowser();
    config.saveAuthData('current-access', 'current-refresh', new Date('2100-01-01'), {
      scope: 'read_notes',
      userId: 'alice',
    });
    config.saveUserInfo({ id: 'alice' });
    await YouVersionAPIUsers.signIn(redirect, ['read_notes', 'write_notes']);
    arriveWithCode(`reauthorize-${failure}-failure`);

    if (failure === 'network') fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    else fetch.mockResolvedValueOnce(new Response(null, { status: 503 }));
    await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toMatchObject({
      name: failure === 'network' ? 'TypeError' : 'Error',
    });

    expect(YouVersionAPIUsers.getStoredUserInfo()?.userId).toBe('alice');
    expect(config.getOAuthAccessToken('alice', 'read_notes')).toBe('current-access');
    expect(config.refreshToken).toBe('current-refresh');
    await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow(
      'Invalid state parameter',
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);

it.each([
  { timing: 'before the older callback', pendingExchange: false, tokenRequests: 1 },
  { timing: 'during the older callback', pendingExchange: true, tokenRequests: 2 },
])(
  'rejects an obsolete grant after signing out and back in $timing',
  async ({ pendingExchange, tokenRequests }) => {
    const { browser, fetch, arriveWithCode, holdTokenResponse } = createOAuthBrowser();
    config.saveAuthData('original-access', 'original-refresh', null);
    config.saveUserInfo({ id: 'alice' });
    browser.atob.mockReturnValue(JSON.stringify({ sub: 'alice' }));
    await YouVersionAPIUsers.signIn(redirect, ['write_notes']);
    arriveWithCode(`old-notes-grant-${pendingExchange}`);
    const staleCallback = { ...browser.window.location };
    const state = new URLSearchParams(staleCallback.search).get('state');
    if (!state) throw new Error('Expected an authorization state');
    expect(YouVersionAPIUsers.isSignInPending(state)).toBe(true);
    const finishOld = pendingExchange ? holdTokenResponse() : undefined;
    const oldCallback = finishOld ? YouVersionAPIUsers.handleAuthCallback() : undefined;

    YouVersionAPIUsers.signOut();
    expect(YouVersionAPIUsers.isSignInPending(state)).toBe(false);
    browser.btoa.mockReturnValue('replacement-authorization');
    await YouVersionAPIUsers.signIn(redirect, ['read_notes']);
    arriveWithCode(`replacement-sign-in-${pendingExchange}`);
    fetch.mockResolvedValueOnce(tokenResponse('read_notes'));
    await YouVersionAPIUsers.handleAuthCallback();

    browser.window.location = staleCallback;
    finishOld?.(tokenResponse('write_notes'));
    await expect(oldCallback ?? YouVersionAPIUsers.handleAuthCallback()).rejects.toMatchObject({
      name: 'OAuthCallbackSupersededError',
    });
    expect(YouVersionAPIUsers.getStoredUserInfo()?.userId).toBe('alice');
    expect(config.getOAuthAccessToken('alice', 'read_notes')).toBe('signed-in-access');
    expect(config.getOAuthAccessToken('alice', 'write_notes')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(tokenRequests);
  },
);

it('requests note scopes at authorize and reads the grants from the exchanged token', async () => {
  const { browser, fetch, values, arriveWithCode } = createOAuthBrowser();
  const beforeRedirect = vi.fn(() => {
    expect(browser.window.location.href).toBe('');
  });

  await YouVersionAPIUsers.signIn(
    redirect,
    ['profile', 'read_notes', 'write_notes'],
    ['highlights'],
    beforeRedirect,
  );

  const authorize = new URL(browser.window.location.href);
  expect(authorize.pathname).toBe('/auth/authorize');
  expect(authorize.searchParams.get('scope')?.split(' ').sort()).toEqual([
    'openid',
    'profile',
    'read_notes',
    'write_notes',
  ]);
  expect(authorize.searchParams.get('requested_permissions')).toBe('highlights');
  expect(beforeRedirect).toHaveBeenCalledWith(authorize.searchParams.get('state'));
  expect(config.getOAuthAccessToken('1234567890', 'write_notes')).toBeNull();

  const firstHop = new URL(redirect);
  firstHop.searchParams.set('state', authorize.searchParams.get('state') ?? '');
  firstHop.searchParams.set('granted_permissions', 'bibles');
  browser.window.location = { href: firstHop.href, search: firstHop.search };
  await expect(YouVersionAPIUsers.handleAuthCallback()).resolves.toBeNull();
  expect(new URL(browser.window.location.href).pathname).toBe('/auth/callback');
  const handoffKeys = [
    'youversion-auth-code-verifier',
    'youversion-auth-redirect-uri',
    'youversion-auth-state',
    'youversion-auth-pending-granted-permissions',
  ];
  for (const key of handoffKeys) expect(values.has(key)).toBe(true);

  arriveWithCode('notes-code');
  fetch.mockResolvedValueOnce(Response.json(makeTokens('openid profile read_notes write_notes')));
  const result = await YouVersionAPIUsers.handleAuthCallback();
  expect(result).toMatchObject({
    accessToken: 'access-token-123',
    refreshToken: 'refresh-token-456',
    yvpUserId: '1234567890',
    name: 'John Doe',
    email: 'john@example.com',
  });
  expect(config.tokenExpiryDate).toEqual(result?.expiryDate);
  expect(config.storedUserInfo).toEqual({
    id: '1234567890',
    name: 'John Doe',
    email: 'john@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
  });
  expect(browser.localStorage.getItem('idToken')).toBeNull();
  expect(browser.window.history.replaceState).toHaveBeenCalledWith({}, '', redirect);
  for (const key of handoffKeys) expect(values.has(key)).toBe(false);

  expect(config.getOAuthAccessToken('1234567890', 'read_notes')).toBe('access-token-123');
  expect(config.getOAuthAccessToken('1234567890', 'write_notes')).toBe('access-token-123');
  expect(config.grantedPermissions).toEqual(['bibles', 'highlights']);
});

it('retains note scopes when rotation omits scope and replaces them when the response narrows it', async () => {
  const { fetch } = createOAuthBrowser();
  config.saveAuthData('initial-access-token', 'initial-refresh-token', new Date(0), {
    scope: 'openid read_notes write_notes',
    userId: 'notes-account',
  });
  config.saveUserInfo({ id: 'notes-account' });
  const rotation = { expires_in: 3600, token_type: 'Bearer' };
  fetch
    .mockResolvedValueOnce(
      Response.json({
        ...rotation,
        access_token: 'rotated-access',
        refresh_token: 'rotated-refresh',
      }),
    )
    .mockResolvedValueOnce(
      Response.json({
        ...rotation,
        access_token: 'reduced-access',
        refresh_token: 'reduced-refresh',
        scope: 'openid read_notes',
      }),
    );

  await YouVersionAPIUsers.refreshTokens();
  expect(config.getOAuthAccessToken('notes-account', 'read_notes')).toBe('rotated-access');
  expect(config.getOAuthAccessToken('notes-account', 'write_notes')).toBe('rotated-access');

  await YouVersionAPIUsers.refreshTokens();
  expect(config.getOAuthAccessToken('notes-account', 'read_notes')).toBe('reduced-access');
  expect(config.getOAuthAccessToken('notes-account', 'write_notes')).toBeNull();
  expect(YouVersionAPIUsers.getStoredUserInfo()?.userId).toBe('notes-account');
});

it('waits for a matching profile instead of refreshing a staged account token', async () => {
  const { fetch } = createOAuthBrowser();
  config.saveAuthData('old-access', 'old-refresh', new Date(0), {
    scope: 'read_notes',
    userId: 'old-account',
  });
  config.saveUserInfo({ id: 'old-account' });
  config.saveAuthData('new-access', 'new-refresh', new Date(0), {
    scope: 'write_notes',
    userId: 'new-account',
  });
  fetch.mockResolvedValueOnce(Response.json(makeTokens('openid write_notes')));

  await expect(YouVersionAPIUsers.refreshTokens()).rejects.toThrow();
  const refreshed = await YouVersionAPIUsers.refreshTokenIfNeeded();

  expect(config.getOAuthAccessToken('old-account', 'write_notes')).toBeNull();
  expect(config.getOAuthAccessToken('new-account', 'write_notes')).toBeNull();
  expect(refreshed).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
  config.saveUserInfo({ id: 'new-account' });
  expect(config.getOAuthAccessToken('new-account', 'write_notes')).toBe('new-access');
});

it('can complete a newer authorization after an older code exchange fails', async () => {
  const { browser, fetch, arriveWithCode, holdTokenResponse } = createOAuthBrowser();
  await YouVersionAPIUsers.signIn(redirect, ['write_notes']);
  arriveWithCode('old-code');
  const releaseOldResponse = holdTokenResponse();
  const oldCallback = YouVersionAPIUsers.handleAuthCallback();
  expect(fetch).toHaveBeenCalled();

  browser.btoa.mockReturnValue('new-authorization-value');
  await YouVersionAPIUsers.signIn(redirect, ['read_notes', 'write_notes']);
  releaseOldResponse(new Response(null, { status: 400 }));
  await expect(oldCallback).rejects.toThrow();

  arriveWithCode('new-code');
  fetch.mockResolvedValueOnce(Response.json(makeTokens('openid read_notes')));
  await YouVersionAPIUsers.handleAuthCallback();
  expect(config.getOAuthAccessToken('1234567890', 'read_notes')).toBe('access-token-123');
  expect(config.getOAuthAccessToken('1234567890', 'write_notes')).toBeNull();
});

it.each([
  { responseOutcome: 'succeeds', status: 200 },
  { responseOutcome: 'fails', status: 400 },
])(
  'preserves the newer account when an older code exchange $responseOutcome',
  async ({ status }) => {
    const { fetch, arriveWithCode, holdTokenResponse } = createOAuthBrowser();
    await YouVersionAPIUsers.signIn(redirect, ['write_notes']);
    arriveWithCode(`old-account-code-${status}`);
    const releaseOldResponse = holdTokenResponse();
    const oldCallback = YouVersionAPIUsers.handleAuthCallback();
    expect(fetch).toHaveBeenCalled();

    config.saveAuthData('new-access', 'new-refresh', null, {
      scope: 'read_notes',
      userId: 'new-account',
    });
    config.saveUserInfo({ id: 'new-account' });
    releaseOldResponse(Response.json(makeTokens('openid write_notes'), { status }));
    await expect(oldCallback).rejects.toThrow();

    expect(config.accessToken).toBe('new-access');
    expect(config.refreshToken).toBe('new-refresh');
    expect(YouVersionAPIUsers.getStoredUserInfo()?.userId).toBe('new-account');
    expect(config.getOAuthAccessToken('new-account', 'read_notes')).toBe('new-access');
    expect(config.getOAuthAccessToken('new-account', 'write_notes')).toBeNull();
  },
);

it('stays signed out when a canceled sign-in exchange later succeeds', async () => {
  const { fetch, arriveWithCode, holdTokenResponse } = createOAuthBrowser();
  await YouVersionAPIUsers.signIn(redirect, ['write_notes']);
  arriveWithCode('canceled-code');
  const releaseOldResponse = holdTokenResponse();
  const oldCallback = YouVersionAPIUsers.handleAuthCallback();
  expect(fetch).toHaveBeenCalled();

  YouVersionAPIUsers.signOut();
  releaseOldResponse(Response.json(makeTokens('openid write_notes')));
  await expect(oldCallback).rejects.toThrow();

  expect(config.accessToken).toBeNull();
  expect(YouVersionAPIUsers.getStoredUserInfo()).toBeNull();
  expect(config.getOAuthAccessToken('1234567890', 'write_notes')).toBeNull();
});

it.each([
  { responseOutcome: 'succeeds', status: 200 },
  { responseOutcome: 'fails', status: 401 },
])(
  'preserves the newer account when an older token refresh $responseOutcome',
  async ({ status }) => {
    const { fetch, holdTokenResponse } = createOAuthBrowser();
    config.saveAuthData('old-access', 'old-refresh', new Date(0), {
      scope: 'write_notes',
      userId: 'old-account',
    });
    config.saveUserInfo({ id: 'old-account' });
    const releaseOldResponse = holdTokenResponse();
    const oldRefresh = YouVersionAPIUsers.refreshTokenIfNeeded();
    expect(fetch).toHaveBeenCalled();

    config.saveAuthData('new-access', 'new-refresh', null, {
      scope: 'read_notes',
      userId: 'new-account',
    });
    config.saveUserInfo({ id: 'new-account' });
    releaseOldResponse(Response.json(makeTokens('openid write_notes'), { status }));
    await expect(oldRefresh).resolves.toBe(false);

    expect(config.accessToken).toBe('new-access');
    expect(config.refreshToken).toBe('new-refresh');
    expect(YouVersionAPIUsers.getStoredUserInfo()?.userId).toBe('new-account');
    expect(config.getOAuthAccessToken('new-account', 'read_notes')).toBe('new-access');
    expect(config.getOAuthAccessToken('new-account', 'write_notes')).toBeNull();
  },
);

it('clears a partially written refresh session when storage rejects the rotated refresh token', async () => {
  const { browser, fetch, values: stored } = createOAuthBrowser();
  config.saveAuthData('old-access', 'old-refresh', new Date(0));
  config.saveUserInfo({ id: 'signed-in-user' });

  const rotatedRefreshToken = 'a-longer-rotated-refresh-token';
  browser.localStorage.setItem.mockImplementation((key: string, value: string) => {
    if (value === rotatedRefreshToken)
      throw new DOMException('Storage quota', 'QuotaExceededError');
    stored.set(key, value);
  });
  fetch.mockResolvedValueOnce(
    Response.json({
      access_token: 'new-access',
      refresh_token: rotatedRefreshToken,
      expires_in: 3600,
      scope: 'profile',
      token_type: 'Bearer',
    }),
  );

  await expect(YouVersionAPIUsers.refreshTokenIfNeeded()).resolves.toBe(false);
  await expect(YouVersionAPIUsers.refreshTokenIfNeeded()).resolves.toBe(false);
  expect(config.accessToken).toBeNull();
  expect(config.refreshToken).toBeNull();
  expect(config.tokenExpiryDate).toBeNull();
  expect(YouVersionAPIUsers.getStoredUserInfo()).toBeNull();
  expect(browser.localStorage.setItem).toHaveBeenCalledWith('refreshToken', rotatedRefreshToken);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('rotates legacy tokens without assigning the returned scope to a stored profile', async () => {
  createOAuthBrowser('msw');
  const originalAccessToken = 'old-access-token';
  const originalRefreshToken = 'old-refresh-token';
  config.saveAuthData(originalAccessToken, originalRefreshToken, null);
  config.saveUserInfo({ id: 'legacy-user' });

  const requests: Request[] = [];
  if (process.env.INTEGRATION_TESTS) {
    server.listen();
    onTestFinished(() => {
      server.resetHandlers();
      server.close();
    });
  }
  server.use(
    http.all('*', ({ request }) => {
      requests.push(request);
      return HttpResponse.json({
        access_token: 'new-access-token',
        expires_in: 3600,
        refresh_token: 'new-refresh-token',
        scope: 'openid write_notes',
        token_type: 'Bearer',
      });
    }),
  );

  const result = await YouVersionAPIUsers.refreshTokens();

  expect(result?.accessToken).toBe('new-access-token');
  expect(result?.refreshToken).toBe('new-refresh-token');

  expect(requests).toHaveLength(1);
  const [request] = requests;
  if (!request) throw new Error('Expected the token request');
  expect(request.method).toBe('POST');
  expect(request.url).toBe('https://api.youversion.com/auth/token');
  expect(request.headers.get('content-type')).toBe('application/x-www-form-urlencoded');
  expect(Object.fromEntries(new URLSearchParams(await request.text()))).toEqual({
    grant_type: 'refresh_token',
    refresh_token: originalRefreshToken,
    client_id: 'test-app-key',
  });

  expect(config.accessToken).toBe('new-access-token');
  expect(config.refreshToken).toBe('new-refresh-token');
  expect(config.tokenExpiryDate).toEqual(result?.expiryDate);
  expect(config.tokenExpiryDate?.getTime()).toBeGreaterThan(Date.now());
  expect(YouVersionAPIUsers.getStoredUserInfo()?.userId).toBe('legacy-user');
  expect(config.getOAuthAccessToken('legacy-user', 'write_notes')).toBeNull();
});

it('shares one refresh request and keeps the rotated session for simultaneous callers', async () => {
  const { fetch, holdTokenResponse } = createOAuthBrowser();
  config.saveAuthData('old-access', 'old-refresh', new Date(0));
  config.saveUserInfo({ id: 'alice' });
  const finishRefresh = holdTokenResponse();
  fetch.mockResolvedValue(new Response(null, { status: 400 }));

  const firstRotation = vi.fn();
  const secondRotation = vi.fn();
  const failingObserver = vi.fn(() => {
    throw new Error('A rotation observer failed');
  });
  onTestFinished(YouVersionAPIUsers.onTokenRotation(failingObserver));
  const first = YouVersionAPIUsers.refreshTokenIfNeeded(firstRotation);
  const second = YouVersionAPIUsers.refreshTokenIfNeeded(secondRotation);
  finishRefresh(tokenResponse('openid profile'));

  await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  expect(fetch).toHaveBeenCalledTimes(1);
  const rotation = {
    result: expect.objectContaining({
      accessToken: 'signed-in-access',
      refreshToken: 'refresh-token-456',
    }),
    previousSession: { accessToken: 'old-access', refreshToken: 'old-refresh', userId: 'alice' },
  };
  expect(firstRotation).toHaveBeenCalledExactlyOnceWith(rotation);
  expect(secondRotation).toHaveBeenCalledExactlyOnceWith(rotation);
  expect(failingObserver).toHaveBeenCalledExactlyOnceWith(rotation);
  expect(config.accessToken).toBe('signed-in-access');
  expect(config.refreshToken).toBe('refresh-token-456');
  expect(YouVersionAPIUsers.getStoredUserInfo()?.userId).toBe('alice');
});
