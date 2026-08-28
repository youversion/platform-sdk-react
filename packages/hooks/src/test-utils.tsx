import { useState, type ReactElement, type ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { InternalQueryClientProvider } from './internal/QueryClientContext';
import { queryClientDefaultOptions } from './internal/queryClientDefaults';

/**
 * Test infrastructure shared between this repository's packages. Published
 * under the `./test-utils` subpath so `@youversion/platform-react-ui` (and
 * any consumer's test suite) can mount the same seams the real provider
 * wires. Not part of the supported public API: no semver guarantees, and
 * nothing here belongs in application code.
 */

export { queryClientDefaultOptions };

/**
 * Stands in for the query-client seam the real `YouVersionProvider` renders —
 * the data hooks read the provider's private `QueryClient` from an internal
 * context, so even overridden (fetch-disabled) hooks need one mounted. The
 * default client is built from `queryClientDefaultOptions`, the same defaults
 * the provider uses, and is created per MOUNTED wrapper (`useState`, not
 * module scope) so tests sharing one wrapper component don't share a cache.
 * Pass `client` to observe or prime the cache from the test body.
 */
export function TestQueryClientProvider({
  client,
  children,
}: {
  client?: QueryClient;
  children: ReactNode;
}): ReactElement {
  const [fallbackClient] = useState(
    () => new QueryClient({ defaultOptions: queryClientDefaultOptions }),
  );
  return (
    <InternalQueryClientProvider client={client ?? fallbackClient}>
      {children}
    </InternalQueryClientProvider>
  );
}

/**
 * Grafts a working Web Storage trio onto `globalThis` for jsdom test runs.
 *
 * Node >= 22 defines its own experimental `localStorage` global that evaluates
 * to `undefined` unless the process was started with `--localstorage-file` —
 * and vitest's jsdom environment does not overwrite an accessor that already
 * exists on `globalThis`, so Node's dead getter shadows jsdom's working
 * storage. Pointing `--localstorage-file` at a real file is worse: one
 * file-backed store shared by every parallel worker, so tests pollute each
 * other. Instead, graft a coherent Web Storage trio from a private JSDOM
 * window: fresh per test file (isolation), and `Storage` is replaced alongside
 * the instances so `vi.spyOn(Storage.prototype, …)` still observes real
 * storage traffic — tests that assert "nothing was persisted" keep their
 * teeth. No-op in `node`-environment tests, which must stay storage-less.
 *
 * Call from a vitest setup file: `await graftTestWebStorage()`.
 */
export async function graftTestWebStorage(): Promise<void> {
  if (!globalThis.document || globalThis.localStorage?.getItem instanceof Function) return;
  const { JSDOM } = await import('jsdom');
  const storageWindow = new JSDOM('', { url: 'http://localhost/' }).window;
  Object.defineProperty(globalThis, 'Storage', {
    value: storageWindow.Storage,
    configurable: true,
    writable: true,
  });
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, name, {
      value: storageWindow[name],
      configurable: true,
      writable: true,
    });
  }
}
