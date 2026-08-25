import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { YouVersionContext, type HookOverrides } from '@youversion/platform-react-hooks';
import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';

/**
 * Stands in for the QueryClientProvider the real YouVersionProvider renders —
 * the hooks' `useApiData` runs on TanStack Query, so even overridden (fetch-
 * disabled) data hooks need a client in context. Fresh client per MOUNTED
 * wrapper (`useState`, not module scope) so tests sharing one wrapper
 * component don't share a cache.
 */
export function TestQueryClientProvider({ children }: { children: ReactNode }): ReactElement {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export function HookOverrideProvider({
  overrides,
  theme = 'light',
  children,
}: {
  overrides?: HookOverrides;
  theme?: 'light' | 'dark';
  children: ReactNode;
}): ReactElement {
  return (
    <YouVersionContext.Provider value={{ appKey: 'test', theme, hookOverrides: overrides }}>
      <TestQueryClientProvider>{children}</TestQueryClientProvider>
    </YouVersionContext.Provider>
  );
}

export function renderWithHookOverrides(
  ui: ReactElement,
  overrides?: HookOverrides,
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  return render(ui, {
    ...options,
    wrapper: ({ children }) => (
      <HookOverrideProvider overrides={overrides}>{children}</HookOverrideProvider>
    ),
  });
}
