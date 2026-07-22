import type { AuthenticationScopes, SignInWithYouVersionPermissionValues } from './types';
import { YouVersionUserInfo } from './YouVersionUserInfo';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import { SignInWithYouVersionPKCEAuthorizationRequestBuilder } from './SignInWithYouVersionPKCE';
import { SignInWithYouVersionResult } from './SignInWithYouVersionResult';
import { parseGrantedPermissions, parsePermissionList } from './permissions';

/** Stash key for `granted_permissions` seen on the pre-code OAuth hop. */
const PENDING_GRANTED_PERMISSIONS_KEY = 'youversion-auth-pending-granted-permissions';

/** OIDC scopes that must not be stored in the data-exchange permission cache. */
const OIDC_SCOPES = new Set(['openid', 'profile', 'email', 'offline_access']);

export class YouVersionAPIUsers {
  /**
   * Presents the YouVersion login flow to the user and returns the login result upon completion.
   *
   * This function authenticates the user with YouVersion.
   * The function redirects to the YouVersion authorization URL and expects the callback to be handled separately.
   *
   * @param redirectURL - The URL to redirect back to after authentication.
   * @param scopes - The OIDC scopes given to the authentication call (e.g. `profile`, `email`).
   * @param permissions - YouVersion data-exchange permissions to request (e.g. `highlights`).
   *   These are sent as a comma-joined `requested_permissions` param, separate from OIDC scopes.
   * @throws An error if authentication fails or configuration is invalid.
   */
  static async signIn(
    redirectURL: string,
    scopes?: AuthenticationScopes[],
    permissions?: SignInWithYouVersionPermissionValues[],
  ): Promise<void> {
    const appKey = YouVersionPlatformConfiguration.appKey;
    if (!appKey) {
      throw new Error('YouVersionPlatformConfiguration.appKey must be set before calling signIn');
    }

    const authorizationRequest = await SignInWithYouVersionPKCEAuthorizationRequestBuilder.make(
      appKey,
      new URL(redirectURL),
      scopes,
      permissions,
    );

    // Store auth data for callback handler
    localStorage.setItem(
      'youversion-auth-code-verifier',
      authorizationRequest.parameters.codeVerifier,
    );
    const redirectUrlString = redirectURL.toString().endsWith('/')
      ? redirectURL.toString().slice(0, -1)
      : redirectURL.toString();
    localStorage.setItem('youversion-auth-redirect-uri', redirectUrlString);
    localStorage.setItem('youversion-auth-state', authorizationRequest.parameters.state);

    // Simple redirect to authorization URL
    window.location.href = authorizationRequest.url.toString();
  }

  /**
   * Handles the OAuth callback after user authentication.
   *
   * Call this method when your app loads to check if the current URL contains
   * an OAuth callback with authorization code. If found, it exchanges the code
   * for tokens and stores them.
   *
   * @returns Promise<SignInWithYouVersionResult | null> - SignInWithYouVersionResult if callback was handled, null otherwise
   * @throws An error if token exchange fails
   */
  static async handleAuthCallback(): Promise<SignInWithYouVersionResult | null> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    // Check if this is an OAuth callback
    if (!state && !error) {
      return null;
    }

    // Handle OAuth error
    if (error) {
      const errorDescription = urlParams.get('error_description') || error;
      throw new Error(`OAuth authentication failed: ${errorDescription}`);
    }

    // Verify state parameter
    const storedState = localStorage.getItem('youversion-auth-state');
    if (state !== storedState) {
      throw new Error('Invalid state parameter - possible CSRF attack');
    }

    // If we don't have a code, this might be the first callback with user data
    // We need to redirect to the server callback to get the authorization code.
    // Stash any granted_permissions from this hop first — Swift keeps the original
    // callback URL for grants, but the web flow navigates away to /auth/callback
    // and the final redirect with `code` may omit them.
    if (!code && state) {
      const earlyGrants = parseGrantedPermissions(urlParams);
      if (earlyGrants.length > 0) {
        localStorage.setItem(PENDING_GRANTED_PERMISSIONS_KEY, earlyGrants.join(','));
      }
      this.obtainLocation(window.location.href, state);
      return null;
    }

    // Get stored auth data
    const codeVerifier = localStorage.getItem('youversion-auth-code-verifier');
    const redirectUri = localStorage.getItem('youversion-auth-redirect-uri');

    if (!code || !codeVerifier || !redirectUri) {
      throw new Error('Missing required authentication parameters');
    }

