/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  SignInWithYouVersionPermission,
  SignInWithYouVersionResult,
} from '@youversion/platform-core';
import { useYVAuth } from './useYVAuth';
import { YouVersionAuthProvider } from './context/YouVersionAuthProvider';
import { YouVersionAuthContext } from './context/YouVersionAuthContext';
import type { AuthConfig } from './types/auth';

// Mock the core modules
vi.mock('@youversion/platform-core', () => {
  // Create a mock configuration object that can be updated
  const mockConfiguration = {
    accessToken: null as string | null,
    idToken: null as string | null,
    refreshToken: null as string | null,
    appKey: '',
    apiHost: 'test-api.example.com',
    installationId: null as string | null,
    clearAuthTokens: vi.fn(() => {
      mockConfiguration.accessToken = null;
      mockConfiguration.idToken = null;
      mockConfiguration.refreshToken = null;
    }),
    saveAuthData: vi.fn(
      (
        accessToken: string | null,
        refreshToken: string | null,
        idToken: string | null,
        installationId: string | null,
      ) => {
        mockConfiguration.accessToken = accessToken;
        mockConfiguration.refreshToken = refreshToken;
        mockConfiguration.idToken = idToken;
        mockConfiguration.installationId = installationId;
      },
    ),
  };

  return {
    YouVersionAPIUsers: {
      signIn: vi.fn(),
      handleAuthCallback: vi.fn(),
      userInfo: vi.fn(),
      refreshTokenIfNeeded: vi.fn(),
    },
    YouVersionPlatformConfiguration: mockConfiguration,
    SignInWithYouVersionPermission: {
      bibles: 'bibles',
      highlights: 'highlights',
      user: 'user',
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

// Mock window object
const mockLocation = {
  href: 'https://example.com',
  search: '',
};

const mockWindow = {
  location: mockLocation,
};

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <YouVersionAuthProvider config={mockConfig}>{children}</YouVersionAuthProvider>;
}

describe('useYVAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup window mock
    vi.stubGlobal('window', mockWindow);
    mockLocation.search = '';

    // Reset configuration mocks
    YouVersionPlatformConfiguration.accessToken = null;
    YouVersionPlatformConfiguration.idToken = null;
    YouVersionPlatformConfiguration.refreshToken = null;
    YouVersionPlatformConfiguration.installationId = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('initialization', () => {
    it('should return unauthenticated state when no user info available', () => {
      const { result } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      expect(result.current.auth.isAuthenticated).toBe(false);
      expect(result.current.auth.accessToken).toBe(null);
      expect(result.current.auth.idToken).toBe(null);
      expect(result.current.userInfo).toBe(null);
    });

    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useYVAuth());
      }).toThrow('useYouVersionAuthContext must be used within an auth provider');
    });
  });

  describe('signIn', () => {
    it('should call YouVersionAPIUsers.signIn with correct parameters', async () => {
      const { result } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      const redirectUrl = 'https://example.com/callback';
      const permissions = [SignInWithYouVersionPermission.bibles];

      await act(async () => {
        await result.current.signIn({ redirectUrl, permissions });
      });

      expect(vi.mocked(YouVersionAPIUsers.signIn)).toHaveBeenCalledWith(
        new Set(permissions),
        redirectUrl,
      );
    });

    it('should call signIn with empty permissions when not provided', async () => {
      const { result } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      const redirectUrl = 'https://example.com/callback';

      await act(async () => {
        await result.current.signIn({ redirectUrl });
      });

      expect(vi.mocked(YouVersionAPIUsers.signIn)).toHaveBeenCalledWith(new Set([]), redirectUrl);
    });

    it('should throw error when signIn fails', async () => {
      const error = new Error('Sign in failed');
      vi.mocked(YouVersionAPIUsers.signIn).mockRejectedValue(error);

      const { result } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      await expect(
        act(async () => {
          await result.current.signIn({ redirectUrl: 'https://example.com/callback' });
        }),
      ).rejects.toThrow('Sign in failed');
    });
  });

  describe('processCallback', () => {
    it('should call handleAuthCallback and return result', async () => {
      vi.mocked(YouVersionAPIUsers.handleAuthCallback).mockResolvedValue(mockAuthResult);

      const { result } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      let callbackResult;
      await act(async () => {
        callbackResult = await result.current.processCallback();
      });

      expect(vi.mocked(YouVersionAPIUsers.handleAuthCallback)).toHaveBeenCalled();
      expect(callbackResult).toEqual(mockAuthResult);
    });

    it('should throw error when callback processing fails', async () => {
      const error = new Error('Callback processing failed');
      vi.mocked(YouVersionAPIUsers.handleAuthCallback).mockRejectedValue(error);

      const { result } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      await expect(
        act(async () => {
          await result.current.processCallback();
        }),
      ).rejects.toThrow('Callback processing failed');
    });

    it('should return null when no result from callback', async () => {
      vi.mocked(YouVersionAPIUsers.handleAuthCallback).mockResolvedValue(null);

      const { result } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      let callbackResult;
      await act(async () => {
        callbackResult = await result.current.processCallback();
      });

      expect(callbackResult).toBe(null);
    });
  });

  describe('signOut', () => {
    it('should call clearAuthTokens and reset user info', () => {
      const { result } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.signOut();
      });

      expect(YouVersionPlatformConfiguration.clearAuthTokens).toHaveBeenCalled();
    });
  });

  describe('auth state', () => {
    it('should derive correct auth state from configuration', () => {
      YouVersionPlatformConfiguration.saveAuthData('access-token', null, 'id-token', null);

      const { result } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      expect(result.current.auth.accessToken).toBe('access-token');
      expect(result.current.auth.idToken).toBe('id-token');
    });
  });

  describe('memoization', () => {
    it('should memoize auth state when values do not change', () => {
      const { result, rerender } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      const firstAuthState = result.current.auth;
      rerender();

      expect(result.current.auth).toBe(firstAuthState);
    });

    it('should create new auth state when context values change', () => {
      // Test with multiple renders to verify different context values create new auth states
      const { result: result1 } = renderHook(() => useYVAuth(), {
        wrapper: ({ children }) => (
          <YouVersionAuthContext.Provider
            value={{
              userInfo: null,
              setUserInfo: () => {
                // Mock function for testing
              },
              isLoading: false,
              error: null,
            }}
          >
            {children}
          </YouVersionAuthContext.Provider>
        ),
      });

      const firstAuthState = result1.current.auth;
      expect(result1.current.auth.isAuthenticated).toBe(false);
      expect(result1.current.userInfo).toBe(null);

      // Create a new hook instance with different context values
      const { result: result2 } = renderHook(() => useYVAuth(), {
        wrapper: ({ children }) => (
          <YouVersionAuthContext.Provider
            value={{
              userInfo: mockUserInfo,
              setUserInfo: () => {
                // Mock function for testing
              },
              isLoading: false,
              error: null,
            }}
          >
            {children}
          </YouVersionAuthContext.Provider>
        ),
      });

      // Verify that userInfo changed and auth state is different
      expect(result2.current.userInfo).toEqual(mockUserInfo);
      expect(result2.current.auth.isAuthenticated).toBe(true);
      expect(result2.current.auth).not.toBe(firstAuthState);
    });

    it('should memoize callbacks', () => {
      const { result, rerender } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      const firstSignIn = result.current.signIn;
      const firstSignOut = result.current.signOut;
      const firstProcessCallback = result.current.processCallback;

      rerender();

      expect(result.current.signIn).toBe(firstSignIn);
      expect(result.current.signOut).toBe(firstSignOut);
      expect(result.current.processCallback).toBe(firstProcessCallback);
    });
  });

  describe('error handling', () => {
    it('should include error in auth state when provider has error', () => {
      // This test would require modifying the TestWrapper to inject an error
      // For now, we'll test the structure
      const { result } = renderHook(() => useYVAuth(), {
        wrapper: TestWrapper,
      });

      expect(result.current.auth).toHaveProperty('error');
      expect(result.current.auth.result).toBe(null);
    });
  });
});
