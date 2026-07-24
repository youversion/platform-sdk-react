import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';

/**
 * Resolves the auth token from an explicit `lat` or the ambient platform
 * configuration. Shared by the service clients (highlights, data exchange) so
 * they resolve the token identically.
 *
 * The implicit fallback reads from `YouVersionPlatformConfiguration`, which is
 * backed by browser `localStorage`. In any environment without it (Node.js
 * tests, SSR) there is intentionally no ambient token: server-side callers must
 * pass `lat` explicitly rather than relying on this fallback.
 *
 * @param lat Optional explicit long access token.
 * @param action Human-readable action for the error message tail (e.g.
 *   `'accessing highlights'`), rendered as
 *   `...sign in before <action>.`
 * @throws Error if no token is available.
 */
export function resolveAuthToken(lat: string | undefined, action: string): string {
  if (lat) {
    return lat;
  }
  const token =
    typeof localStorage === 'undefined' ? null : YouVersionPlatformConfiguration.accessToken;
  if (!token) {
    throw new Error(`Authentication required. Please provide a token or sign in before ${action}.`);
  }
  return token;
}
