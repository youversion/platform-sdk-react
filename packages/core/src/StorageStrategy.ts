/**
 * Abstract storage strategy for auth-related data (callbacks, return URLs).
 * Implementations can use different mechanisms (sessionStorage, memory, etc.)
 *
 * WARNING: Session storage has known XSS vulnerabilities. An attacker that gains
 * script execution access (via XSS) can read all values in sessionStorage. Consider
 * using a secure, HTTP-only cookie mechanism for production applications.
 */
export interface StorageStrategy {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  clear(): void;
}

/**
 * Default storage strategy using the browser's sessionStorage.
 * This provides temporary storage for authentication state during a single session.
 *
 * SECURITY WARNING: SessionStorage is vulnerable to XSS attacks. If an attacker
 * can inject JavaScript into your application, they can access all sessionStorage values.
 * For production applications handling sensitive authentication tokens, consider:
 * 1. Using secure, HTTP-only cookies instead
 * 2. Storing tokens in memory only (with redirection to re-authenticate on page reload)
 * 3. Using a custom storage backend that implements additional security measures
 */
export class SessionStorageStrategy implements StorageStrategy {
  setItem(key: string, value: string): void {
    if (typeof sessionStorage === 'undefined') {
      console.warn('SessionStorage is not available in this environment');
      return;
    }
    sessionStorage.setItem(key, value);
  }

  getItem(key: string): string | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }
    return sessionStorage.getItem(key);
  }

  removeItem(key: string): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.removeItem(key);
  }

  clear(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    sessionStorage.clear();
  }
}

/**
 * In-memory storage strategy that stores data in a Map.
 * This storage is cleared when the page is refreshed.
 * Provides better XSS protection than sessionStorage but requires re-authentication on page reload.
 */
export class MemoryStorageStrategy implements StorageStrategy {
  private store = new Map<string, string>();

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
