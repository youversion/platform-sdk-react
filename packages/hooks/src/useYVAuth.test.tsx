import { act, render, renderHook, waitFor } from '@testing-library/react';
import { YouVersionAPIUsers, YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { StrictMode, type ReactNode } from 'react';
import { expect, it, onTestFinished, vi } from 'vitest';
import { createMockAuthResult, createMockUserInfo } from './__tests__/mocks/auth';
import { YouVersionAuthContext, useYouVersionAuthContext } from './context/YouVersionAuthContext';
import { YouVersionProvider } from './context/YouVersionProvider';
import type { AuthContextValue } from './types/auth';
import { useYVAuth } from './useYVAuth';

function wrapperWith(redirectUri?: string, setUserInfo = vi.fn()) {
  return ({ children }: { children: ReactNode }) => (
    <YouVersionAuthContext.Provider
      value={{
        userInfo: createMockUserInfo(),
        setUserInfo,
        isLoading: false,
        error: null,
        redirectUri,
      }}
    >
      {children}
    </YouVersionAuthContext.Provider>
  );
}

function WebAuthWrapper({ children }: { children: ReactNode }) {
  return (
    <YouVersionProvider
      appKey="test-app-key"
      includeAuth
      authRedirectUrl="https://example.com/callback"
    >
      {children}
    </YouVersionProvider>
  );
}

it('requires the auth provider boundary', () => {
  expect(() => renderHook(() => useYVAuth())).toThrow(
    'useYouVersionAuthContext must be used within an auth provider',
  );
});

it('derives authentication, loading, token, and error state from its boundaries', () => {
  const userInfo = createMockUserInfo();
  const providerError = new Error('session unavailable');
  const accessToken = vi
    .spyOn(YouVersionPlatformConfiguration, 'accessToken', 'get')
    .mockReturnValue('access-token');
  let context: AuthContextValue = {
    userInfo: null,
    setUserInfo: vi.fn(),
    isLoading: true,
    error: providerError,
  };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <YouVersionAuthContext.Provider value={context}>{children}</YouVersionAuthContext.Provider>
  );
  const { result, rerender } = renderHook(() => useYVAuth(), { wrapper });

  expect(result.current.auth).toMatchObject({
    isAuthenticated: false,
    isLoading: true,
    accessToken: 'access-token',
    error: providerError,
  });

  context = { ...context, userInfo, isLoading: false, error: null };
  rerender();
  expect(result.current.auth).toMatchObject({
    isAuthenticated: true,
    isLoading: false,
    accessToken: 'access-token',
    error: null,
  });
  accessToken.mockRestore();
});

it('pairs a managed access token only with the matching profile across storage updates', async () => {
  const config = YouVersionPlatformConfiguration;
  YouVersionAPIUsers.signOut();
  onTestFinished(() => YouVersionAPIUsers.signOut());
  const expires = new Date('2100-01-01');
  config.saveAuthData('alice-access', 'alice-refresh', expires, {
    scope: 'profile',
    userId: 'alice',
  });
  config.saveUserInfo({ id: 'alice' });
  const { result } = renderHook(useYVAuth, { wrapper: WebAuthWrapper });
  await waitFor(() => expect(result.current.userInfo?.userId).toBe('alice'));
  expect(result.current.auth.accessToken).toBe('alice-access');

  act(() => {
    config.saveAuthData('bob-access', 'bob-refresh', expires, {
      scope: 'profile',
      userId: 'bob',
    });
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }),
    );
  });
  expect(result.current.userInfo?.userId).toBe('alice');
  expect(result.current.auth.accessToken).toBeNull();

  act(() => {
    config.saveUserInfo({ id: 'bob' });
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'userInfo', storageArea: localStorage }),
    );
  });
  expect(result.current.userInfo?.userId).toBe('bob');
  expect(result.current.auth.accessToken).toBe('bob-access');

  act(() => {
    YouVersionAPIUsers.signOut();
    window.dispatchEvent(new StorageEvent('storage', { storageArea: localStorage }));
  });
  expect(result.current.userInfo).toBeNull();
  expect(result.current.auth.accessToken).toBeNull();
});

