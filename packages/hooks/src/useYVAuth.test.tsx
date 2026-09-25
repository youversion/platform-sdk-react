import { act, renderHook } from '@testing-library/react';
import { YouVersionAPIUsers, YouVersionPlatformConfiguration } from '@youversion/platform-core';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { createMockAuthResult, createMockUserInfo } from './__tests__/mocks/auth';
import { YouVersionAuthContext } from './context/YouVersionAuthContext';
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

it('falls back to the provider redirect and rejects when neither redirect is configured', async () => {
  const signIn = vi.spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);
  const configured = renderHook(() => useYVAuth(), { wrapper: wrapperWith('https://default') });
  await act(() => configured.result.current.signIn());
  expect(signIn).toHaveBeenCalledWith('https://default', undefined, undefined);

  const missing = renderHook(() => useYVAuth(), { wrapper: wrapperWith() });
  await expect(missing.result.current.signIn()).rejects.toThrow('redirectUrl is required');
  signIn.mockRestore();
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
