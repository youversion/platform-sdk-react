import type { AuthenticationStrategy } from './AuthenticationStrategy';
import { SessionStorageStrategy, type StorageStrategy } from './StorageStrategy';

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
  static handleCallback(callbackPath: string = '/auth/callback'): boolean {
    const currentUrl = new URL(window.location.href);

    // Check if this is a callback URL
    if (currentUrl.pathname === callbackPath && currentUrl.searchParams.has('status')) {
      // For web apps, use the HTTP URL directly (no need to convert to youversionauth scheme)
      const callbackUrl = new URL(currentUrl.toString());

      if (WebAuthenticationStrategy.pendingAuthResolve) {
        WebAuthenticationStrategy.pendingAuthResolve(callbackUrl);
        WebAuthenticationStrategy.cleanup();
      } else {
        // Store the callback URL for later retrieval
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
        // Redirect to auth URL
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
