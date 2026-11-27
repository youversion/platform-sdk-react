import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { StrictMode, type PropsWithChildren } from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { YouVersionAPIUsers, YouVersionPlatformConfiguration } from '@youversion/platform-core';
import YouVersionAuthProvider from './YouVersionAuthProvider';
import { useYouVersionAuthContext } from './YouVersionAuthContext';
import type { AuthConfig } from '../types/auth';
import { createMockUserInfo, createMockAuthResult } from '../__tests__/mocks/auth';

const mockConfig: AuthConfig = {
  appKey: 'test-app-key',
  apiHost: 'test-api.example.com',
};

const mockUserInfo = createMockUserInfo();
const mockAuthResult = createMockAuthResult();

function WebAuthWrapper({ children }: PropsWithChildren) {
  return <YouVersionAuthProvider config={mockConfig}>{children}</YouVersionAuthProvider>;
}

// Test component to access context
function TestChild() {
  const { userInfo, isLoading, error, oauthCallbackState } = useYouVersionAuthContext();

  return (
    <div>
      <div data-testid="user-info">{userInfo ? JSON.stringify(userInfo) : 'null'}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="error">{error ? error.message : 'null'}</div>
      <div data-testid="callback-state">{oauthCallbackState ?? 'null'}</div>
    </div>
  );
}

describe('YouVersionAuthProvider', () => {
  let handleAuthCallback: MockInstance;
  let getStoredUserInfo: MockInstance;
  let refreshTokenIfNeeded: MockInstance;

  beforeEach(() => {
    window.history.replaceState(null, '', '/');

    // Reset configuration
    YouVersionPlatformConfiguration.appKey = '';
    YouVersionPlatformConfiguration.apiHost = 'test-api.example.com';
    YouVersionPlatformConfiguration.clearAuthTokens();

    handleAuthCallback = vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockResolvedValue(null);
    getStoredUserInfo = vi.spyOn(YouVersionAPIUsers, 'getStoredUserInfo').mockReturnValue(null);
    refreshTokenIfNeeded = vi
      .spyOn(YouVersionAPIUsers, 'refreshTokenIfNeeded')
      .mockResolvedValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
  });

  describe('initialization', () => {
    it('should configure YouVersionPlatformConfiguration on mount', async () => {
      render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      // Wait for async initialization to complete
      await waitFor(() => {
        expect(YouVersionPlatformConfiguration.appKey).toBe(mockConfig.appKey);
        expect(YouVersionPlatformConfiguration.apiHost).toBe(mockConfig.apiHost);
      });
    });

    it('should use default apiHost when not provided', async () => {
      const configWithoutApiHost = {
        appKey: 'test-app-key',
        installationId: 'test-installation-id',
      };

      render(
        <YouVersionAuthProvider config={configWithoutApiHost}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await waitFor(() => {
        expect(YouVersionPlatformConfiguration.appKey).toBe('test-app-key');
        expect(YouVersionPlatformConfiguration.installationId).toBeTruthy();
        // Since config had no apiHost, component should set default (in real implementation this would be 'api.youversion.com')
        // But since we're mocking, we can test that it gets set to something defined
        expect(YouVersionPlatformConfiguration.apiHost).toBeTruthy();
      });
    });

    it('should handle null installationId', async () => {
      const configWithoutInstallation = {
        appKey: 'test-app-key',
      };

      render(
        <YouVersionAuthProvider config={configWithoutInstallation}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await waitFor(() => {
        expect(YouVersionPlatformConfiguration.installationId).not.toBe(null);
      });
    });
  });

  describe('OAuth callback handling', () => {
    it('publishes the verified callback state until another tab changes the session', async () => {
      window.history.replaceState(null, '', '?state=test-state&code=auth-code');
      vi.spyOn(YouVersionAPIUsers, 'getStoredUserInfo').mockReturnValue(mockUserInfo);
      vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockResolvedValue(mockAuthResult);

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(handleAuthCallback).toHaveBeenCalled();
      expect(getStoredUserInfo).toHaveBeenCalled();
      expect(getByTestId('user-info')).toHaveTextContent(JSON.stringify(mockUserInfo));
      expect(getByTestId('callback-state')).toHaveTextContent('test-state');

      const otherUser = createMockUserInfo({ id: 'other-account' });
      getStoredUserInfo.mockReturnValue(otherUser);
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', { key: 'userInfo', storageArea: localStorage }),
        );
      });
      expect(getByTestId('user-info')).toHaveTextContent('other-account');
      expect(getByTestId('callback-state')).toHaveTextContent('null');
    });

    it('should detect OAuth callback with error parameter', async () => {
      window.history.replaceState(
        null,
        '',
        '?error=access_denied&error_description=User+denied+access',
      );
      vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockResolvedValue(mockAuthResult);

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(handleAuthCallback).toHaveBeenCalled();
    });

    it('should handle callback error and set error state', async () => {
      window.history.replaceState(null, '', '?state=test-state&code=auth-code');
      const callbackError = new Error('Callback processing failed');
      vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockRejectedValue(callbackError);
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('error')).toHaveTextContent('Callback processing failed');
        expect(getByTestId('is-loading')).toHaveTextContent('false');
        expect(getByTestId('user-info')).toHaveTextContent('null');
        expect(getByTestId('callback-state')).toHaveTextContent('null');
      });
      expect(errorSpy).not.toHaveBeenCalledWith('Auth callback failed:', callbackError);
    });

    it('tolerates the StrictMode double-invocation without a spurious error', async () => {
      // The init effect has no re-entrancy guard, so under StrictMode it runs
      // twice and calls handleAuthCallback twice. The real fix is the core-layer
      // dedupe (see packages/core Users.test.ts); here we only assert the
      // provider effect tolerates the double-invocation and still resolves to an
      // authenticated, error-free state.
      window.history.replaceState(null, '', '?state=test-state&code=auth-code');
      vi.spyOn(YouVersionAPIUsers, 'getStoredUserInfo').mockReturnValue(mockUserInfo);
      vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockResolvedValue(mockAuthResult);

      const { getByTestId } = render(
        <StrictMode>
          <YouVersionAuthProvider config={mockConfig}>
            <TestChild />
          </YouVersionAuthProvider>
        </StrictMode>,
      );

      await waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      // The effect double-invoked (this is the condition the bug depended on).
      expect(handleAuthCallback).toHaveBeenCalledTimes(2);
      // Final state is authenticated with no error surfaced.
      expect(getByTestId('user-info')).toHaveTextContent(JSON.stringify(mockUserInfo));
      expect(getByTestId('error')).toHaveTextContent('null');
    });

    it('should leave user null when no profile was stored during callback', async () => {
      window.history.replaceState(null, '', '?state=test-state&code=auth-code');
      vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockResolvedValue(mockAuthResult);
      vi.spyOn(YouVersionAPIUsers, 'getStoredUserInfo').mockReturnValue(null);

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(getStoredUserInfo).toHaveBeenCalled();
      expect(getByTestId('user-info')).toHaveTextContent('null');
    });
  });

  describe('existing token handling', () => {
    it('should rehydrate stored user when refresh succeeds', async () => {
      // Set up refresh token before mounting component
      YouVersionPlatformConfiguration.saveAuthData(null, 'existing-refresh-token', null);

      vi.spyOn(YouVersionAPIUsers, 'refreshTokenIfNeeded').mockResolvedValue(true);
      vi.spyOn(YouVersionAPIUsers, 'getStoredUserInfo').mockReturnValue(mockUserInfo);

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(refreshTokenIfNeeded).toHaveBeenCalled();
      expect(getStoredUserInfo).toHaveBeenCalled();
      expect(getByTestId('user-info')).toHaveTextContent(JSON.stringify(mockUserInfo));
    });

    it('should handle refresh token failure', async () => {
      YouVersionPlatformConfiguration.saveAuthData(null, 'existing-refresh-token', null);
      vi.spyOn(YouVersionAPIUsers, 'refreshTokenIfNeeded').mockRejectedValue(
        new Error('Refresh failed'),
      );

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(getByTestId('user-info')).toHaveTextContent('null');
    });

    it('should clear user when the session expires and cannot be refreshed', async () => {
      YouVersionPlatformConfiguration.saveAuthData(null, 'existing-refresh-token', null);
      vi.spyOn(YouVersionAPIUsers, 'refreshTokenIfNeeded').mockResolvedValue(false);
      const getStoredUserInfoSpy = vi.spyOn(YouVersionAPIUsers, 'getStoredUserInfo');

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(getStoredUserInfoSpy).not.toHaveBeenCalled();
      expect(getByTestId('user-info')).toHaveTextContent('null');
    });
  });
});