it('keeps an initial legacy token without adopting later unbound credentials', async () => {
  const config = YouVersionPlatformConfiguration;
  YouVersionAPIUsers.signOut();
  onTestFinished(() => YouVersionAPIUsers.signOut());
  const expires = new Date('2100-01-01');
  config.saveAuthData('legacy-access', 'legacy-refresh', expires);
  config.saveUserInfo({ id: 'legacy-alice' });

  const { result } = renderHook(useYVAuth, { wrapper: WebAuthWrapper });
  await waitFor(() => expect(result.current.auth.isLoading).toBe(false));
  expect(result.current.userInfo?.userId).toBe('legacy-alice');
  expect(result.current.auth.accessToken).toBe('legacy-access');
  expect(config.getOAuthAccessToken('legacy-alice', 'write_notes')).toBeNull();

  act(() => {
    const previousProfile = localStorage.getItem('userInfo');
    config.saveUserInfo({ id: 'legacy-alice', name: 'Updated Alice' });
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'userInfo',
        oldValue: previousProfile,
        newValue: localStorage.getItem('userInfo'),
        storageArea: localStorage,
      }),
    );
  });
  expect(result.current.userInfo?.name).toBe('Updated Alice');
  expect(result.current.auth.accessToken).toBe('legacy-access');

  act(() => {
    config.saveAuthData('new-access', 'new-refresh', expires);
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }),
    );
  });
  expect(result.current.userInfo?.userId).toBe('legacy-alice');
  expect(result.current.auth.accessToken).toBeNull();

  act(() => {
    config.saveUserInfo({ id: 'legacy-bob' });
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'userInfo', storageArea: localStorage }),
    );
  });
  expect(result.current.userInfo?.userId).toBe('legacy-bob');
  expect(result.current.auth.accessToken).toBeNull();

  act(() => {
    config.saveAuthData('bound-access', 'bound-refresh', expires, {
      scope: 'profile',
      userId: 'legacy-bob',
    });
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }),
    );
  });
  expect(result.current.auth.accessToken).toBe('bound-access');
});

it.each(['alice', null])(
  'exposes an initial access-only token when the stored account is %s',
  async (userId) => {
    YouVersionAPIUsers.signOut();
    onTestFinished(() => YouVersionAPIUsers.signOut());
    const config = YouVersionPlatformConfiguration;
    config.saveAuthData('access-only', null, new Date('2100-01-01'));
    if (userId) config.saveUserInfo({ id: userId });
    const { result } = renderHook(useYVAuth, { wrapper: WebAuthWrapper });
    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));
    expect(result.current.auth.accessToken).toBe('access-only');
    expect(config.getOAuthAccessToken('alice', 'write_notes')).toBeNull();
  },
);

it('exposes an unscoped token from a verified callback with no decoded account', async () => {
  YouVersionAPIUsers.signOut();
  onTestFinished(() => {
    vi.unstubAllGlobals();
    window.history.replaceState(null, '', '/');
    YouVersionAPIUsers.signOut();
  });
  localStorage.setItem('youversion-auth-state', 'opaque-login');
  localStorage.setItem('youversion-auth-code-verifier', 'test-verifier');
  localStorage.setItem('youversion-auth-redirect-uri', 'https://example.com/callback');
  window.history.replaceState(null, '', '?state=opaque-login&code=opaque-code');
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        access_token: 'opaque-access',
        refresh_token: 'opaque-refresh',
        expires_in: 3600,
        id_token: 'e30.e30.fixture',
        scope: 'write_notes',
        token_type: 'Bearer',
      }),
    ),
  );

  const { result } = renderHook(useYVAuth, { wrapper: WebAuthWrapper });
  await waitFor(() => expect(result.current.auth.isLoading).toBe(false));
  expect(result.current.userInfo).toBeNull();
  expect(result.current.auth.accessToken).toBe('opaque-access');
  expect(YouVersionPlatformConfiguration.getOAuthAccessToken(null, 'write_notes')).toBeNull();
});

