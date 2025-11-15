import type { SignInWithYouVersionPermissionValues } from './types';
import { SignInWithYouVersionResult } from './SignInWithYouVersionResult';
import { YouVersionUserInfo } from './YouVersionUserInfo';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import { YouVersionAPI } from './YouVersionAPI';
import { URLBuilder } from './URLBuilder';
import { AuthenticationStrategyRegistry } from './AuthenticationStrategy';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

export class YouVersionAPIUsers {
  /**
   * Presents the YouVersion login flow to the user and returns the login result upon completion.
   *
   * This function authenticates the user with YouVersion, requesting the specified required and optional permissions.
   * The function returns a promise that resolves when the user completes or cancels the login flow,
   * returning the login result containing the authorization code and granted permissions.
   *
   * @param requiredPermissions - The set of permissions that must be granted by the user for successful login.
   * @param optionalPermissions - The set of permissions that will be requested from the user but are not required for successful login.
   * @returns A Promise resolving to a SignInWithYouVersionResult containing the authorization code and granted permissions upon successful login.
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

    const appKey = YouVersionPlatformConfiguration.appKey;
    if (!appKey) {
      throw new Error('YouVersionPlatformConfiguration.appKey must be set before calling signIn');
    }

    const url = URLBuilder.authURL(appKey, requiredPermissions, optionalPermissions);

    // Use the registered authentication strategy
    const strategy = AuthenticationStrategyRegistry.get();
    const callbackUrl = await strategy.authenticate(url);
    const result = new SignInWithYouVersionResult(callbackUrl);

    if (result.accessToken) {
      YouVersionPlatformConfiguration.setAccessToken(result.accessToken);
    }

    return result;
  }

  static signOut(): void {
    YouVersionPlatformConfiguration.setAccessToken(null);
  }

  /**
   * Retrieves user information for the authenticated user using the provided access token.
   *
   * This function fetches the user's profile information from the YouVersion API, decoding it into a YouVersionUserInfo model.
   *
   * @param accessToken - The access token obtained from the login process.
   * @returns A Promise resolving to a YouVersionUserInfo object containing the user's profile information.
   * @throws An error if the URL is invalid, the network request fails, or the response cannot be decoded.
   */
  static async userInfo(accessToken: string): Promise<YouVersionUserInfo> {
    // Validate access token
    if (!accessToken || typeof accessToken !== 'string') {
      throw new Error('Invalid access token: must be a non-empty string');
    }

    // Check for preview mode if configured
    if (YouVersionPlatformConfiguration.isPreviewMode && accessToken === 'preview') {
      return (
        YouVersionPlatformConfiguration.previewUserInfo ||
        new YouVersionUserInfo({
          first_name: 'Preview',
          last_name: 'User',
          id: 'preview-user',
          avatar_url: undefined,
        })
      );
    }

    const url = URLBuilder.userURL(accessToken);

    const request = YouVersionAPI.addStandardHeaders(url);

    // Retry logic for transient failures
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const response = await fetch(request);

        if (response.status === 401) {
          throw new Error(
            'Authentication failed: Invalid or expired access token. Please sign in again.',
          );
        }

        if (response.status === 403) {
          throw new Error('Access denied: Insufficient permissions to retrieve user information');
        }

        if (response.status !== 200) {
          throw new Error(
            `Failed to retrieve user information: Server responded with status ${response.status}`,
          );
        }

        const data = (await response.json()) as YouVersionUserInfo;
        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Failed to parse server response');

        // Don't retry on authentication errors
        if (
          error instanceof Error &&
          (error.message.includes('401') || error.message.includes('403'))
        ) {
          throw error;
        }

        // Retry on network errors
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
          continue;
        }
      }
    }

    throw lastError || new Error('Failed to retrieve user information after multiple attempts');
  }
}
