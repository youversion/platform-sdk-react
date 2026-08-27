'use client';

import {
  createContext,
  useContext,
  useEffect,
  type Context,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { QueryClient } from '@tanstack/react-query';

/**
 * @internal
 * Carries `YouVersionProvider`'s private `QueryClient` to the data hooks.
 *
 * The provider deliberately does not render TanStack's `QueryClientProvider`.
 * That provider writes to the TanStack context, and when the host app's
 * `@tanstack/react-query` dedupes to the copy this package pins, it would
 * shadow the host's own client for every host component rendered under
 * `YouVersionProvider` — their queries would silently run against our cache
 * and our defaults. This context belongs to this package alone, and hooks
 * hand the client to `useQuery`/`useQueries` explicitly, so the TanStack
 * context is never touched in either direction.
 *
 * The context object is registered on `globalThis` under a shared symbol.
 * The package ships the same modules as both ESM and CJS bundles, and the
 * `test-utils` entry is a separate bundle again — a CJS test runner (Jest)
 * loads two copies of this module, one per bundle. Without the registry each
 * copy would create its own context, and the test provider would supply a
 * context the hooks never read.
 */
const CONTEXT_KEY = Symbol.for('@youversion/platform-react-hooks/QueryClientContext');

interface QueryClientContextRegistry {
  [key: symbol]: Context<QueryClient | undefined> | undefined;
}

// SAFETY: the only symbol slot this module touches on `globalThis` is
// CONTEXT_KEY, and it is written only below, always with the context type the
// interface declares.
const registry = globalThis as QueryClientContextRegistry;
const existing = registry[CONTEXT_KEY];

export const QueryClientContext: Context<QueryClient | undefined> =
  existing ?? createContext<QueryClient | undefined>(undefined);
registry[CONTEXT_KEY] = QueryClientContext;

/**
 * @internal
 * Puts `client` on `QueryClientContext` and keeps it mounted while rendered.
 * `client.mount()` is what subscribes a `QueryClient` to the online and focus
 * managers — TanStack's own `QueryClientProvider` does it, and without it the
 * `refetchOnReconnect` recovery of errored reads never fires.
 */
export function InternalQueryClientProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}): ReactElement {
  useEffect(() => {
    client.mount();
    return () => client.unmount();
  }, [client]);
  return <QueryClientContext.Provider value={client}>{children}</QueryClientContext.Provider>;
}

/**
 * @internal
 * Returns the provider's private `QueryClient`, or throws when no
 * `YouVersionProvider` (or test provider) is mounted. Falling back to
 * TanStack's own context is not an option: in a host app that also uses
 * TanStack Query, the fallback would silently bind our queries to the host's
 * client — the mirror image of the shadowing this context exists to prevent.
 */
export function useInternalQueryClient(): QueryClient {
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error(
      'YouVersion query client not found. Make sure your component is wrapped with YouVersionProvider.',
    );
  }
  return client;
}