    try {
      // Exchange authorization code for tokens
      const tokenRequest = SignInWithYouVersionPKCEAuthorizationRequestBuilder.tokenURLRequest(
        code,
        codeVerifier,
        redirectUri,
      );

      const response = await fetch(tokenRequest);

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();

      const tokens = JSON.parse(responseText) as {
        access_token: string;
        expires_in: number;
        id_token: string;
        refresh_token: string;
        scope: string;
        token_type: string;
      };

      // Match Swift: union grants from (1) this URL, (2) stashed pre-code hop,
      // (3) token scope — then drop OIDC scopes before seeding the data-exchange
      // permission cache.
      const stashedGrants = parsePermissionList(
        localStorage.getItem(PENDING_GRANTED_PERMISSIONS_KEY),
      );
      localStorage.removeItem(PENDING_GRANTED_PERMISSIONS_KEY);
      const grantedPermissions = [
        ...new Set([
          ...parseGrantedPermissions(urlParams),
          ...stashedGrants,
          ...parsePermissionList(tokens.scope),
        ]),
      ].filter((permission) => !OIDC_SCOPES.has(permission));

      // Extract user info from ID token
      const result = this.extractSignInResult(tokens);

      // Store tokens in configuration. The ID token is intentionally not
      // persisted — it is only used here to derive the user profile below.
      YouVersionPlatformConfiguration.saveAuthData(
        result.accessToken || null,
        result.refreshToken || null,
        result.expiryDate || null,
      );

      // Persist the decoded user profile so it survives reloads without
      // retaining the ID token itself. This must happen before the permission
      // cache is seeded below, since grants are scoped to the current user.
      YouVersionPlatformConfiguration.saveUserInfo({
        id: result.yvpUserId,
        name: result.name,
        email: result.email,
        avatar_url: result.profilePicture,
      });

      // Persist the granted permissions into the optimistic permission cache so
      // a one-fell-swoop sign-in that requested `highlights` can apply a pending
      // highlight on return without a probe round-trip.
      if (grantedPermissions.length > 0) {
        YouVersionPlatformConfiguration.saveGrantedPermissions(grantedPermissions);
      }

      // Clean up localStorage
      localStorage.removeItem('youversion-auth-code-verifier');
      localStorage.removeItem('youversion-auth-redirect-uri');
      localStorage.removeItem('youversion-auth-state');
      localStorage.removeItem(PENDING_GRANTED_PERMISSIONS_KEY);

      // Clean up URL
      const cleanUrl = new URL(window.location.href);
      cleanUrl.search = '';
      window.history.replaceState({}, '', cleanUrl.toString());

      return result;
    } catch (error) {
      YouVersionPlatformConfiguration.clearAuthTokens();
      localStorage.removeItem('youversion-auth-code-verifier');
      localStorage.removeItem('youversion-auth-redirect-uri');
      localStorage.removeItem('youversion-auth-state');
      localStorage.removeItem(PENDING_GRANTED_PERMISSIONS_KEY);
      throw error;
    }
  }

  /**
   * Redirects to the server callback endpoint to obtain authorization code
   */
  private static obtainLocation(callbackURL: string, state: string): void {
    const url = new URL(callbackURL);
    const params = new URLSearchParams(url.search);

    if (params.get('state') !== state) {
      throw new Error('Invalid state parameter');
    }

    // Redirect to the server callback endpoint with all the current parameters
    const serverCallbackUrl = new URL(
      `https://${YouVersionPlatformConfiguration.apiHost}/auth/callback`,
    );
    params.forEach((value, key) => {
      serverCallbackUrl.searchParams.set(key, value);
    });

    window.location.href = serverCallbackUrl.toString();
  }

  /**
   * Extracts sign-in result from token response
   */
  private static extractSignInResult(tokens: {
    access_token: string;
    expires_in: number;
    id_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
  }): SignInWithYouVersionResult {
    const idClaims = this.decodeJWT(tokens.id_token);

    const resultData = {
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
      refreshToken: tokens.refresh_token,
      yvpUserId: idClaims.sub as string,
      name: idClaims.name as string,
      profilePicture: idClaims.profile_picture as string,
      email: idClaims.email as string,
    };

    return new SignInWithYouVersionResult(resultData);
  }

  /**
   * Decodes JWT payload for UI display purposes.
   *
   * Note: We intentionally do not verify the JWT signature here because:
   *
   * 1. YouVersion's backend verifies all tokens on API requests
   * 2. This decoded data is only used for UI display
   * 3. No security decisions are made based on these claims
   *
   * @private
   */

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
        // atob() returns a byte string (Latin-1); decode bytes as UTF-8 before JSON.parse.
        const bytes = Uint8Array.from(data, (char) => char.charCodeAt(0));
        const decodedPayload = new TextDecoder('utf-8').decode(bytes);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return JSON.parse(decodedPayload);
      } else {
        return {};
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('JWT decode failed:', error);
      }
      return {};
    }
  }

  static signOut(): void {
    YouVersionPlatformConfiguration.clearAuthTokens();
  }

  /**
   * Retrieves user information for the authenticated user by decoding the provided JWT access token.
   *
   * This function extracts the user's profile information directly from the JWT token payload.
   *
   * @param accessToken - The JWT access token obtained from the login process.
   * @returns A Promise resolving to a YouVersionUserInfo object containing the user's profile information.
   * @throws An error if the access token is invalid or cannot be decoded.
   */
  static userInfo(idToken: string): YouVersionUserInfo {
    // Validate access token
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Invalid access token: must be a non-empty string');
    }

    try {
      // Decode JWT payload to extract user information
      const claims = this.decodeJWT(idToken);

      if (!claims || Object.keys(claims).length === 0) {
        throw new Error('Invalid JWT token: Unable to decode token payload');
      }

      // Map JWT claims to YouVersionUserInfo format
      const userInfoData = {
        id: claims.sub as string,
        name: claims.name as string,
        avatar_url: claims.profile_picture as string,
        email: claims.email as string,
      };

      return new YouVersionUserInfo(userInfoData);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to decode user information from JWT: ${error.message}`);
      } else {
        throw new Error('Failed to decode user information from JWT: Unknown error');
      }
    }
  }

  /**
   * Returns the user profile that was persisted at sign-in, or `null` if the
   * user is not signed in (or the stored profile is missing/invalid).
   *
   * This reads the decoded profile from storage rather than re-decoding the ID
   * token, which is never persisted.
   */
  static getStoredUserInfo(): YouVersionUserInfo | null {
    const stored = YouVersionPlatformConfiguration.storedUserInfo;
    if (!stored?.id) {
      return null;
    }
    return new YouVersionUserInfo(stored);
  }

  /**
   * Refreshes the access token using the stored refresh token.
   *
   * @returns Promise<SignInWithYouVersionResult | null> - New tokens if refresh succeeds, null otherwise
   * @throws An error if refresh fails or no refresh token is available
   */
  static async refreshTokens(): Promise<SignInWithYouVersionResult | null> {
    const refreshToken = YouVersionPlatformConfiguration.refreshToken;
    const appKey = YouVersionPlatformConfiguration.appKey;

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    if (!appKey) {
      throw new Error(
        'YouVersionPlatformConfiguration.appKey must be set before refreshing tokens',
      );
    }

    try {
      const url = new URL(`https://${YouVersionPlatformConfiguration.apiHost}/auth/token`);

      const parameters = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: appKey,
      });

      const request = new Request(url, {
        method: 'POST',
        body: parameters,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const response = await fetch(request);

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
      }

      const tokens = (await response.json()) as {
        access_token: string;
        expires_in: number;
        refresh_token: string;
        scope: string;
        token_type: string;
      };

      // Create result with new tokens. The persisted user profile is left
      // untouched — refreshing only rotates the access/refresh tokens.
      const result = new SignInWithYouVersionResult({
        accessToken: tokens.access_token,
        expiresIn: tokens.expires_in,
        refreshToken: tokens.refresh_token,
      });

      // Store updated tokens
      YouVersionPlatformConfiguration.saveAuthData(
        result.accessToken || null,
        result.refreshToken || null,
        result.expiryDate || null,
      );

      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Token refresh failed: ${error.message}`);
      } else {
        throw new Error('Token refresh failed: Unknown error');
      }
    }
  }

  /**
   * Checks if the current access token is expired or about to expire.
   *
   * @returns true if token is expired or about to expire
   */
  static isTokenExpired(): boolean {
    const expiryDate = YouVersionPlatformConfiguration.tokenExpiryDate;
    if (!expiryDate) {
      return true; // No expiry date means no token or invalid token
    }

    return new Date().getTime() >= expiryDate.getTime();
  }

  /**
   * Refreshes the access token if it's expired or about to expire.
   *
   * @returns Promise<boolean> - true if refresh was successful or not needed, false if failed
   */
  static async refreshTokenIfNeeded(): Promise<boolean> {
    if (!this.isTokenExpired()) {
      return true; // Token is still valid
    }

    try {
      const result = await this.refreshTokens();
      return !!result;
    } catch {
      // Refresh failed, clear tokens
      YouVersionPlatformConfiguration.clearAuthTokens();
      return false;
    }
  }
}
