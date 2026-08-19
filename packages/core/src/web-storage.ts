/**
 * Safe accessors for Web Storage (`localStorage` / `sessionStorage`).
 *
 * Why not a bare `typeof window !== 'undefined'` or
 * `typeof localStorage !== 'undefined'` check?
 *
 * - `window` is the wrong capability. In React Native `global.window ===
 *   global`, so `typeof window` passes while no storage exists — the guard
 *   succeeds and the next line throws.
 * - On Android DOM WebViews `localStorage` can be `null`, and `typeof null` is
 *   `'object'`, so an existence check passes.
 * - Node's experimental Web Storage defines a `localStorage` global that
 *   evaluates to `undefined` when the process was started without
 *   `--localstorage-file`, so `'localStorage' in globalThis` passes while
 *   `localStorage.getItem` throws.
 * - Some browsers throw a `SecurityError` on the mere property access when
 *   storage is disabled (private mode, blocked third-party cookies).
 *
 * These helpers only ever return a storage object that is truthy and actually
 * usable (has a callable `getItem`); otherwise they return `null`. Callers
 * should optional-chain (`getLocalStorage()?.getItem(key) ?? null`) so an
 * environment without storage degrades instead of crashing.
 *
 * A store that reads fine can still throw on WRITE — Safari's private mode gives
 * every origin a zero-byte quota, so `getItem` works while `setItem` throws
 * `QuotaExceededError` — so resolving a store is not enough to make a mutation
 * safe. Mutate through {@link setStorageItem} / {@link removeStorageItem} /
 * {@link clearStorage}, never by calling the store's methods directly.
 */

function resolveStorage(read: () => Storage | undefined | null): Storage | null {
  try {
    const storage = read();
    if (storage?.getItem instanceof Function) {
      return storage;
    }
  } catch {
    // The property access itself can throw (e.g. SecurityError when storage is
    // disabled). Treat storage as unavailable.
  }
  return null;
}

/**
 * Returns a usable store for the named Web Storage area, or `null`.
 *
 * `window` and `globalThis` are the same object in browsers and jsdom, but they
 * can diverge where a DOM is grafted onto a separate `window` (SSR shims, some
 * test harnesses) — there `window[name]` is the real store while the global is
 * Node's undefined-valued experimental accessor. Check `window` first so those
 * environments resolve to the store that actually works.
 */
function getWebStorage(name: 'localStorage' | 'sessionStorage'): Storage | null {
  return (
    resolveStorage(() => (globalThis.window ? globalThis.window[name] : null)) ??
    resolveStorage(() => globalThis[name])
  );
}

/** Returns a usable `localStorage` implementation, or `null` when none exists. */
export function getLocalStorage(): Storage | null {
  return getWebStorage('localStorage');
}

/** Returns a usable `sessionStorage` implementation, or `null` when none exists. */
export function getSessionStorage(): Storage | null {
  return getWebStorage('sessionStorage');
}

/**
 * Writes a value, tolerating a store that throws on mutation (zero quota in
 * Safari private mode, a full quota, storage disabled mid-session).
 *
 * @param storage A resolved store, or `null` — pass `getLocalStorage()` directly.
 * @returns `true` when the value was actually persisted. Callers that merely
 *   cache something can ignore it; callers that need the value to survive a
 *   reload or redirect must not assume the write landed.
 */
export function setStorageItem(storage: Storage | null, key: string, value: string): boolean {
  try {
    storage?.setItem(key, value);
    return storage !== null;
  } catch {
    return false;
  }
}

/**
 * Removes a key, tolerating a store that throws on mutation. Cleanup is never
 * worth failing an operation that has otherwise succeeded, so this swallows.
 */
export function removeStorageItem(storage: Storage | null, key: string): void {
  try {
    storage?.removeItem(key);
  } catch {
    // Nothing to do: the key stays, and every reader of it already tolerates
    // stale or unexpected values.
  }
}

/** Clears a store, tolerating one that throws on mutation. */
export function clearStorage(storage: Storage | null): void {
  try {
    storage?.clear();
  } catch {
    // As with removeStorageItem — a failed clear is not worth throwing over.
  }
}