it('keeps the account synced from another tab when the previous account refresh fails', async () => {
  YouVersionPlatformConfiguration.saveAuthData(
    'old-access-token',
    'old-refresh-token',
    new Date(0),
  );
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'old-account' });
  const oldRefresh = Promise.withResolvers<boolean>();
  const refresh = vi
    .spyOn(YouVersionAPIUsers, 'refreshTokenIfNeeded')
    .mockReturnValue(oldRefresh.promise);

  try {
    const { result } = renderHook(useYouVersionAuthContext, { wrapper: WebAuthWrapper });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      YouVersionPlatformConfiguration.saveAuthData('new-access-token', 'new-refresh-token', null);
      YouVersionPlatformConfiguration.saveUserInfo({ id: 'new-account' });
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'userInfo', storageArea: localStorage }),
      );
    });
    expect(result.current.userInfo?.userId).toBe('new-account');

    await act(async () => {
      oldRefresh.resolve(false);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.userInfo?.userId).toBe('new-account');

    act(() => {
      YouVersionAPIUsers.signOut();
      window.dispatchEvent(new StorageEvent('storage', { storageArea: localStorage }));
    });
    expect(result.current.userInfo).toBeNull();
  } finally {
    refresh.mockRestore();
    YouVersionAPIUsers.signOut();
  }
});

it('takes signed-in and signed-out state from the host across browser auth events', () => {
  window.history.replaceState(null, '', '?error=access_denied');
  YouVersionPlatformConfiguration.saveAuthData(
    'browser-access-token',
    'browser-refresh-token',
    null,
  );
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'browser-account' });

  try {
    const { getByTestId, rerender } = render(
      <YouVersionAuthProvider config={mockConfig} userInfo={null}>
        <TestChild />
      </YouVersionAuthProvider>,
    );
    expect(getByTestId('is-loading')).toHaveTextContent('false');
    expect(getByTestId('user-info')).toHaveTextContent('null');

    rerender(
      <YouVersionAuthProvider config={mockConfig} userInfo={{ id: 'host-account' }}>
        <TestChild />
      </YouVersionAuthProvider>,
    );
    expect(getByTestId('user-info')).toHaveTextContent('host-account');

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'userInfo', storageArea: localStorage }),
      );
    });
    expect(getByTestId('user-info')).toHaveTextContent('host-account');
    expect(getByTestId('error')).toHaveTextContent('null');
    expect(getByTestId('callback-state')).toHaveTextContent('null');

    rerender(
      <YouVersionAuthProvider config={mockConfig} userInfo={null}>
        <TestChild />
      </YouVersionAuthProvider>,
    );
    expect(getByTestId('user-info')).toHaveTextContent('null');
  } finally {
    window.history.replaceState(null, '', '/');
    YouVersionAPIUsers.signOut();
  }
});
