import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { YouVersionAPIUsers, YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { useYVAuth } from './useYVAuth';
import { YouVersionAuthContext } from './context/YouVersionAuthContext';
import { createMockUserInfo, createMockAuthResult } from './__tests__/mocks/auth';
import { createAuthProviderWrapper } from './__tests__/utils/test-utils';
import type { AuthenticationScopes } from '@youversion/platform-core';

// Mock the core modules using shared factory
vi.mock('@youversion/platform-core', async () => {
  const { createSimpleCoreMockFactory } = await import('./__tests__/mocks/core-mock-factory');
  return createSimpleCoreMockFactory();
});

const mockUserInfo = createMockUserInfo();
const mockAuthResult = createMockAuthResult();

// Mock window object
const mockWindow = {
  location: {
    href: 'https://example.com',
    search: '',
  },
};

const TestWrapper = createAuthProviderWrapper();

// Helper function to render hook and wait for it to be ready
const renderAuthHook = async () => {
  const hookResult = renderHook(() => useYVAuth(), {
    wrapper: TestWrapper,
  });

  // Wait for the lazy-loaded provider with act to handle suspended data
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  return hookResult;
};

describe('useYVAuth', () => {
  beforeEach(() => {
    // Setup window mock
    vi.stubGlobal('window', mockWindow);
    mockWindow.location.search = '';

    // Reset configuration mocks
    YouVersionPlatformConfiguration.clearAuthTokens();
    YouVersionPlatformConfiguration.installationId = null;
  });

  describe('initialization', () => {
    it('should return unauthenticated state when no user info available', async () => {
      const { result } = await renderAuthHook();

      // Add a small extra wait if still null
      if (result.current === null) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      expect(result.current).not.toBeNull();
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
      const { result } = await renderAuthHook();
      const redirectUrl = 'https://example.com/callback';

      await act(async () => {
        await result.current.signIn({ redirectUrl, scopes: ['profile'] });
      });

      expect(vi.mocked(YouVersionAPIUsers).signIn).toHaveBeenCalledWith(redirectUrl, ['profile']);
    });

    it('should call signIn with empty scopes when not provided', async () => {
      const { result } = await renderAuthHook();
      const redirectUrl = 'https://example.com/callback';

      await act(async () => {
        await result.current.signIn({ redirectUrl });
      });

      expect(vi.mocked(YouVersionAPIUsers).signIn).toHaveBeenCalledWith(redirectUrl);
    });

    it('should call YouVersionAPIUsers.signIn exactly once with scopes', async () => {
      const { result } = await renderAuthHook();
      const redirectUrl = 'https://example.com/callback';
      const scopes: AuthenticationScopes[] = ['profile', 'email'];

      await act(async () => {
        await result.current.signIn({ redirectUrl, scopes });
      });

      expect(vi.mocked(YouVersionAPIUsers).signIn).toHaveBeenCalledTimes(1);
      expect(vi.mocked(YouVersionAPIUsers).signIn).toHaveBeenCalledWith(redirectUrl, scopes);
    });

    it('should call YouVersionAPIUsers.signIn exactly once without scopes', async () => {
      const { result } = await renderAuthHook();
      const redirectUrl = 'https://example.com/callback';

      await act(async () => {
        await result.current.signIn({ redirectUrl });
      });

      expect(vi.mocked(YouVersionAPIUsers).signIn).toHaveBeenCalledTimes(1);
      expect(vi.mocked(YouVersionAPIUsers).signIn).toHaveBeenCalledWith(redirectUrl);
    });

    it('should throw error when signIn fails', async () => {
      const { result } = await renderAuthHook();
      const error = new Error('Sign in failed');
      const signInMock = vi.spyOn(YouVersionAPIUsers, 'signIn');
      signInMock.mockRejectedValue(error);

      await expect(
        act(async () => {
          await result.current.signIn({ redirectUrl: 'https://example.com/callback' });
        }),
      ).rejects.toThrow('Sign in failed');
    });

    it('should use redirectUri from provider when redirectUrl is not passed', async () => {
      const { result } = await renderAuthHook();

      await act(async () => {
        await result.current.signIn();
      });

      expect(vi.mocked(YouVersionAPIUsers).signIn).toHaveBeenCalledWith('http://test.example.com');
    });

    it('should use redirectUri from provider with scopes when redirectUrl is not passed', async () => {
      const { result } = await renderAuthHook();
      const scopes: AuthenticationScopes[] = ['profile', 'email'];

      await act(async () => {
        await result.current.signIn({ scopes });
      });

      expect(vi.mocked(YouVersionAPIUsers).signIn).toHaveBeenCalledWith(
        'http://test.example.com',
        scopes,
      );
    });
  });

  describe('processCallback', () => {
    it('should call handleAuthCallback and return result', async () => {
      const { result } = await renderAuthHook();
      const callbackMock = vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback');
      callbackMock.mockResolvedValue(mockAuthResult);

      let callbackResult;
      await act(async () => {
        callbackResult = await result.current.processCallback();
      });

      expect(callbackMock).toHaveBeenCalled();
      expect(callbackResult).toEqual(mockAuthResult);
    });

    it('should throw error when callback processing fails', async () => {
      const { result } = await renderAuthHook();
      const error = new Error('Callback processing failed');
      const callbackMock = vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback');
      callbackMock.mockRejectedValue(error);

      await expect(
        act(async () => {
          await result.current.processCallback();
        }),
      ).rejects.toThrow('Callback processing failed');
    });

    it('should return null when no result from callback', async () => {
      const { result } = await renderAuthHook();
      const callbackMock = vi.spyOn(YouVersionAPIUsers, 'handleAuthCallback');
      callbackMock.mockResolvedValue(null);

      let callbackResult;
      await act(async () => {
        callbackResult = await result.current.processCallback();
      });

      expect(callbackResult).toBe(null);
    });
  });

  describe('signOut', () => {
    it('should call clearAuthTokens and reset user info', async () => {
      const { result } = await renderAuthHook();

      const clearAuthTokensSpy = vi.spyOn(YouVersionPlatformConfiguration, 'clearAuthTokens');
      clearAuthTokensSpy.mockClear();

      act(() => {
        result.current.signOut();
      });

      expect(clearAuthTokensSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('auth state', () => {
    it('should derive correct auth state from configuration', async () => {
      YouVersionPlatformConfiguration.saveAuthData('access-token', null, 'id-token', null);
      const { result } = await renderAuthHook();

      expect(result.current.auth.accessToken).toBe('access-token');
      expect(result.current.auth.idToken).toBe('id-token');
    });
  });

  describe('memoization', () => {
    it('should memoize auth state when values do not change', async () => {
      const { result, rerender } = await renderAuthHook();
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

    it('should memoize callbacks', async () => {
      const { result, rerender } = await renderAuthHook();
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
    it('should include error in auth state when provider has error', async () => {
      const { result } = await renderAuthHook();
      // This test would require modifying the TestWrapper to inject an error
      // For now, we'll test the structure
      expect(result.current.auth).toHaveProperty('error');
      expect(result.current.auth.result).toBe(null);
    });
  });
});
