import { act, renderHook, waitFor } from '@testing-library/react';
import { YouVersionAPIUsers, YouVersionPlatformConfiguration } from '@youversion/platform-core';
import type { ReactNode } from 'react';
import { expect, it, onTestFinished, vi } from 'vitest';
import { createMockAuthResult, createMockUserInfo } from './__tests__/mocks/auth';
import { YouVersionAuthContext } from './context/YouVersionAuthContext';
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

it('keeps a pending authorization profile signed out on remount and storage updates', async () => {
  YouVersionAPIUsers.signOut();
  onTestFinished(() => YouVersionAPIUsers.signOut());
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'pending-alice' });
  localStorage.setItem('youversion-auth-state', 'pending-note-authorization');

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
