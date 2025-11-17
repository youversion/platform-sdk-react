import type { SignInWithYouVersionPermissionValues } from './types';
import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';

export class URLBuilder {
  private static get baseURL(): URL {
    return new URL(`https://${YouVersionPlatformConfiguration.apiHost}`);
  }

  static authURL(
    appKey: string,
    requiredPermissions: Set<SignInWithYouVersionPermissionValues> = new Set<SignInWithYouVersionPermissionValues>(),
    optionalPermissions: Set<SignInWithYouVersionPermissionValues> = new Set<SignInWithYouVersionPermissionValues>(),
  ): URL {
    if (typeof appKey !== 'string' || appKey.trim().length === 0) {
      throw new Error('appKey must be a non-empty string');
    }

    try {
      const url = new URL(this.baseURL);
      url.pathname = '/auth/login';

      // Add query parameters
      const searchParams = new URLSearchParams();
      searchParams.append('APP_KEY', appKey);
      searchParams.append('language', 'en'); // TODO: load from system

      if (requiredPermissions.size > 0) {
        const requiredList = Array.from(requiredPermissions).map((p) => p.toString());
        searchParams.append('required_perms', requiredList.join(','));
      }

      if (optionalPermissions.size > 0) {
        const optionalList = Array.from(optionalPermissions).map((p) => p.toString());
        searchParams.append('opt_perms', optionalList.join(','));
      }

      const installationId = YouVersionPlatformConfiguration.installationId;
      if (installationId) {
        searchParams.append('x-yvp-installation-id', installationId);
      }

      url.search = searchParams.toString();
      return url;
    } catch (error) {
      throw new Error(
        `Failed to construct auth URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  static userURL(accessToken: string): URL {
    if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      throw new Error('accessToken must be a non-empty string');
    }

    try {
      const url = new URL(this.baseURL);
      url.pathname = '/auth/me';

      const searchParams = new URLSearchParams();
      searchParams.append('lat', accessToken);

      url.search = searchParams.toString();
      return url;
    } catch (error) {
      throw new Error(
        `Failed to construct user URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
