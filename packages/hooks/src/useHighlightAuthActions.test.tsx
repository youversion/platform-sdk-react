import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  DataExchangeClient,
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
} from '@youversion/platform-core';
import { YouVersionContext } from './context';
import { YouVersionAuthContext } from './context/YouVersionAuthContext';
import { useHighlightAuthActions } from './useHighlightAuthActions';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <YouVersionContext.Provider value={{ appKey: 'app-1', apiHost: 'api.example.com' }}>
      <YouVersionAuthContext.Provider
        value={{
          userInfo: null,
          setUserInfo: vi.fn(),
          isLoading: false,
          error: null,
          redirectUri: 'https://host.example/callback',
        }}
      >
        {children}
      </YouVersionAuthContext.Provider>
    </YouVersionContext.Provider>
  );
}

describe('useHighlightAuthActions', () => {
  beforeEach(() => {
    localStorage.clear();
    YouVersionPlatformConfiguration.appKey = 'app-1';
    // A writable location stub so href assignment doesn't hit jsdom navigation.
    Object.defineProperty(window, 'location', {
      value: { href: 'https://host.example/read' },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    YouVersionPlatformConfiguration.appKey = null;
    vi.restoreAllMocks();
  });

  it('reads and invalidates the highlights permission cache', () => {
    // The permission cache is scoped to the signed-in user, so establish one.
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1' });
    const { result } = renderHook(() => useHighlightAuthActions(), { wrapper });

    expect(result.current.hasHighlightsPermission()).toBe(false);
    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
    expect(result.current.hasHighlightsPermission()).toBe(true);

    result.current.invalidateHighlightsPermission();
    expect(result.current.hasHighlightsPermission()).toBe(false);
  });

  it('starts sign-in requesting profile + highlights via the configured redirect', async () => {
    const signIn = vi.spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);
    const { result } = renderHook(() => useHighlightAuthActions(), { wrapper });

    await result.current.startSignInForHighlights();

    expect(signIn).toHaveBeenCalledWith(
      'https://host.example/callback',
      ['profile'],
      ['highlights'],
    );
  });

  it('mints a data-exchange token then redirects to the hosted consent page', async () => {
    const updateToken = vi
      .spyOn(DataExchangeClient.prototype, 'updateToken')
      .mockResolvedValue('dx-token');
    const { result } = renderHook(() => useHighlightAuthActions(), { wrapper });

    await result.current.startDataExchangeForHighlights();

    expect(updateToken).toHaveBeenCalledWith(['highlights']);
    expect(window.location.href).toContain('https://api.example.com/data-exchange');
    expect(window.location.href).toContain('token=dx-token');
    expect(window.location.href).toContain('app_key=app-1');
  });

  it('records the data-exchange initiator before awaiting the token mint', async () => {
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1' });
    let resolveToken!: (value: string) => void;
    const tokenGate = new Promise<string>((resolve) => {
      resolveToken = resolve;
    });
    vi.spyOn(DataExchangeClient.prototype, 'updateToken').mockReturnValue(tokenGate);

    const { result } = renderHook(() => useHighlightAuthActions(), { wrapper });
    const pending = result.current.startDataExchangeForHighlights();

    // Must be stamped before the mint resolves — otherwise a mid-await user
    // switch could bind the grant to the wrong session.
    expect(YouVersionPlatformConfiguration.dataExchangeInitiator).toBe('user-1');

    resolveToken('dx-token');
    await pending;
    expect(window.location.href).toContain('token=dx-token');
  });

  it('clears the data-exchange initiator when token mint fails', async () => {
    YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1' });
    vi.spyOn(DataExchangeClient.prototype, 'updateToken').mockRejectedValue(
      new Error('mint failed'),
    );

    const { result } = renderHook(() => useHighlightAuthActions(), { wrapper });

    await expect(result.current.startDataExchangeForHighlights()).rejects.toThrow('mint failed');
    expect(YouVersionPlatformConfiguration.dataExchangeInitiator).toBeNull();
  });
});
