/**
 * Safe accessors for Web Storage (`localStorage` / `sessionStorage`).
 *
 * Why not a bare `typeof localStorage === 'undefined'` or
 * `typeof window !== 'undefined'` check?
 *
 * - On Node.js >= 22 the experimental Web Storage API defines a `localStorage`
 *   global that evaluates to `undefined` when the process is started without
 *   `--localstorage-file`. Existence-style guards (`'localStorage' in
 *   globalThis`, `typeof window !== 'undefined'` in jsdom, etc.) can pass while
 *   `localStorage.getItem` still throws `TypeError: Cannot read properties of
 *   undefined`.
 * - In jsdom-based test environments on those Node versions, the bare
 *   `localStorage` global can resolve to Node's undefined-valued accessor even
 *   though `window.localStorage` is a fully working store.
 * - Some browsers throw a `SecurityError` on mere property access when storage
 *   is disabled.
 *
 * These helpers only ever return a storage object that is truthy and actually
 * usable (has a callable `getItem`); otherwise they return `null`.
 */

function resolveStorage(read: () => Storage | undefined | null): Storage | null {
  try {
    const storage = read();
    if (storage && typeof storage.getItem === 'function') {
      return storage;
    }
  } catch {
    // Property access itself can throw (e.g. SecurityError when storage is
    // disabled). Treat storage as unavailable.
  }
  return null;
}

/**
 * Returns a usable `localStorage` implementation, or `null` when none exists.
 */
export function getLocalStorage(): Storage | null {
  return (
    resolveStorage(() => globalThis.localStorage) ??
    resolveStorage(() => (typeof window !== 'undefined' ? window.localStorage : null))
  );
}

/**
 * Returns a usable `sessionStorage` implementation, or `null` when none exists.
 */
export function getSessionStorage(): Storage | null {
  return (
    resolveStorage(() => globalThis.sessionStorage) ??
    resolveStorage(() => (typeof window !== 'undefined' ? window.sessionStorage : null))
  );
}
