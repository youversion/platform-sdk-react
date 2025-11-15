import type { SignInWithYouVersionPermissionValues } from './types';
import {
  SignInWithYouVersionResult,
  SignInWithYouVersionPermission,
} from './SignInWithYouVersionResult';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import { AuthenticationStrategyRegistry } from './AuthenticationStrategy';
import { SignInWithYouVersionPKCEAuthorizationRequestBuilder } from './SignInWithYouVersionPKCEAuthorizationRequest';
import { WebAuthenticationStrategy } from './WebAuthenticationStrategy';

interface TokenResponse {
  access_token: string;
  expires_in: string;
  id_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export class YouVersionAPIUsers {
  /**
   * Presents the YouVersion login flow to the user and returns the login result upon completion.
   *
   * This function authenticates the user with YouVersion using OAuth 2.0 with PKCE, requesting the specified permissions.
   * The function returns a promise that resolves when the user completes or cancels the login flow,
   * returning the login result containing access token, refresh token, and user information from the ID token.
   *
   * @param requiredPermissions - The set of permissions that must be granted by the user for successful login.
   * @param optionalPermissions - The set of permissions that will be requested from the user but are not required for successful login.
   * @returns A Promise resolving to a SignInWithYouVersionResult containing tokens and user info upon successful login.
   * @throws An error if authentication fails or is cancelled by the user.
   */
  static async signIn(
    requiredPermissions: Set<SignInWithYouVersionPermissionValues>,
    optionalPermissions: Set<SignInWithYouVersionPermissionValues>,
  ): Promise<SignInWithYouVersionResult> {
    // Validate inputs
    if (!requiredPermissions || !(requiredPermissions instanceof Set)) {
      throw new Error('Invalid requiredPermissions: must be a Set');
    }
    if (!optionalPermissions || !(optionalPermissions instanceof Set)) {
      throw new Error('Invalid optionalPermissions: must be a Set');
    }

    const appKey = YouVersionPlatformConfiguration.appId;
    if (!appKey) {
      throw new Error('YouVersionPlatformConfiguration.appId must be set before calling signIn');
    }

    // Combine required and optional permissions
    const allPermissions = new Set([...requiredPermissions, ...optionalPermissions]);

    // Get redirect URL from authentication strategy
    const strategy = AuthenticationStrategyRegistry.get();
    const redirectURL = new URL(window.location.origin + '/auth/callback');

    // Generate PKCE request
    const authorizationRequest = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
      appKey,
      allPermissions,
      redirectURL,
    );

    // Authenticate and get callback URL
    const callbackURL = await strategy.authenticate(authorizationRequest.url);

    // Extract location from callback
    const location = await this.obtainLocation(callbackURL, authorizationRequest.parameters.state);

    // Extract code from location
    const code = this.obtainCode(location);

    // Exchange code for tokens
    const tokens = await this.obtainTokens(
      code,
      authorizationRequest.parameters.codeVerifier,
      redirectURL.toString(),
    );

    // Extract result from tokens
    const result = this.extractSignInWithYouVersionResult(tokens);

    // Save tokens to configuration
    YouVersionPlatformConfiguration.saveAuthData(
      result.accessToken,
      result.refreshToken,
      result.expiryDate,
    );

    return result;
  }

  private static async obtainLocation(callbackURL: URL, state: string): Promise<string> {
    const components = new URLSearchParams(callbackURL.search);

    // Validate state parameter
    if (components.get('state') !== state) {
      throw new Error('Invalid state parameter');
    }

    // Use proxy if configured (to bypass CORS in web apps)
    const proxyUrl = (
      YouVersionPlatformConfiguration as unknown as Record<string, string | undefined>
    ).authCallbackProxyUrl;

    if (proxyUrl) {
      // Use server-side proxy to bypass CORS
      const proxyURL = new URL(proxyUrl);
      proxyURL.search = callbackURL.search;

      const response = await fetch(proxyURL.toString());

      if (!response.ok) {
        throw new Error(`Proxy request failed with status ${response.status}`);
      }

      const data = (await response.json()) as Record<string, string | undefined>;
      if (!data.location) {
        throw new Error('Proxy did not return location');
      }

      return data.location;
    }

    // Fallback to direct request (works in native apps, fails in browsers due to CORS)
    const newURL = new URL(`https://${YouVersionPlatformConfiguration.apiHost}/auth/callback`);
    newURL.search = callbackURL.search;

    const response = await fetch(newURL.toString(), {
      method: 'GET',
      redirect: 'manual',
    });

    if (response.status !== 302) {
      throw new Error(`Expected redirect (302), got ${response.status}`);
    }

    const location = response.headers.get('Location');
    if (!location) {
      throw new Error('No Location header in redirect response');
    }

    return location;
  }