it.each([
  {
    outcome: 'a hosted denial',
    query: 'state=prior-auth&error=access_denied',
    exchange: false,
    token: 'legacy-access',
  },
  {
    outcome: 'an exchange failure',
    query: 'state=prior-auth&code=temporarily-unavailable',
    exchange: true,
    token: 'legacy-access',
  },
  {
    outcome: 'a superseded callback',
    query: 'state=old-auth&code=old-code',
    exchange: false,
    token: null,
  },
  {
    outcome: 'an unverified denial',
    query: 'error=access_denied',
    exchange: false,
    token: null,
  },
])(
  'preserves only the verified legacy token after $outcome',
  async ({ query, exchange, token }) => {
    YouVersionAPIUsers.signOut();
    onTestFinished(() => {
      vi.unstubAllGlobals();
      window.history.replaceState(null, '', '/');
      YouVersionAPIUsers.signOut();
    });
    const config = YouVersionPlatformConfiguration;
    config.saveAuthData('legacy-access', 'legacy-refresh', new Date('2100-01-01'));
    config.saveUserInfo({ id: 'legacy-alice' });
    localStorage.setItem('youversion-auth-state', 'prior-auth');
    localStorage.setItem('youversion-auth-code-verifier', 'test-verifier');
    localStorage.setItem('youversion-auth-redirect-uri', 'https://example.com/callback');
    window.history.replaceState(null, '', `?${query}`);
    const fetch = vi.fn(async () => new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fetch);

    const { result } = renderHook(
      () => ({ ...useYVAuth(), failedState: useYouVersionAuthContext().oauthFailedCallbackState }),
      {
        wrapper: ({ children }) => (
          <StrictMode>
            <WebAuthWrapper>{children}</WebAuthWrapper>
          </StrictMode>
        ),
      },
    );
    await waitFor(() => expect(result.current.auth.isLoading).toBe(false));
    expect(result.current.auth.isAuthenticated).toBe(true);
    expect(result.current.userInfo?.userId).toBe('legacy-alice');
    expect(result.current.auth.error).toBeInstanceOf(Error);
    expect(result.current.auth.accessToken).toBe(token);
    expect(result.current.failedState).toBe(token ? 'prior-auth' : null);
    expect(config.getOAuthAccessToken('legacy-alice', 'write_notes')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(Number(exchange));
  },
);

it('exposes a verified direct rotation to a new consumer in the same Provider', async () => {
  const config = YouVersionPlatformConfiguration;
  YouVersionAPIUsers.signOut();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json({
        access_token: 'after-direct-refresh',
        refresh_token: 'after-direct-refresh-token',
        expires_in: 3600,
        scope: 'write_notes',
        token_type: 'Bearer',
      }),
    ),
  );
  onTestFinished(() => {
    vi.unstubAllGlobals();
    YouVersionAPIUsers.signOut();
  });
  config.saveAuthData('before-direct-refresh', 'old-refresh', new Date('2100-01-01'));
  config.saveUserInfo({ id: 'alice' });

  function Token() {
    const { auth } = useYVAuth();
    return <output>{auth.isLoading ? 'loading' : (auth.accessToken ?? 'no token')}</output>;
  }

  const view = render(
    <WebAuthWrapper>
      <Token key="initial" />
    </WebAuthWrapper>,
  );
  await view.findByText('before-direct-refresh');
  await act(async () => {
    await YouVersionAPIUsers.refreshTokens();
  });
  view.rerender(
    <WebAuthWrapper>
      <Token key="after-rotation" />
    </WebAuthWrapper>,
  );
  await view.findByText('after-direct-refresh');
  expect(config.getOAuthAccessToken('alice', 'write_notes')).toBeNull();

  config.saveAuthData('unrelated-access', 'unrelated-refresh', new Date('2100-01-01'));
  view.rerender(
    <WebAuthWrapper>
      <Token key="after-unbound-replacement" />
    </WebAuthWrapper>,
  );
  await view.findByText('no token');
});

