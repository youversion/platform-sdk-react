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
 */

function resolveStorage(read: () => Storage | undefined | null): Storage | null {
  try {
    const storage = read();
    if (storage && typeof storage.getItem === 'function') {
      return storage;
    }
  } catch {
    // The property access itself can throw (e.g. SecurityError when storage is
    // disabled). Treat storage as unavailable.
  }
  return null;
}

/**
 * Returns a usable `localStorage` implementation, or `null` when none exists.
 *
 * `window` and `globalThis` are the same object in browsers and jsdom, but they
 * can diverge where a DOM is grafted onto a separate `window` (SSR shims, some
 * test harnesses) — there `window.localStorage` is the real store while the
 * global is Node's undefined-valued experimental accessor. Check `window` first
 * so those environments resolve to the store that actually works.
 */
export function getLocalStorage(): Storage | null {
  return (
    resolveStorage(() => (typeof window !== 'undefined' ? window.localStorage : null)) ??
    resolveStorage(() => globalThis.localStorage)
  );
}

/**
 * Returns a usable `sessionStorage` implementation, or `null` when none exists.
 * See {@link getLocalStorage} for why `window` is checked before `globalThis`.
 */
export function getSessionStorage(): Storage | null {
  return (
    resolveStorage(() => (typeof window !== 'undefined' ? window.sessionStorage : null)) ??
    resolveStorage(() => globalThis.sessionStorage)
  );
}
