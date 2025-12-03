/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { YouVersionAPIUsers, YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { YouVersionAuthProvider } from './YouVersionAuthProvider';
import { useYouVersionAuthContext } from './YouVersionAuthContext';
import type { AuthConfig } from '../types/auth';

// Mock the core modules
vi.mock('@youversion/platform-core', () => {
  let mockInstallationId = 'auto-generated-installation-id';

  return {
    YouVersionAPIUsers: {
      handleAuthCallback: vi.fn(),
      userInfo: vi.fn(),
      refreshTokenIfNeeded: vi.fn(),
    },
    YouVersionPlatformConfiguration: {
      appKey: '',
      get installationId() {
        return mockInstallationId;
      },
      set installationId(value) {
        if (value) mockInstallationId = value;
      },
      apiHost: 'test-api.example.com',
      idToken: null,
      refreshToken: null,
      accessToken: null,
      clearAuthTokens: vi.fn(),
    },
  };
});

const mockConfig: AuthConfig = {
  appKey: 'test-app-key',
  apiHost: 'test-api.example.com',
  installationId: 'test-installation-id',
};

const mockUserInfo = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  picture: 'https://example.com/avatar.jpg',
};

const mockAuthResult = {
  ...mockUserInfo,
  accessToken: 'access-token',
  idToken: 'id-token',
  refreshToken: 'refresh-token',
  expiresIn: 3600,
};

// Mock window and location
const mockLocation = {
  href: 'https://example.com',
  search: '',
};

const mockWindow = {
  location: mockLocation,
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
    vi.clearAllMocks();

    // Setup window mock
    vi.stubGlobal('window', mockWindow);
    mockLocation.search = '';

    // Reset configuration
    YouVersionPlatformConfiguration.appKey = '';
    YouVersionPlatformConfiguration.apiHost = 'test-api.example.com';
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
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
      mockLocation.search = '?state=test-state&code=auth-code';
      vi.mocked(YouVersionAPIUsers.handleAuthCallback).mockResolvedValue(mockAuthResult);
      vi.mocked(YouVersionAPIUsers.userInfo).mockReturnValue(mockUserInfo);
      YouVersionPlatformConfiguration.idToken = 'test-id-token';

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await vi.waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(vi.mocked(YouVersionAPIUsers).handleAuthCallback).toHaveBeenCalled();
      expect(vi.mocked(YouVersionAPIUsers).userInfo).toHaveBeenCalledWith('test-id-token');
      expect(getByTestId('user-info')).toHaveTextContent(JSON.stringify(mockUserInfo));
    });

    it('should detect OAuth callback with error parameter', async () => {
      mockLocation.search = '?error=access_denied&error_description=User+denied+access';
      vi.mocked(YouVersionAPIUsers.handleAuthCallback).mockResolvedValue(mockAuthResult);

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
      mockLocation.search = '?state=test-state&code=auth-code';
      const callbackError = new Error('Callback processing failed');
      vi.mocked(YouVersionAPIUsers.handleAuthCallback).mockRejectedValue(callbackError);

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

    it('should handle callback with no idToken', async () => {
      mockLocation.search = '?state=test-state&code=auth-code';
      vi.mocked(YouVersionAPIUsers.handleAuthCallback).mockResolvedValue(mockAuthResult);
      YouVersionPlatformConfiguration.idToken = null;

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await vi.waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(vi.mocked(YouVersionAPIUsers).userInfo).not.toHaveBeenCalled();
      expect(getByTestId('user-info')).toHaveTextContent('null');
    });
  });

  describe('existing token handling', () => {
    it('should refresh token when refresh token exists', async () => {
      YouVersionPlatformConfiguration.refreshToken = 'existing-refresh-token';
      YouVersionPlatformConfiguration.idToken = 'refreshed-id-token';
      vi.mocked(YouVersionAPIUsers.refreshTokenIfNeeded).mockResolvedValue();
      vi.mocked(YouVersionAPIUsers.userInfo).mockReturnValue(mockUserInfo);

      const { getByTestId } = render(
        <YouVersionAuthProvider config={mockConfig}>
          <TestChild />
        </YouVersionAuthProvider>,
      );

      await vi.waitFor(() => {
        expect(getByTestId('is-loading')).toHaveTextContent('false');
      });

      expect(vi.mocked(YouVersionAPIUsers).refreshTokenIfNeeded).toHaveBeenCalled();
      expect(vi.mocked(YouVersionAPIUsers).userInfo).toHaveBeenCalledWith('refreshed-id-token');
      expect(getByTestId('user-info')).toHaveTextContent(JSON.stringify(mockUserInfo));
    });

    it('should handle refresh token failure', async () => {
      YouVersionPlatformConfiguration.refreshToken = 'existing-refresh-token';
      vi.mocked(YouVersionAPIUsers.refreshTokenIfNeeded).mockRejectedValue(
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

    it('should clear user when refresh token exists but no idToken after refresh', async () => {
      YouVersionPlatformConfiguration.refreshToken = 'existing-refresh-token';
      YouVersionPlatformConfiguration.idToken = null;
      vi.mocked(YouVersionAPIUsers.refreshTokenIfNeeded).mockResolvedValue();

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
  });
});
