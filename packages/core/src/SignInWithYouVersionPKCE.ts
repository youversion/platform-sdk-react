import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import type { AuthenticationScopes, SignInWithYouVersionPermissionValues } from './types';

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
    redirectURL: URL,
    scopes?: AuthenticationScopes[],
    permissions?: SignInWithYouVersionPermissionValues[],
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

    const url = this.authorizeURL(appKey, redirectURL, parameters, scopes, permissions);

    return { url, parameters };
  }

  private static authorizeURL(
    appKey: string,
    redirectURL: URL,
    parameters: SignInWithYouVersionPKCEParameters,
    scopes?: AuthenticationScopes[],
    permissions?: SignInWithYouVersionPermissionValues[],
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

    const scopeValue = this.scopeValue(scopes || []);
    if (scopeValue) {
      queryParams.set('scope', scopeValue);
    }

    // YouVersion data-exchange permissions (e.g. `highlights`) are intentionally
    // NOT OIDC scopes. They ride alongside `scope` as a single comma-joined
    // `requested_permissions` query param (Swift/Kotlin wire format) and are
    // authorized via a separate per-app ACL rather than the token's scope claim.
    const permissionsValue = [...(permissions ?? [])].sort().join(',');
    if (permissionsValue) {
      queryParams.set('requested_permissions', permissionsValue);
    }

    components.search = queryParams.toString();
    return components;
  }

  public static tokenURLRequest(code: string, codeVerifier: string, redirectUri: string): Request {
    const apiHost = YouVersionPlatformConfiguration.apiHost;
    const appKey = YouVersionPlatformConfiguration.appKey;
    const url = new URL(`https://${apiHost}/auth/token`);

    const parameters = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: appKey ?? '',
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

  private static scopeValue(scopes: AuthenticationScopes[]): string | null {
    const scopeArray = Array.from(scopes).sort();
    let scopeWithOpenID = scopeArray.join(' ');

    if (!scopeWithOpenID.split(' ').includes('openid')) {
      scopeWithOpenID += (scopeWithOpenID === '' ? '' : ' ') + 'openid';
    }

    return scopeWithOpenID || null;
  }
}