it.each([
  { scenario: 'rotates', replacement: null, owner: 'alice', token: 'rotated-access' },
  { scenario: 'overlaps staged credentials', replacement: 'staged', owner: 'alice', token: null },
  {
    scenario: 'is superseded by another account',
    replacement: 'bob',
    owner: 'bob',
    token: 'bob-access',
  },
])(
  'pairs a late auth consumer with the current account when a legacy session $scenario',
  async ({ replacement, owner, token }) => {
    const config = YouVersionPlatformConfiguration;
    YouVersionAPIUsers.signOut();
    const reply = Promise.withResolvers<Response>();
    const fetch = vi.fn(() => reply.promise);
    vi.stubGlobal('fetch', fetch);
    onTestFinished(() => {
      vi.unstubAllGlobals();
      YouVersionAPIUsers.signOut();
    });
    config.saveAuthData('expired-access', 'legacy-refresh', new Date(0));
    config.saveUserInfo({ id: 'alice' });

    function AfterAuth({ children }: { children: ReactNode }) {
      return useYouVersionAuthContext().isLoading ? null : children;
    }
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <StrictMode>
          <WebAuthWrapper>
            <AfterAuth>{children}</AfterAuth>
          </WebAuthWrapper>
        </StrictMode>
      );
    }
    const { result } = renderHook(useYVAuth, { wrapper: Wrapper });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();

    if (replacement) {
      act(() => {
        config.saveAuthData(
          'bob-access',
          'bob-refresh',
          new Date('2100-01-01'),
          replacement === 'bob' ? { scope: 'profile', userId: 'bob' } : undefined,
        );
        if (replacement === 'bob') config.saveUserInfo({ id: 'bob' });
        window.dispatchEvent(
          new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }),
        );
      });
    }
    await act(async () => {
      reply.resolve(
        Response.json({
          access_token: 'rotated-access',
          refresh_token: 'rotated-refresh',
          expires_in: 3600,
          scope: 'openid write_notes',
          token_type: 'Bearer',
        }),
      );
    });
    await waitFor(() => expect(result.current?.auth.isLoading).toBe(false));
    expect(result.current.userInfo?.userId).toBe(owner);
    expect(result.current.auth.accessToken).toBe(token);
    expect(config.getOAuthAccessToken(owner, 'write_notes')).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  },
);

it('keeps a pending authorization profile signed out on remount and storage updates', async () => {
  YouVersionAPIUsers.signOut();
  onTestFinished(() => YouVersionAPIUsers.signOut());
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'pending-alice' });
  localStorage.setItem('youversion-auth-state', 'pending-note-authorization');
  localStorage.setItem('youversion-auth-code-verifier', 'test-verifier');

  const { result } = renderHook(useYVAuth, { wrapper: WebAuthWrapper });
  await waitFor(() => expect(result.current.auth.isLoading).toBe(false));
  expect(result.current.auth.isAuthenticated).toBe(false);
  expect(result.current.userInfo).toBeNull();
  expect(result.current.auth.accessToken).toBeNull();
  expect(YouVersionAPIUsers.getStoredUserInfo()?.userId).toBe('pending-alice');
  expect(YouVersionAPIUsers.isSignInPending('pending-note-authorization')).toBe(true);

  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }),
    );
  });
  expect(result.current.auth.isAuthenticated).toBe(false);
  expect(result.current.userInfo).toBeNull();
  expect(result.current.auth.accessToken).toBeNull();
});

