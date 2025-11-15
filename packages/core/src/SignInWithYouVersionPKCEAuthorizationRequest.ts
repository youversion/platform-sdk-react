import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import type { SignInWithYouVersionPermissionValues } from './types';

export interface SignInWithYouVersionPKCEParameters {
  codeVerifier: string;
  codeChallenge: string;
  state: string;
  nonce: string;
}

export interface SignInWithYouVersionPKCEAuthorizationRequest {
  url: URL;
  parameters: SignInWithYouVersionPKCEParameters;
}

export class SignInWithYouVersionPKCEAuthorizationRequestBuilder {
  private static readonly STORAGE_KEYS = {
    STATE: 'yv_pkce_state',
    CODE_VERIFIER: 'yv_pkce_code_verifier',
    NONCE: 'yv_pkce_nonce',
    REDIRECT_URI: 'yv_pkce_redirect_uri',
  };

  static async make(
    appKey: string,
    permissions: Set<SignInWithYouVersionPermissionValues>,
    redirectURL: URL,
  ): Promise<SignInWithYouVersionPKCEAuthorizationRequest> {
    const codeVerifier = await this.randomURLSafeString(32);
    const codeChallenge = await this.codeChallenge(codeVerifier);
    const state = await this.randomURLSafeString(24);
    const nonce = await this.randomURLSafeString(24);

    const parameters: SignInWithYouVersionPKCEParameters = {
      codeVerifier,
      codeChallenge,
      state,
      nonce,
    };

    // Persist PKCE parameters to sessionStorage for post-redirect retrieval
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(this.STORAGE_KEYS.STATE, state);
      sessionStorage.setItem(this.STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
      sessionStorage.setItem(this.STORAGE_KEYS.NONCE, nonce);
      sessionStorage.setItem(this.STORAGE_KEYS.REDIRECT_URI, redirectURL.toString());
      console.log('[PKCE] Saved params:', {
        state: state.substring(0, 10) + '...',
        codeVerifier: codeVerifier.substring(0, 10) + '...',
        challenge: codeChallenge.substring(0, 10) + '...',
        redirectUri: redirectURL.toString(),
      });
    }

    const url = this.authorizeURL(appKey, permissions, redirectURL, parameters);

    return { url, parameters };
  }

  static restore(): {
    state: string;
    codeVerifier: string;
    nonce: string;
    redirectUri: string;
  } | null {
    if (typeof sessionStorage === 'undefined') {
      console.log('[PKCE] sessionStorage not available');
      return null;
    }

    const state = sessionStorage.getItem(this.STORAGE_KEYS.STATE);
    const codeVerifier = sessionStorage.getItem(this.STORAGE_KEYS.CODE_VERIFIER);
    const nonce = sessionStorage.getItem(this.STORAGE_KEYS.NONCE);
    const redirectUri = sessionStorage.getItem(this.STORAGE_KEYS.REDIRECT_URI);

    console.log('[PKCE] Restoring params:', {
      state: state ? 'found' : 'missing',
      codeVerifier: codeVerifier ? 'found' : 'missing',
      nonce: nonce ? 'found' : 'missing',
      redirectUri: redirectUri ? redirectUri : 'missing',
      keys: this.STORAGE_KEYS,
    });

    if (!state || !codeVerifier || !nonce || !redirectUri) {
      console.error('[PKCE] Missing PKCE parameters in sessionStorage');
      return null;
    }

    return { state, codeVerifier, nonce, redirectUri };
  }

  static clearStored(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(this.STORAGE_KEYS.STATE);
      sessionStorage.removeItem(this.STORAGE_KEYS.CODE_VERIFIER);
      sessionStorage.removeItem(this.STORAGE_KEYS.NONCE);
      sessionStorage.removeItem(this.STORAGE_KEYS.REDIRECT_URI);
    }
  }

  static randomURLSafeString(byteCount: number): Promise<string> {
    const array = new Uint8Array(byteCount);
    crypto.getRandomValues(array);
    return Promise.resolve(this.base64URLEncode(array.buffer));
  }

  static async codeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(hash);
  }

  static base64URLEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const binary = String.fromCharCode(...bytes);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private static authorizeURL(
    appKey: string,
    permissions: Set<SignInWithYouVersionPermissionValues>,
    redirectURL: URL,
    parameters: SignInWithYouVersionPKCEParameters,
  ): URL {
    const url = new URL(`https://${YouVersionPlatformConfiguration.apiHost}/auth/authorize`);

    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', appKey);
    url.searchParams.set('redirect_uri', redirectURL.toString());
    url.searchParams.set('nonce', parameters.nonce);
    url.searchParams.set('state', parameters.state);
    url.searchParams.set('code_challenge', parameters.codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');

    const installationId = YouVersionPlatformConfiguration.installationId;
    if (installationId) {
      url.searchParams.set('x-yvp-installation-id', installationId);
    }

    const scope = this.scopeValue(permissions);
    if (scope) {
      url.searchParams.set('scope', scope);
    }

    return url;
  }

  static tokenURLRequest(code: string, codeVerifier: string, redirectUri: string): Request {
    const url = new URL(`https://${YouVersionPlatformConfiguration.apiHost}/auth/token`);

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: YouVersionPlatformConfiguration.appId || '',
      code_verifier: codeVerifier,
    });

    return new Request(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  }

  private static scopeValue(permissions: Set<SignInWithYouVersionPermissionValues>): string {
    const permissionArray = Array.from(permissions).sort();
    let scopeWithOpenID = permissionArray.join(' ');

    if (!scopeWithOpenID.split(' ').includes('openid')) {
      scopeWithOpenID += (scopeWithOpenID.length > 0 ? ' ' : '') + 'openid';
    }

    return scopeWithOpenID;
  }
}
