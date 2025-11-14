import type { AuthenticationStrategy } from './AuthenticationStrategy';
import { SessionStorageStrategy, type StorageStrategy } from './StorageStrategy';
import { SignInWithYouVersionPKCEAuthorizationRequestBuilder } from './SignInWithYouVersionPKCE';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import { SignInWithYouVersionResult } from './SignInWithYouVersionResult';
import type { SignInWithYouVersionPermissionValues } from './types';
import { SignInWithYouVersionPermission } from './SignInWithYouVersionResult';

type TokenResponse = {
  access_token: string;
  expires_in: string;
  id_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
};

/* Web-based authentication strategy
 * Uses redirect flow
 */
export class WebAuthenticationStrategy implements AuthenticationStrategy {
  private redirectUri: string;
  private callbackPath: string;
  private timeout: number;
  private storage: StorageStrategy;
  private static pendingAuthResolve: ((url: URL) => void) | null = null;
  private static pendingAuthReject: ((error: Error) => void) | null = null;
  private static timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(options?: {
    redirectUri?: string;
    callbackPath?: string;
    timeout?: number;
    storage?: StorageStrategy;
  }) {
    this.callbackPath = options?.callbackPath ?? '/auth/callback';
    this.redirectUri = options?.redirectUri ?? window.location.origin + this.callbackPath;
    this.timeout = options?.timeout ?? 300000; // 5 minutes default
    this.storage = options?.storage ?? new SessionStorageStrategy();
  }

  async authenticate(authUrl: URL): Promise<URL> {
    // Update the redirect URI in the auth URL
    authUrl.searchParams.set('redirect_uri', this.redirectUri);

    return this.authenticateWithRedirect(authUrl);
  }

  /**
   * Call this method when your app loads to handle the redirect callback
   */
  static async handleCallback(callbackPath: string = '/auth/callback'): Promise<boolean> {
    const currentUrl = new URL(window.location.href);
    console.log({ currentUrl });

    // Check if this is a callback URL
    if (currentUrl.searchParams.has('state')) {
      // For web apps, use the HTTP URL directly (no need to convert to youversionauth scheme)
      const callbackUrl = new URL(currentUrl.toString());
      console.log('In handleCallback');

      // Check if we're in a popup window
      if (window.opener && window.opener !== window) {
        // Send message to parent window
        window.opener.postMessage(
          {
            type: 'youversion-auth-callback',
            url: callbackUrl.toString(),
          },
          window.location.origin,
        );
        window.close();
        return true;
      }

      if (WebAuthenticationStrategy.pendingAuthResolve) {
        WebAuthenticationStrategy.pendingAuthResolve(callbackUrl);
        WebAuthenticationStrategy.cleanup();
      } else {
        // Process tokens automatically
        try {
          const state = callbackUrl.searchParams.get('state');
          const code = callbackUrl.searchParams.get('code');
          let location = null;
          console.log('In handleCallback', { state });
          if (state) {
            console.log('In state');
            if (!location && !code) {
              location = await this.obtainLocation(callbackUrl.toString(), state);
            }
            console.log('location', { location });
            if (!code && location) {
              const code = this.obtainCode(location);

              console.log('code', { code });
            }

            // We need the codeVerifier from storage
            // const storageStrategy = new SessionStorageStrategy();
            // const codeVerifier = storageStrategy.getItem('youversion-auth-code-verifier');
            let codeVerifier = sessionStorage.getItem('youversion-auth-code-verifier');
            console.log('in WebAuthenticationStategy', { codeVerifier });

            if (codeVerifier && code) {
              const tokens = await this.obtainTokens(code, codeVerifier);
              console.log({ tokens });
              const result = this.extractSignInWithYouVersionResult(tokens);
              console.log({ result });

              YouVersionPlatformConfiguration.saveAuthData(
                result.accessToken || null,
                result.refreshToken || null,
                result.expiryDate || null,
              );
              codeVerifier = null;

              sessionStorage.removeItem('youversion-auth-code-verifier');
              console.log(YouVersionPlatformConfiguration.saveAuthData);
            }
          }
        } catch (error) {
          console.error('Failed to process OAuth tokens:', error);
        }

        // Store the callback URL for later retrieval as fallback
        const storageStrategy = new SessionStorageStrategy();
        storageStrategy.setItem('youversion-auth-callback', callbackUrl.toString());
      }

      const storageStrategy = new SessionStorageStrategy();
      const returnUrl = storageStrategy.getItem('youversion-auth-return') ?? '/';
      storageStrategy.removeItem('youversion-auth-return');
      window.history.replaceState({}, '', returnUrl);

      return true;
    }

    return false;
  }