  private static obtainCode(location: string): string {
    const locationURL = new URL(location);
    const code = locationURL.searchParams.get('code');

    if (!code) {
      throw new Error('No authorization code in redirect location');
    }

    return code;
  }

  private static async obtainTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string,
  ): Promise<TokenResponse> {
    const request = SignInWithYouVersionPKCEAuthorizationRequestBuilder.tokenURLRequest(
      code,
      codeVerifier,
      redirectUri,
    );

    const response = await fetch(request);

    if (response.status !== 200) {
      throw new Error(`Token exchange failed with status ${response.status}`);
    }

    return (await response.json()) as TokenResponse;
  }

  private static decodeJWT(token: string): Record<string, string | undefined> {
    const segments = token.split('.');
    if (segments.length !== 3 || !segments[1]) {
      return {};
    }

    let base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/');

    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    try {
      const json = atob(base64);
      return JSON.parse(json) as Record<string, string | undefined>;
    } catch {
      return {};
    }
  }

  private static extractSignInWithYouVersionResult(
    tokens: TokenResponse,
  ): SignInWithYouVersionResult {
    const idClaims = this.decodeJWT(tokens.id_token);

    const permissions = tokens.scope
      .split(' ')
      .map((s) => s.trim())
      .filter((s) =>
        Object.values(SignInWithYouVersionPermission).includes(
          s as SignInWithYouVersionPermissionValues,
        ),
      ) as SignInWithYouVersionPermissionValues[];

    return new SignInWithYouVersionResult(
      tokens.access_token,
      tokens.expires_in,
      tokens.refresh_token,
      permissions,
      idClaims.sub,
      idClaims.name,
      idClaims.profile_picture,
      idClaims.email,
    );
  }

  static signOut(): void {
    YouVersionPlatformConfiguration.saveAuthData(null, null, null);
    // Clean up PKCE state
    SignInWithYouVersionPKCEAuthorizationRequestBuilder.clearStored();
  }

  /**
   * Complete sign-in from a stored OAuth callback after a full-page redirect.
   *
   * This method should be called automatically by the provider after detecting
   * a stored callback in sessionStorage. It retrieves the PKCE parameters,
   * completes the code exchange, and returns the sign-in result.
   *
   * @returns A Promise resolving to SignInWithYouVersionResult with tokens and user info
   * @throws Error if no stored callback or PKCE parameters are found
   */
  static async completeSignInFromStoredCallback(): Promise<SignInWithYouVersionResult> {
    // Get stored callback URL
    const callbackURL = WebAuthenticationStrategy.getStoredCallback();
    if (!callbackURL) {
      throw new Error('No stored OAuth callback found');
    }

    // Restore PKCE parameters
    const pkceParams = SignInWithYouVersionPKCEAuthorizationRequestBuilder.restore();
    if (!pkceParams) {
      throw new Error('No stored PKCE parameters found (state/codeVerifier/redirectUri)');
    }

    try {
      // Extract location from callback
      const location = await this.obtainLocation(callbackURL, pkceParams.state);

      // Extract code from location
      const code = this.obtainCode(location);

      // Exchange code for tokens using the stored redirect URI
      console.log('[PKCE] Exchanging code with verifier:', {
        code: code.substring(0, 10) + '...',
        verifier: pkceParams.codeVerifier.substring(0, 10) + '...',
        redirectUri: pkceParams.redirectUri,
      });
      const tokens = await this.obtainTokens(code, pkceParams.codeVerifier, pkceParams.redirectUri);

      // Extract result from tokens
      const result = this.extractSignInWithYouVersionResult(tokens);

      // Save tokens to configuration
      YouVersionPlatformConfiguration.saveAuthData(
        result.accessToken,
        result.refreshToken,
        result.expiryDate,
      );

      // Clean up stored PKCE parameters
      SignInWithYouVersionPKCEAuthorizationRequestBuilder.clearStored();

      return result;
    } catch (error) {
      // Clean up on error
      SignInWithYouVersionPKCEAuthorizationRequestBuilder.clearStored();
      throw error;
    }
  }
}