it('publishes explicit sign-out after a failed reauthorization left the profile signed out', async () => {
  YouVersionAPIUsers.signOut();
  const previousUrl = window.location.href;
  onTestFinished(() => {
    window.history.replaceState(null, '', previousUrl);
    YouVersionAPIUsers.signOut();
  });
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'alice' });
  localStorage.setItem('youversion-auth-state', 'note-authorization');
  localStorage.setItem('youversion-auth-code-verifier', 'test-verifier');
  window.history.replaceState(null, '', '?state=note-authorization&error=access_denied');

  const { result } = renderHook(
    () => ({ session: useYVAuth(), context: useYouVersionAuthContext() }),
    { wrapper: WebAuthWrapper },
  );
  await waitFor(() => expect(result.current.session.auth.isLoading).toBe(false));
  expect(result.current.context.oauthFailedCallbackState).toBe('note-authorization');
  expect(result.current.session.userInfo).toBeNull();
  expect(YouVersionAPIUsers.getStoredUserInfo()?.userId).toBe('alice');
  expect(result.current.context.accountRevision).toBe(0);

  act(() => result.current.session.signOut());

  expect(YouVersionAPIUsers.getStoredUserInfo()).toBeNull();
  expect(result.current.session.userInfo).toBeNull();
  expect(result.current.context.accountRevision).toBe(1);
});

it('reads the raw token for a host-controlled provider without a profile', async () => {
  YouVersionAPIUsers.signOut();
  onTestFinished(() => YouVersionAPIUsers.signOut());
  YouVersionPlatformConfiguration.saveAuthData('host-access', null, null);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <YouVersionProvider
      appKey="test-app-key"
      includeAuth
      authRedirectUrl="https://example.com/callback"
      userInfo={null}
    >
      {children}
    </YouVersionProvider>
  );

  const { result } = renderHook(useYVAuth, { wrapper });
  await waitFor(() => expect(result.current.auth.isLoading).toBe(false));
  expect(result.current.userInfo).toBeNull();
  expect(result.current.auth.accessToken).toBe('host-access');
});

it('forwards scopes and permissions while honoring an explicit redirect URL', async () => {
  const signIn = vi.spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);
  const { result } = renderHook(() => useYVAuth(), { wrapper: wrapperWith('https://default') });

  await act(() =>
    result.current.signIn({
      redirectUrl: 'https://explicit',
      scopes: ['profile', 'email'],
      permissions: ['highlights'],
    }),
  );

  expect(signIn).toHaveBeenCalledWith('https://explicit', ['profile', 'email'], ['highlights']);
  signIn.mockRestore();
});

it('uses the real provider redirect, follows configuration changes, and rejects a missing redirect', async () => {
  const signIn = vi.spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);
  let redirect = 'https://default';
  const wrapper = ({ children }: { children: ReactNode }) => (
    <YouVersionProvider appKey="test-app" includeAuth authRedirectUrl={redirect} userInfo={null}>
      {children}
    </YouVersionProvider>
  );
  try {
    const { result, rerender } = renderHook(() => useYVAuth(), { wrapper });
    await waitFor(() => expect(result.current?.auth.isLoading).toBe(false));
    await act(() => result.current.signIn());
    expect(signIn).toHaveBeenLastCalledWith('https://default', undefined, undefined);

    redirect = 'https://changed';
    rerender();
    await act(() => result.current.signIn());
    expect(signIn).toHaveBeenLastCalledWith('https://changed', undefined, undefined);

    redirect = '';
    rerender();
    await expect(result.current.signIn()).rejects.toThrow('redirectUrl is required');
    expect(signIn).toHaveBeenCalledTimes(2);
  } finally {
    signIn.mockRestore();
  }
});

it('returns the authentication callback result unchanged', async () => {
  const authResult = createMockAuthResult();
  const callback = vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockResolvedValue(authResult);
  const { result } = renderHook(() => useYVAuth(), { wrapper: wrapperWith() });

  await expect(result.current.processCallback()).resolves.toEqual(authResult);
  callback.mockRestore();
});

it('clears tokens and user state on sign out', () => {
  const setUserInfo = vi.fn();
  const clearTokens = vi
    .spyOn(YouVersionPlatformConfiguration, 'clearAuthTokens')
    .mockImplementation(() => {});
  const { result } = renderHook(() => useYVAuth(), {
    wrapper: wrapperWith(undefined, setUserInfo),
  });

  act(() => result.current.signOut());

  expect(clearTokens).toHaveBeenCalledOnce();
  expect(setUserInfo).toHaveBeenCalledWith(null);
  clearTokens.mockRestore();
});
