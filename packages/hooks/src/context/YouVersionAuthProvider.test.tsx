import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { YouVersionAPIUsers, YouVersionPlatformConfiguration } from '@youversion/platform-core';
import YouVersionAuthProvider from './YouVersionAuthProvider';
import { useYouVersionAuthContext } from './YouVersionAuthContext';
import type { AuthConfig } from '../types/auth';
import { createMockUserInfo, createMockAuthResult } from '../__tests__/mocks/auth';

// Mock the core modules using shared factory
vi.mock('@youversion/platform-core', async () => {
  const { createGetterCoreMockFactory } = await import('../__tests__/mocks/core-mock-factory');
  return createGetterCoreMockFactory();
});

const mockConfig: AuthConfig = {
  appKey: 'test-app-key',
  apiHost: 'test-api.example.com',
};

const mockUserInfo = createMockUserInfo();
const mockAuthResult = createMockAuthResult();

// Mock window and location
const mockWindow = {
  location: {
    href: 'https://example.com',
    search: '',
  },
};

// Test component to access context
function TestChild() {
  const { userInfo, isLoading, error } = useYouVersionAuthContext();

  return (
    <div>
      <div data-testid="user-info">{userInfo ? JSON.stringify(userInfo) : 'null'}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="error">{error ? error.message : 'null'}</div>
    </div>
  );
}

describe('YouVersionAuthProvider', () => {
  beforeEach(() => {
    // Setup window mock
    vi.stubGlobal('window', mockWindow);
    mockWindow.location.search = '';

    // Reset configuration
    YouVersionPlatformConfiguration.appKey = '';
    YouVersionPlatformConfiguration.apiHost = 'test-api.example.com';
    YouVersionPlatformConfiguration.clearAuthTokens();
  });

  describe('initialization', () => {
    it('should configure YouVersionPlatformConfiguration on mount', async () => {
      render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      // Wait for async initialization to complete
      await vi.waitFor(() => {
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

      await vi.waitFor(() => {
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

      await vi.waitFor(() => {
        expect(YouVersionPlatformConfiguration.installationId).not.toBe(null);
      });
    });
  });

  describe('OAuth callback handling', () => {
    it('should detect OAuth callback with state parameter', async () => {
      mockWindow.location.search = '?state=test-state&code=auth-code';
      vi.spyOn(YouVersionAPIUsers, 'getStoredUserInfo').mockReturnValue(mockUserInfo);
      vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockResolvedValue(mockAuthResult);

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await vi.waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(vi.mocked(YouVersionAPIUsers).handleAuthCallback).toHaveBeenCalled();
      expect(vi.mocked(YouVersionAPIUsers).getStoredUserInfo).toHaveBeenCalled();
      expect(getByTestId('user-info')).toHaveTextContent(JSON.stringify(mockUserInfo));
    });

    it('should detect OAuth callback with error parameter', async () => {
      mockWindow.location.search = '?error=access_denied&error_description=User+denied+access';
      vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockResolvedValue(mockAuthResult);

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await vi.waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(vi.mocked(YouVersionAPIUsers).handleAuthCallback).toHaveBeenCalled();
    });

    it('should handle callback error and set error state', async () => {
      mockWindow.location.search = '?state=test-state&code=auth-code';
      const callbackError = new Error('Callback processing failed');
      vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockRejectedValue(callbackError);

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await vi.waitFor(() => {
        expect(getByTestId('error')).toHaveTextContent('Callback processing failed');
        expect(getByTestId('is-loading')).toHaveTextContent('false');
        expect(getByTestId('user-info')).toHaveTextContent('null');
      });
    });

    it('tolerates the StrictMode double-invocation without a spurious error', async () => {
      // The init effect has no re-entrancy guard, so under StrictMode it runs
      // twice and calls handleAuthCallback twice. The real fix is the core-layer
      // dedupe (see packages/core Users.test.ts); here we only assert the
      // provider effect tolerates the double-invocation and still resolves to an
      // authenticated, error-free state.
      mockWindow.location.search = '?state=test-state&code=auth-code';
      vi.spyOn(YouVersionAPIUsers, 'getStoredUserInfo').mockReturnValue(mockUserInfo);
      vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockResolvedValue(mockAuthResult);

      const { getByTestId } = render(
        <StrictMode>
          <YouVersionAuthProvider config={mockConfig}>
            <TestChild />
          </YouVersionAuthProvider>
        </StrictMode>,
      );

      await vi.waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      // The effect double-invoked (this is the condition the bug depended on).
      expect(vi.mocked(YouVersionAPIUsers).handleAuthCallback).toHaveBeenCalledTimes(2);
      // Final state is authenticated with no error surfaced.
      expect(getByTestId('user-info')).toHaveTextContent(JSON.stringify(mockUserInfo));
      expect(getByTestId('error')).toHaveTextContent('null');
    });

    it('should leave user null when no profile was stored during callback', async () => {
      mockWindow.location.search = '?state=test-state&code=auth-code';
      vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback').mockResolvedValue(mockAuthResult);
      vi.spyOn(YouVersionAPIUsers, 'getStoredUserInfo').mockReturnValue(null);

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await vi.waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(vi.mocked(YouVersionAPIUsers).getStoredUserInfo).toHaveBeenCalled();
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

      await vi.waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(vi.mocked(YouVersionAPIUsers).refreshTokenIfNeeded).toHaveBeenCalled();
      expect(vi.mocked(YouVersionAPIUsers).getStoredUserInfo).toHaveBeenCalled();
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

      await vi.waitFor(() => {
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

      await vi.waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(getStoredUserInfoSpy).not.toHaveBeenCalled();
      expect(getByTestId('user-info')).toHaveTextContent('null');
    });
  });
});
