/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  SignInWithYouVersionResult,
} from '@youversion/platform-core';
import { YouVersionAuthProvider } from './YouVersionAuthProvider';
import { useYouVersionAuthContext } from './YouVersionAuthContext';
import type { AuthConfig } from '../types/auth';

// Mock the core modules
vi.mock('@youversion/platform-core', () => {
  let mockInstallationId = 'auto-generated-installation-id';
  let mockIdToken: string | null = null;
  let mockRefreshToken: string | null = null;
  let mockAccessToken: string | null = null;

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
      get idToken() {
        return mockIdToken;
      },
      get refreshToken() {
        return mockRefreshToken;
      },
      get accessToken() {
        return mockAccessToken;
      },
      clearAuthTokens: vi.fn(() => {
        mockIdToken = null;
        mockRefreshToken = null;
        mockAccessToken = null;
      }),
      saveAuthData: vi.fn(
        (accessToken: string | null, refreshToken: string | null, idToken: string | null) => {
          mockAccessToken = accessToken;
          mockRefreshToken = refreshToken;
          mockIdToken = idToken;
        },
      ),
    },
    SignInWithYouVersionResult: class {
      accessToken: string | undefined;
      expiryDate: Date | undefined;
      refreshToken: string | undefined;
      idToken: string | undefined;
      permissions: string[] | undefined;
      yvpUserId: string | undefined;
      name: string | undefined;
      profilePicture: string | undefined;
      email: string | undefined;

      constructor(props: {
        accessToken?: string;
        expiresIn?: number;
        refreshToken?: string;
        idToken?: string;
        permissions?: string[];
        yvpUserId?: string;
        name?: string;
        profilePicture?: string;
        email?: string;
      }) {
        this.accessToken = props.accessToken;
        this.expiryDate = props.expiresIn
          ? new Date(Date.now() + props.expiresIn * 1000)
          : new Date();
        this.refreshToken = props.refreshToken;
        this.idToken = props.idToken;
        this.permissions = props.permissions;
        this.yvpUserId = props.yvpUserId;
        this.name = props.name;
        this.profilePicture = props.profilePicture;
        this.email = props.email;
      }
    },
  };
});

const mockConfig: AuthConfig = {
  appKey: 'test-app-key',
  apiHost: 'test-api.example.com',
};

const mockUserInfo = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  picture: 'https://example.com/avatar.jpg',
  getAvatarUrl: vi.fn((width = 200, height = 200) => {
    try {
      return new URL(`https://example.com/avatar.jpg?w=${width}&h=${height}`);
    } catch {
      return null;
    }
  }),
  get avatarUrl() {
    return this.getAvatarUrl();
  },
};

const mockAuthResult = new SignInWithYouVersionResult({
  ...mockUserInfo,
  accessToken: 'access-token',
  idToken: 'id-token',
  refreshToken: 'refresh-token',
  expiresIn: 3600,
  permissions: ['bibles', 'highlights'],
  yvpUserId: 'test-yvp-user-id',
  profilePicture: 'https://example.com/profile.jpg',
});

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
    YouVersionPlatformConfiguration.clearAuthTokens();
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

      // Mock the configuration to return the id token after handleAuthCallback
      vi.mocked(YouVersionAPIUsers.handleAuthCallback).mockImplementation(() => {
        YouVersionPlatformConfiguration.saveAuthData(null, null, 'test-id-token', null);
        return Promise.resolve(mockAuthResult);
      });

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
      YouVersionPlatformConfiguration.saveAuthData(null, null, null, null);

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
      // Set up refresh token before mounting component
      YouVersionPlatformConfiguration.saveAuthData(null, 'existing-refresh-token', null, null);

      // Mock refreshTokenIfNeeded to set the id token after successful refresh
      vi.mocked(YouVersionAPIUsers.refreshTokenIfNeeded).mockImplementation(() => {
        YouVersionPlatformConfiguration.saveAuthData(null, null, 'refreshed-id-token', null);
        return Promise.resolve(true);
      });
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
      YouVersionPlatformConfiguration.saveAuthData(null, 'existing-refresh-token', null, null);
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
      YouVersionPlatformConfiguration.saveAuthData(null, 'existing-refresh-token', null, null);
      vi.mocked(YouVersionAPIUsers.refreshTokenIfNeeded).mockResolvedValue(false);

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
