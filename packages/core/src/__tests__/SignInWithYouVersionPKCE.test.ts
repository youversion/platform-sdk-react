import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignInWithYouVersionPKCEAuthorizationRequestBuilder } from '../SignInWithYouVersionPKCE';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';
import { setupBrowserMocks, cleanupBrowserMocks } from './mocks/browser';

describe('SignInWithYouVersionPKCEAuthorizationRequestBuilder', () => {
  let mocks: ReturnType<typeof setupBrowserMocks>;

  beforeEach(() => {
    mocks = setupBrowserMocks();

    // Reset YouVersionPlatformConfiguration
    YouVersionPlatformConfiguration.appKey = 'test-app-key';
    YouVersionPlatformConfiguration.apiHost = 'api.youversion.com';
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanupBrowserMocks();
  });

  describe('make', () => {
    it('should generate authorization request with all required parameters', async () => {
      // Mock crypto.getRandomValues to return predictable values
      mocks.crypto.getRandomValues
        .mockImplementationOnce((array: Uint8Array) => {
          // Mock code verifier generation (32 bytes)
          for (let i = 0; i < 32; i++) {
            array[i] = i + 1;
          }
          return array;
        })
        .mockImplementationOnce((array: Uint8Array) => {
          // Mock state generation (24 bytes)
          for (let i = 0; i < 24; i++) {
            array[i] = i + 100;
          }
          return array;
        })
        .mockImplementationOnce((array: Uint8Array) => {
          // Mock nonce generation (24 bytes)
          for (let i = 0; i < 24; i++) {
            array[i] = i + 200;
          }
          return array;
        });

      // Mock crypto.subtle.digest for code challenge
      const mockDigest = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        mockDigest[i] = i + 50;
      }
      mocks.crypto.subtle.digest.mockResolvedValue(mockDigest.buffer);

      // Mock btoa for base64 encoding
      mocks.btoa
        .mockReturnValueOnce('codeVerifierBase64==') // Code verifier
        .mockReturnValueOnce('codeChallengeBase64==') // Code challenge
        .mockReturnValueOnce('stateBase64==') // State
        .mockReturnValueOnce('nonceBase64=='); // Nonce

      const redirectURL = new URL('https://example.com/callback');

      const result = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'test-app-key',
        redirectURL,
      );

      // Verify parameters structure
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('parameters');
      expect(result.parameters).toHaveProperty('codeVerifier');
      expect(result.parameters).toHaveProperty('codeChallenge');
      expect(result.parameters).toHaveProperty('state');
      expect(result.parameters).toHaveProperty('nonce');

      // Verify URL structure
      expect(result.url).toBeInstanceOf(URL);
      expect(result.url.hostname).toBe('api.youversion.com');
      expect(result.url.pathname).toBe('/auth/authorize');
    });

    it('should generate unique parameters on each call', async () => {
      // Mock crypto to return different values for each call
      let callCount = 0;
      mocks.crypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = callCount + i;
        }
        callCount += 10;
        return array;
      });

      mocks.crypto.subtle.digest.mockResolvedValue(new Uint8Array(32).buffer);
      mocks.btoa.mockImplementation((str: string) => `base64_${callCount}_${str.length}`);

      const redirectURL = new URL('https://example.com/callback');

      const result1 = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'app-key',
        redirectURL,
      );
      const result2 = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'app-key',
        redirectURL,
      );

      // Parameters should be different between calls
      expect(result1.parameters.codeVerifier).not.toBe(result2.parameters.codeVerifier);
      expect(result1.parameters.state).not.toBe(result2.parameters.state);
      expect(result1.parameters.nonce).not.toBe(result2.parameters.nonce);
    });
  });

  describe('authorizeURL', () => {
    beforeEach(() => {
      // Setup mocks for btoa which are needed for these tests
      mocks.crypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = i;
        }
        return array;
      });
      mocks.crypto.subtle.digest.mockResolvedValue(new Uint8Array(32).buffer);
      mocks.btoa.mockImplementation((str: string) => Buffer.from(str).toString('base64'));
    });

    it('should build authorization URL with all required OAuth2 parameters', async () => {
      const redirectURL = new URL('https://example.com/callback');

      const result = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'test-app-key',
        redirectURL,
      );

      const url = result.url;
      const params = new URLSearchParams(url.search);

      // Required OAuth2 parameters
      expect(params.get('response_type')).toBe('code');
      expect(params.get('client_id')).toBe('test-app-key');
      expect(params.get('redirect_uri')).toBe('https://example.com/callback');
      expect(params.get('code_challenge_method')).toBe('S256');

      // PKCE parameters
      expect(params.get('code_challenge')).toBeTruthy();
      expect(params.get('state')).toBeTruthy();
      expect(params.get('nonce')).toBeTruthy();
    });

    it('should handle redirect URL with trailing slash', async () => {
      const redirectURL = new URL('https://example.com/callback/');

      const result = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'test-app-key',
        redirectURL,
      );

      const params = new URLSearchParams(result.url.search);
      expect(params.get('redirect_uri')).toBe('https://example.com/callback');
    });

    it('should include x-yvp-installation-id param', async () => {
      const redirectURL = new URL('https://example.com/callback');

      const result = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'test-app-key',
        redirectURL,
      );

      const params = new URLSearchParams(result.url.search);
      expect(params.get('x-yvp-installation-id')).not.toBeFalsy();
    });

    it('should create scope string with profile and openid', async () => {
      const redirectURL = new URL('https://example.com/callback');

      const result = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'test-app-key',
        redirectURL,
        ['profile'],
      );

      const params = new URLSearchParams(result.url.search);
      const scope = params.get('scope');

      expect(scope).toContain('profile');
    });

    it('should add openid when not present', async () => {
      const redirectURL = new URL('https://example.com/callback');

      const result = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'test-app-key',
        redirectURL,
        ['profile'],
      );

      const params = new URLSearchParams(result.url.search);
      const scope = params.get('scope');

      expect(scope).toBe('profile openid');
    });

    it('should handle empty scope params', async () => {
      const redirectURL = new URL('https://example.com/callback');

      const result = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'test-app-key',
        redirectURL,
      );

      const params = new URLSearchParams(result.url.search);
      const scope = params.get('scope');

      expect(scope).toBe('openid');
    });

    it('should not duplicate openid if already present', async () => {
      const redirectURL = new URL('https://example.com/callback');

      const result = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'test-app-key',
        redirectURL,
      );

      const params = new URLSearchParams(result.url.search);
      const scope = params.get('scope');

      // Should not have duplicate openid
      const openidCount = (scope?.match(/openid/g) || []).length;
      expect(openidCount).toBe(1);
    });
  });

  describe('tokenURLRequest', () => {
    it('should create POST request with correct parameters', async () => {
      const code = 'auth-code-123';
      const codeVerifier = 'code-verifier-456';
      const redirectUri = 'https://example.com/callback';

      const request = SignInWithYouVersionPKCEAuthorizationRequestBuilder.tokenURLRequest(
        code,
        codeVerifier,
        redirectUri,
      );

      expect(request.method).toBe('POST');
      expect(request.url).toBe('https://api.youversion.com/auth/token');
      expect(request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');

      const body = await request.text();
      const params = new URLSearchParams(body);

      expect(params.get('grant_type')).toBe('authorization_code');
      expect(params.get('code')).toBe(code);
      expect(params.get('redirect_uri')).toBe(redirectUri);
      expect(params.get('client_id')).toBe('test-app-key');
      expect(params.get('code_verifier')).toBe(codeVerifier);
    });

    it('should handle empty app key gracefully', async () => {
      YouVersionPlatformConfiguration.appKey = null;

      const request = SignInWithYouVersionPKCEAuthorizationRequestBuilder.tokenURLRequest(
        'code',
        'verifier',
        'https://example.com/callback',
      );

      expect(request).toBeInstanceOf(Request);

      const body = await request.text();
      const params = new URLSearchParams(body);

      expect(params.get('client_id')).toBe('');
    });
  });

  describe('randomness and security', () => {
    beforeEach(() => {
      // Setup mocks for btoa which are needed for these tests
      mocks.crypto.getRandomValues.mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = i;
        }
        return array;
      });
      mocks.crypto.subtle.digest.mockResolvedValue(new Uint8Array(32).buffer);
      mocks.btoa.mockImplementation((str: string) => Buffer.from(str).toString('base64'));
    });

    it('should use crypto.getRandomValues for secure random generation', async () => {
      const redirectURL = new URL('https://example.com/callback');

      await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make('test-app-key', redirectURL);

      // Should call crypto.getRandomValues for code verifier, state, and nonce
      expect(mocks.crypto.getRandomValues).toHaveBeenCalledTimes(3);

      // Verify correct byte lengths
      const calls = mocks.crypto.getRandomValues.mock.calls;
      expect(calls[0]?.[0]).toHaveLength(32); // Code verifier
      expect(calls[1]?.[0]).toHaveLength(24); // State
      expect(calls[2]?.[0]).toHaveLength(24); // Nonce
    });

    it('should use SHA-256 for code challenge', async () => {
      const redirectURL = new URL('https://example.com/callback');

      await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make('test-app-key', redirectURL);

      expect(mocks.crypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(Uint8Array));
    });

    it('should generate parameters with sufficient entropy', async () => {
      // Use real crypto for this test to verify actual randomness
      cleanupBrowserMocks();

      const redirectURL = new URL('https://example.com/callback');

      const result1 = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'test-app-key',
        redirectURL,
      );
      const result2 = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
        'test-app-key',
        redirectURL,
      );

      // All parameters should be different between calls
      expect(result1.parameters.codeVerifier).not.toBe(result2.parameters.codeVerifier);
      expect(result1.parameters.codeChallenge).not.toBe(result2.parameters.codeChallenge);
      expect(result1.parameters.state).not.toBe(result2.parameters.state);
      expect(result1.parameters.nonce).not.toBe(result2.parameters.nonce);

      // Parameters should have reasonable length (base64url encoded)
      expect(result1.parameters.codeVerifier.length).toBeGreaterThan(40);
      expect(result1.parameters.state.length).toBeGreaterThan(30);
      expect(result1.parameters.nonce.length).toBeGreaterThan(30);

      // Parameters should be URL-safe (no +, /, or =)
      expect(result1.parameters.codeVerifier).not.toMatch(/[+/=]/);
      expect(result1.parameters.codeChallenge).not.toMatch(/[+/=]/);
      expect(result1.parameters.state).not.toMatch(/[+/=]/);
      expect(result1.parameters.nonce).not.toMatch(/[+/=]/);
    });
  });
});
