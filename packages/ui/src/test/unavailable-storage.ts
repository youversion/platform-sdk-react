/**
 * Simulates Node >= 26 experimental webstorage where the `localStorage`
 * global exists but evaluates to `undefined` because the process was started
 * without `--localstorage-file` (also the SSR-adjacent "no usable store"
 * case). Returns a restore function; call it in a `finally` block so later
 * tests get their storage back.
 */
export function simulateUnavailableLocalStorage(): () => void {
  const patched: [object, PropertyDescriptor | undefined][] = [];

  for (const target of new Set<object>([globalThis, window])) {
    const descriptor = Object.getOwnPropertyDescriptor(target, 'localStorage');
    patched.push([target, descriptor]);
    try {
      Object.defineProperty(target, 'localStorage', {
        configurable: true,
        get: () => undefined,
      });
    } catch {
      // Property is non-configurable but writable (e.g. a test's own data
      // property): plain assignment still simulates the undefined global.
      (target as { localStorage?: unknown }).localStorage = undefined;
    }
  }

  return () => {
    for (const [target, descriptor] of patched) {
      try {
        if (descriptor) {
          Object.defineProperty(target, 'localStorage', descriptor);
        } else {
          delete (target as { localStorage?: unknown }).localStorage;
        }
      } catch {
        // Non-configurable property that we patched by assignment: there is
        // nothing further to restore.
      }
    }
  };
}
