import { describe, expect, it } from 'vitest';
import { SignInWithYouVersionPKCEAuthorizationRequestBuilder } from '../SignInWithYouVersionPKCE';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';
import { cleanupBrowserMocks, setupBrowserMocks } from './mocks/browser';

describe('SignInWithYouVersionPKCEAuthorizationRequestBuilder', () => {
  it('uses cryptographic randomness and SHA-256 for an OAuth authorization request', async () => {
    const mocks = setupBrowserMocks();
    let randomCall = 0;
    mocks.crypto.getRandomValues.mockImplementation((array: Uint8Array) => {
      array.forEach((_, index) => (array[index] = index + randomCall * 32 + 1));
      randomCall++;
      return array;
    });
    mocks.crypto.subtle.digest.mockResolvedValue(new Uint8Array(32).buffer);
    mocks.btoa.mockImplementation((value: string) => Buffer.from(value).toString('base64'));
    YouVersionPlatformConfiguration.apiHost = 'api-test.youversion.com';

    const result = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
      'test-app-key',
      new URL('https://example.com/callback/'),
      ['profile', 'email'],
      ['highlights'],
    );
    const params = result.url.searchParams;

    expect(result.url.origin).toBe('https://api-test.youversion.com');
    expect(result.url.pathname).toBe('/auth/authorize');
    expect(mocks.crypto.getRandomValues.mock.calls.map(([bytes]) => bytes.length)).toEqual([
      32, 24, 24,
    ]);
    expect(mocks.crypto.subtle.digest).toHaveBeenCalledWith(
      'SHA-256',
      new TextEncoder().encode(result.parameters.codeVerifier),
    );
    expect(params.get('response_type')).toBe('code');
    expect(params.get('client_id')).toBe('test-app-key');
    expect(params.get('redirect_uri')).toBe('https://example.com/callback');
    expect(params.get('code_challenge_method')).toBe('S256');
    expect(result.parameters.codeChallenge).toBe(Buffer.alloc(32).toString('base64url'));
    expect(params.get('code_challenge')).toBe(result.parameters.codeChallenge);
    expect(params.get('state')).toBe(result.parameters.state);
    expect(params.get('nonce')).toBe(result.parameters.nonce);
    expect(result.parameters.state).not.toBe(result.parameters.nonce);
    expect(params.get('scope')).toBe('email profile openid');
    expect(params.get('requested_permissions')).toBe('highlights');
    expect(params.getAll('requested_permissions[]')).toEqual([]);
    expect(params.get('scope')).not.toContain('highlights');
    cleanupBrowserMocks();
  });

  it('builds the form-encoded authorization-code exchange contract', async () => {
    setupBrowserMocks();
    YouVersionPlatformConfiguration.apiHost = 'api-test.youversion.com';
    YouVersionPlatformConfiguration.appKey = 'test-app-key';

    const request = SignInWithYouVersionPKCEAuthorizationRequestBuilder.tokenURLRequest(
      'auth-code',
      'verifier',
      'https://example.com/callback',
    );
    const body = new URLSearchParams(await request.text());

    expect(request.url).toBe('https://api-test.youversion.com/auth/token');
    expect(request.method).toBe('POST');
    expect(request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('auth-code');
    expect(body.get('code_verifier')).toBe('verifier');
    expect(body.get('redirect_uri')).toBe('https://example.com/callback');
    expect(body.get('client_id')).toBe('test-app-key');
    cleanupBrowserMocks();
  });
});