  /**
   * Clean up pending authentication state
   */
  static cleanup(): void {
    if (WebAuthenticationStrategy.timeoutId) {
      clearTimeout(WebAuthenticationStrategy.timeoutId);
      WebAuthenticationStrategy.timeoutId = null;
    }
    WebAuthenticationStrategy.pendingAuthResolve = null;
    WebAuthenticationStrategy.pendingAuthReject = null;
  }

  /**
   * Retrieve stored callback result if available
   */
  static getStoredCallback(): URL | null {
    const storageStrategy = new SessionStorageStrategy();
    const stored = storageStrategy.getItem('youversion-auth-callback');
    if (stored) {
      storageStrategy.removeItem('youversion-auth-callback');
      try {
        return new URL(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  private static async obtainLocation(callbackURL: string, state: string): Promise<string> {
    const url = new URL(callbackURL);
    const params = new URLSearchParams(url.search);

    console.log(params.get('state'));
    if (params.get('state') !== state) {
      throw new Error('Invalid state parameter');
    }

    const newUrl = new URL('https://api-staging.youversion.com/auth/callback');
    params.forEach((value, key) => {
      newUrl.searchParams.set(key, value);
    });

    console.log({ newUrl });
    // const response = await fetch(newUrl.toString(), {
    //   method: 'GET',
    // });
    window.location.href = newUrl.toString();
    console.log('in obtainLocation, after fetch');

    // if (response.status !== 302) {
    //   throw new Error('Bad server response');
    // }
    //
    // const location = response.headers.get('Location');
    // if (!location) {
    //   throw new Error('Bad server response');
    // }
    //
    return window.location.href;
  }

  private static obtainCode(location: string): string {
    const locationUrl = new URL(location);
    const params = new URLSearchParams(locationUrl.search);
    const code = params.get('code');

    if (!code) {
      throw new Error('Bad server response');
    }

    return code;
  }

  private static async obtainTokens(code: string, codeVerifier: string): Promise<TokenResponse> {
    console.log('in obtainTokens');
    const request = SignInWithYouVersionPKCEAuthorizationRequestBuilder.tokenURLRequest(
      code,
      codeVerifier,
      'youversionauth://callback',
    );

    console.log('before fetch in obtainTokens', request.body);
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      duplex: 'half',
    });
    console.log('after fetch in obtainTokens');

    if (response.status !== 200) {
      console.log('obtainToken got status:', response.status);
      throw new Error('Bad server response');
    }

    return (await response.json()) as TokenResponse;
  }

  private static extractSignInWithYouVersionResult(
    tokens: TokenResponse,
  ): SignInWithYouVersionResult {
    const idClaims = this.decodeJWT(tokens.id_token);
    const permissions = tokens.scope
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .filter((p): p is SignInWithYouVersionPermissionValues =>
        Object.values(SignInWithYouVersionPermission).includes(
          p as SignInWithYouVersionPermissionValues,
        ),
      );

    return new SignInWithYouVersionResult({
      accessToken: tokens.access_token,
      expiresIn: parseInt(tokens.expires_in, 10),
      refreshToken: tokens.refresh_token,
      permissions,
      yvpUserId: idClaims.sub as string,
      name: idClaims.name as string,
      profilePicture: idClaims.profile_picture as string,
      email: idClaims.email as string,
    });
  }

  private static decodeJWT(token: string): Record<string, any> {
    const segments = token.split('.');
    if (segments.length !== 3) {
      return {};
    }

    let base64 = segments[1]?.replace(/-/g, '+').replace(/_/g, '/');

    while (base64 && base64.length % 4 !== 0) {
      base64 += '=';
    }

    try {
      if (base64) {
        const data = atob(base64);
        return JSON.parse(data);
      } else {
        return {};
      }
    } catch {
      return {};
    }
  }

  private authenticateWithRedirect(authUrl: URL): Promise<URL> {
    // Clean up any existing state
    WebAuthenticationStrategy.cleanup();

    // Store return URL in configured storage
    this.storage.setItem('youversion-auth-return', window.location.href);

    // Set up the promise that will be resolved when we come back
    return new Promise((resolve, reject) => {
      WebAuthenticationStrategy.pendingAuthResolve = resolve;
      WebAuthenticationStrategy.pendingAuthReject = reject;

      // Set up timeout
      WebAuthenticationStrategy.timeoutId = setTimeout(() => {
        WebAuthenticationStrategy.cleanup();
        reject(new Error('Authentication timeout'));
      }, this.timeout);

      // Handle cases where navigation might fail
      try {
        // Redirect to auth URL (standard OAuth flow)
        window.location.href = authUrl.toString();
      } catch (error) {
        WebAuthenticationStrategy.cleanup();
        reject(
          new Error(
            `Failed to navigate to auth URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
        );
      }
    });
  }
}
