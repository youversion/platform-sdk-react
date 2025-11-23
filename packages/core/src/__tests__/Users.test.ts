import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YouVersionAPIUsers } from '../Users';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';
import { SignInWithYouVersionPermission } from '../SignInWithYouVersionResult';
import { YouVersionUserInfo } from '../YouVersionUserInfo';
import type { SignInWithYouVersionPermissionValues } from '../types/auth';

// Mock global objects
const mockLocation = {
  href: '',
  search: '',
};

const mockHistory = {
  replaceState: vi.fn(),
};

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

const mockFetch = vi.fn();

describe('YouVersionAPIUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup global mocks
    vi.stubGlobal('window', {
      location: mockLocation,
      history: mockHistory,
    });
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('fetch', mockFetch);
    vi.stubGlobal('atob', vi.fn());
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-installation-id'),
      getRandomValues: vi.fn(),
      subtle: {
        digest: vi.fn(),
      },
    });
    vi.stubGlobal('btoa', vi.fn());

    // Reset location
    mockLocation.href = '';
    mockLocation.search = '';

    // Setup YouVersionPlatformConfiguration
    YouVersionPlatformConfiguration.appKey = 'test-app-key';
    YouVersionPlatformConfiguration.apiHost = 'api.youversion.com';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    YouVersionPlatformConfiguration.appKey = null;
  });

  describe('signIn', () => {
    it('should throw error when appKey is not set', async () => {
      YouVersionPlatformConfiguration.appKey = null;

      const permissions = new Set<SignInWithYouVersionPermissionValues>([
        SignInWithYouVersionPermission.bibles,
      ]);

      await expect(
        YouVersionAPIUsers.signIn(permissions, 'https://example.com/callback'),
      ).rejects.toThrow('YouVersionPlatformConfiguration.appKey must be set before calling signIn');
    });

    it('should create authorization request and redirect on successful signIn', async () => {
      // Mock crypto functions for PKCE
      const mockCrypto = vi.mocked(crypto);
      mockCrypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = i;
        }
        return array;
      });
      mockCrypto.subtle.digest.mockResolvedValue(new Uint8Array(32).buffer);
      vi.mocked(btoa).mockReturnValue('mockBase64Value');

      const permissions = new Set<SignInWithYouVersionPermissionValues>([
        SignInWithYouVersionPermission.bibles,
        SignInWithYouVersionPermission.highlights,
      ]);
      const redirectURL = 'https://example.com/callback';

      await YouVersionAPIUsers.signIn(permissions, redirectURL);

      // Verify localStorage items stored
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'youversion-auth-code-verifier',
        expect.any(String),
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'youversion-auth-redirect-uri',
        redirectURL,
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'youversion-auth-state',
        expect.any(String),
      );

      // Verify redirect occurred
      expect(mockLocation.href).toContain('https://api.youversion.com/auth/authorize');
    });
  });

  describe('handleAuthCallback', () => {
    it('should return null when no state or error in URL', async () => {
      mockLocation.search = '';

      const result = await YouVersionAPIUsers.handleAuthCallback();
      expect(result).toBeNull();
    });

    it('should throw error when OAuth error is present', async () => {
      mockLocation.search = '?error=access_denied&error_description=User denied access';

      await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow(
        'OAuth authentication failed: User denied access',
      );
    });

    it('should throw error when OAuth error is present without description', async () => {
      mockLocation.search = '?error=server_error';

      await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow(
        'OAuth authentication failed: server_error',
      );
    });

    it('should throw error when state parameter is invalid', async () => {
      mockLocation.search = '?state=invalid-state&code=auth-code';
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'youversion-auth-state') return 'valid-state';
        return null;
      });

      await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow(
        'Invalid state parameter - possible CSRF attack',
      );
    });

    it('should redirect to server when state exists but no code', async () => {
      mockLocation.href = 'https://example.com/callback?state=test-state';
      mockLocation.search = '?state=test-state';
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'youversion-auth-state') return 'test-state';
        return null;
      });

      // In test environment, the redirect continues execution, so expect the eventual error
      await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow();

      // Verify that the redirect was attempted
      expect(mockLocation.href).toBe('https://api.youversion.com/auth/callback?state=test-state');
    });

    it('should throw error when required parameters are missing', async () => {
      mockLocation.search = '?state=test-state&code=auth-code';
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'youversion-auth-state') return 'test-state';
        return null; // Missing other required parameters
      });

      await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow(
        'Missing required authentication parameters',
      );
    });

    it('should successfully exchange code for tokens', async () => {
      const mockTokens = {
        access_token: 'access-token-123',
        expires_in: 3600,
        id_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJwcm9maWxlX3BpY3R1cmUiOiJodHRwczovL2V4YW1wbGUuY29tL2F2YXRhci5qcGcifQ.invalid-signature',
        refresh_token: 'refresh-token-456',
        scope: 'bibles highlights openid',
        token_type: 'Bearer',
      };

      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: vi.fn().mockResolvedValue(JSON.stringify(mockTokens)),
      };

      mockLocation.search = '?state=test-state&code=auth-code';
      mockLocation.href = 'https://example.com/callback?state=test-state&code=auth-code';

      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'youversion-auth-state':
            return 'test-state';
          case 'youversion-auth-code-verifier':
            return 'code-verifier-123';
          case 'youversion-auth-redirect-uri':
            return 'https://example.com/callback';
          default:
            return null;
        }
      });

      mockFetch.mockResolvedValue(mockResponse);

      // Mock atob for JWT decoding
      vi.mocked(atob).mockReturnValue(
        JSON.stringify({
          sub: '1234567890',
          name: 'John Doe',
          email: 'john@example.com',
          profile_picture: 'https://example.com/avatar.jpg',
        }),
      );

      // Mock YouVersionPlatformConfiguration.saveAuthData
      const saveAuthDataSpy = vi.spyOn(YouVersionPlatformConfiguration, 'saveAuthData');

      const result = await YouVersionAPIUsers.handleAuthCallback();

      expect(result).toBeTruthy();
      expect(result?.accessToken).toBe('access-token-123');
      expect(result?.refreshToken).toBe('refresh-token-456');
      expect(result?.permissions).toEqual(['bibles', 'highlights']);
      expect(result?.yvpUserId).toBe('1234567890');
      expect(result?.name).toBe('John Doe');
      expect(result?.email).toBe('john@example.com');

      // Verify saveAuthData was called
      expect(saveAuthDataSpy).toHaveBeenCalled();

      // Verify cleanup
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('youversion-auth-code-verifier');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('youversion-auth-redirect-uri');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('youversion-auth-state');

      expect(mockHistory.replaceState).toHaveBeenCalledWith({}, '', 'https://example.com/callback');

      saveAuthDataSpy.mockRestore();
    });

    it('should handle token exchange failure', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      };

      mockLocation.search = '?state=test-state&code=auth-code';
      mockLocalStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'youversion-auth-state':
            return 'test-state';
          case 'youversion-auth-code-verifier':
            return 'code-verifier-123';
          case 'youversion-auth-redirect-uri':
            return 'https://example.com/callback';
          default:
            return null;
        }
      });

      mockFetch.mockResolvedValue(mockResponse);

      await expect(YouVersionAPIUsers.handleAuthCallback()).rejects.toThrow(
        'Token exchange failed: 400 Bad Request',
      );

      // Verify cleanup on error
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('youversion-auth-code-verifier');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('youversion-auth-redirect-uri');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('youversion-auth-state');
    });
  });

  describe('obtainLocation', () => {
    it('should redirect to server callback with correct parameters', () => {
      YouVersionPlatformConfiguration.apiHost = 'api-test.youversion.com';

      const callbackURL = 'https://example.com/callback?state=test-state&user=123';
      const state = 'test-state';

      // Access private method
      (YouVersionAPIUsers as any).obtainLocation(callbackURL, state);

      expect(mockLocation.href).toBe(
        'https://api-test.youversion.com/auth/callback?state=test-state&user=123',
      );
    });

    it('should throw error when state parameter is invalid', () => {
      const callbackURL = 'https://example.com/callback?state=invalid-state';
      const state = 'valid-state';

      expect(() => {
        (YouVersionAPIUsers as any).obtainLocation(callbackURL, state);
      }).toThrow('Invalid state parameter');
    });
  });

  describe('extractSignInResult', () => {
    it('should extract sign-in result from tokens', () => {
      const fixedDate = new Date(2025, 2, 11, 12, 0, 0);
      vi.setSystemTime(fixedDate);
      const tokens = {
        access_token: 'access-token-123',
        expires_in: 3600,
        id_token:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJwcm9maWxlX3BpY3R1cmUiOiJodHRwczovL2V4YW1wbGUuY29tL2F2YXRhci5qcGcifQ.invalid',
        refresh_token: 'refresh-token-456',
        scope: 'bibles highlights openid',
        token_type: 'Bearer',
      };

      // Mock JWT decoding
      vi.mocked(atob).mockReturnValue(
        JSON.stringify({
          sub: '1234567890',
          name: 'John Doe',
          email: 'john@example.com',
          profile_picture: 'https://example.com/avatar.jpg',
        }),
      );

      const result = (YouVersionAPIUsers as any).extractSignInResult(tokens);

      expect(result.accessToken).toBe('access-token-123');
      expect(result.expiryDate).toStrictEqual(new Date(fixedDate.getTime() + 60 * 60 * 1000));
      expect(result.refreshToken).toBe('refresh-token-456');
      expect(result.permissions).toEqual(['bibles', 'highlights']);
      expect(result.yvpUserId).toBe('1234567890');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.profilePicture).toBe('https://example.com/avatar.jpg');
    });

    it('should filter out unknown permissions', () => {
      const tokens = {
        access_token: 'token',
        expires_in: 3600,
        id_token:
          'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.e30.Et9HFtf9R3GEMA0IICOfFMVXY7kkTX1wr4qCyhIf58U',
        refresh_token: 'refresh',
        scope: 'bibles unknown_permission highlights invalid_scope',
        token_type: 'Bearer',
      };

      // Mock JWT decoding
      vi.mocked(atob).mockReturnValue(JSON.stringify({ sub: 'user123' }));

      const result = (YouVersionAPIUsers as any).extractSignInResult(tokens);

      expect(result.permissions).toEqual(['bibles', 'highlights']);
    });
  });

  describe('decodeJWT', () => {
    it('should decode valid JWT token', () => {
      const payload = { sub: '123', name: 'John' };
      const base64Payload = btoa(JSON.stringify(payload));
      const token = `header.${base64Payload}.signature`;

      vi.mocked(atob).mockReturnValue(JSON.stringify(payload));

      const result = (YouVersionAPIUsers as any).decodeJWT(token);

      expect(result).toEqual(payload);
    });

    it('should return empty object for invalid token format', () => {
      const result = (YouVersionAPIUsers as any).decodeJWT('invalid.token');

      expect(result).toEqual({});
    });

    it('should handle base64 padding correctly', () => {
      const payload = { sub: '123' };
      const base64Payload = 'eyJzdWIiOiIxMjMifQ'; // Base64 without padding
      const token = `header.${base64Payload}.signature`;

      vi.mocked(atob).mockReturnValue(JSON.stringify(payload));

      const result = (YouVersionAPIUsers as any).decodeJWT(token);

      expect(result).toEqual(payload);
    });

    it('should return empty object when atob throws', () => {
      const token = 'header.invalid-base64.signature';
      vi.mocked(atob).mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      const result = (YouVersionAPIUsers as any).decodeJWT(token);

      expect(result).toEqual({});
    });

    it('should return empty object when JSON.parse throws', () => {
      const token = 'header.dmFsaWRiYXNlNjQ.signature';
      vi.mocked(atob).mockReturnValue('invalid json');

      const result = (YouVersionAPIUsers as any).decodeJWT(token);

      expect(result).toEqual({});
    });
  });

  describe('signOut', () => {
    it('should call setAccessToken with null', () => {
      const setAccessTokenSpy = vi.spyOn(YouVersionPlatformConfiguration, 'clearAuthTokens');

      YouVersionAPIUsers.signOut();

      expect(setAccessTokenSpy).toHaveBeenCalled();

      setAccessTokenSpy.mockRestore();
    });
  });

  describe('userInfo', () => {
    it('should throw error for invalid access token', () => {
      expect(() => YouVersionAPIUsers.userInfo('')).toThrow(
        'Invalid access token: must be a non-empty string',
      );

      expect(() => YouVersionAPIUsers.userInfo(null as any)).toThrow(
        'Invalid access token: must be a non-empty string',
      );
    });

    it('should decode user info from valid JWT token', () => {
      const claims = {
        sub: 'user123',
        given_name: 'John',
        family_name: 'Doe',
        profile_picture: 'https://example.com/avatar.jpg',
      };

      vi.mocked(atob).mockReturnValue(JSON.stringify(claims));

      const result = YouVersionAPIUsers.userInfo('valid.jwt.token');

      expect(result).toBeInstanceOf(YouVersionUserInfo);
      expect(result.userId).toBe('user123');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
      expect(result.avatarUrl).toStrictEqual(new URL('https://example.com/avatar.jpg'));
    });

    it('should throw error for empty JWT claims', () => {
      vi.mocked(atob).mockReturnValue('{}');

      expect(() => YouVersionAPIUsers.userInfo('valid.jwt.token')).toThrow(
        'Invalid JWT token: Unable to decode token payload',
      );
    });

    it('should throw error when JWT decoding fails', () => {
      vi.mocked(atob).mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      expect(() => YouVersionAPIUsers.userInfo('invalid.jwt.token')).toThrow(
        'Invalid JWT token: Unable to decode token payload',
      );
    });
  });
});
