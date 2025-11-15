/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiClient } from '../client';
import { AuthClient } from '../authentication';
import { WebAuthenticationStrategy } from '../WebAuthenticationStrategy';

describe('AuthClient', () => {
  let apiClient: ApiClient;
  let authClient: AuthClient;

  beforeEach(() => {
    global.fetch = vi.fn();
    apiClient = new ApiClient({
      baseUrl: 'https://api-dev.youversion.com',
      appKey: 'test-app-key',
      version: 'v1',
    });
    authClient = new AuthClient(apiClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUser', () => {
    it('should fetch user information', async () => {
      const mockUser = {
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
        avatar_url: 'https://example.com/avatar.jpg',
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser),
        headers: {
          get: vi.fn((name: string) => (name === 'content-type' ? 'application/json' : null)),
        },
      } as Response);

      const user = await authClient.getUser('test-token');

      expect(user).toEqual(mockUser);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.any(Object),
      );
    });
  });
});

describe('WebAuthenticationStrategy', () => {
  let strategy: WebAuthenticationStrategy;
  const oldWindowLocation = window.location;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    delete (window as any).location;
    window.location = {
      ...oldWindowLocation,
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
      pathname: '/',
      assign: vi.fn(),
      replace: vi.fn(),
    } as Location;

    const sessionStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();

    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });

    window.history.replaceState = vi.fn();

    strategy = new WebAuthenticationStrategy({
      callbackPath: '/auth/callback',
      timeout: 5000,
    });
  });

  afterEach(() => {
    window.location = oldWindowLocation;
    WebAuthenticationStrategy.cleanup();
    vi.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should redirect to auth URL', () => {
      const authUrl = new URL('https://auth.youversion.com/authorize');

      void strategy.authenticate(authUrl);

      expect(window.location.href).toContain('auth.youversion.com');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'youversion-auth-return',
        'http://localhost:3000',
      );
    });
  });

  describe('handleCallback', () => {
    it('should handle callback and return true', () => {
      window.location.pathname = '/auth/callback';
      window.location.href = 'http://localhost:3000/auth/callback?status=success';
      // Add searchParams to mock location object for testing
      Object.defineProperty(window.location, 'searchParams', {
        value: new URLSearchParams('status=success'),
        writable: true,
        configurable: true,
      });

      const result = WebAuthenticationStrategy.handleCallback('/auth/callback');

      expect(result).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        'youversion-auth-callback',
        expect.stringContaining('status=success'),
      );
    });

    it('should return false for non-callback URLs', () => {
      window.location.pathname = '/';
      Object.defineProperty(window.location, 'searchParams', {
        value: new URLSearchParams(''),
        writable: true,
        configurable: true,
      });

      const result = WebAuthenticationStrategy.handleCallback('/auth/callback');

      expect(result).toBe(false);
    });
  });

  describe('getStoredCallback', () => {
    it('should retrieve and remove stored callback', () => {
      const callbackUrl = 'http://localhost:3000/auth/callback?status=success';
      sessionStorage.setItem('youversion-auth-callback', callbackUrl);

      const result = WebAuthenticationStrategy.getStoredCallback();

      expect(result?.toString()).toBe(callbackUrl);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('youversion-auth-callback');
    });

    it('should return null if no stored callback', () => {
      const result = WebAuthenticationStrategy.getStoredCallback();

      expect(result).toBeNull();
    });
  });
});
