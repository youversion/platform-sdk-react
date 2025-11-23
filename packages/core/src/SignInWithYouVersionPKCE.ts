import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import type { SignInWithYouVersionPermissionValues } from './types/auth';

type SignInWithYouVersionPKCEParameters = {
  readonly codeVerifier: string;
  readonly codeChallenge: string;
  readonly state: string;
  readonly nonce: string;
};
type SignInWithYouVersionPKCEAuthorizationRequest = {
  readonly url: URL;
  readonly parameters: SignInWithYouVersionPKCEParameters;
};

export class SignInWithYouVersionPKCEAuthorizationRequestBuilder {
  public static async make(
    appKey: string,
    permissions: Set<SignInWithYouVersionPermissionValues>,
    redirectURL: URL,
  ): Promise<SignInWithYouVersionPKCEAuthorizationRequest> {
    const codeVerifier = this.randomURLSafeString(32);
    const codeChallenge = await this.codeChallenge(codeVerifier);
    const state = this.randomURLSafeString(24);
    const nonce = this.randomURLSafeString(24);

    const parameters: SignInWithYouVersionPKCEParameters = {
      codeVerifier,
      codeChallenge,
      state,
      nonce,
    };

    const url = this.authorizeURL(appKey, permissions, redirectURL, parameters);

    return { url, parameters };
  }

  private static authorizeURL(
    appKey: string,
    permissions: Set<SignInWithYouVersionPermissionValues>,
    redirectURL: URL,
    parameters: SignInWithYouVersionPKCEParameters,
  ): URL {
    const components = new URL(`https://${YouVersionPlatformConfiguration.apiHost}/auth/authorize`);

    const redirectUrlString = redirectURL.toString().endsWith('/')
      ? redirectURL.toString().slice(0, -1)
      : redirectURL.toString();
    const queryParams = new URLSearchParams({
      response_type: 'code',
      client_id: appKey,
      redirect_uri: redirectUrlString,
      nonce: parameters.nonce,
      state: parameters.state,
      code_challenge: parameters.codeChallenge,
      code_challenge_method: 'S256',
    });

    const installId = YouVersionPlatformConfiguration.installationId;
    if (installId) {
      queryParams.set('x-yvp-installation-id', installId);
    }

    const scopeValue = this.scopeValue(permissions);
    if (scopeValue) {
      queryParams.set('scope', scopeValue);
    }

    components.search = queryParams.toString();
    return components;
  }

  public static tokenURLRequest(code: string, codeVerifier: string, redirectUri: string): Request {
    const url = new URL(`https://${YouVersionPlatformConfiguration.apiHost}/auth/token`);

    const parameters = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: YouVersionPlatformConfiguration.appKey ?? '',
      code_verifier: codeVerifier,
    });

    return new Request(url, {
      method: 'POST',
      body: parameters,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  private static randomURLSafeString(byteCount: number): string {
    const bytes = new Uint8Array(byteCount);
    crypto.getRandomValues(bytes);
    return this.base64URLEncodedString(bytes);
  }

  private static async codeChallenge(verifier: string): Promise<string> {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncodedString(new Uint8Array(digest));
  }

  private static base64URLEncodedString(data: Uint8Array): string {
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(data)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  private static scopeValue(permissions: Set<SignInWithYouVersionPermissionValues>): string | null {
    const scopeArray = Array.from(permissions).sort();
    let scopeWithOpenID = scopeArray.join(' ');

    if (!scopeWithOpenID.split(' ').includes('openid')) {
      scopeWithOpenID += (scopeWithOpenID === '' ? '' : ' ') + 'openid';
    }

    return scopeWithOpenID || null;
  }
}
