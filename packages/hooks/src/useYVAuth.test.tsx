import { act, renderHook, waitFor } from '@testing-library/react';
import { YouVersionAPIUsers, YouVersionPlatformConfiguration } from '@youversion/platform-core';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
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
