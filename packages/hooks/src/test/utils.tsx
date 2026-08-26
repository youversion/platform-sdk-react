import { useState, type ReactNode, type ComponentType } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BibleClient, LanguagesClient, OrganizationsClient } from '@youversion/platform-core';
import { YouVersionContext } from '../context';
import { queryClientDefaultOptions } from '../internal/queryClientDefaults';

/**
 * QueryClient for tests that bypass `YouVersionProvider` (raw
 * `YouVersionContext.Provider` with injected client stubs). Built from
 * `queryClientDefaultOptions`, the same defaults the provider's private
 * client uses. Mount it INSIDE the test wrapper component so each mounted
 * wrapper gets a fresh cache — a shared client would leak cached data
 * between tests that reuse one wrapper.
 */
export function TestQueryClientProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: queryClientDefaultOptions }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export type YVWrapperOptions = {
  theme?: 'light' | 'dark';
  bibleClient?: BibleClient;
  languagesClient?: LanguagesClient;
  organizationsClient?: OrganizationsClient;
};

/** Builds a `BibleClient`-typed stub with only the methods the test calls. */
export function createBibleClientStub(methods: Partial<BibleClient>): BibleClient {
  // SAFETY: stub implements the methods under test
  return methods as BibleClient;
}

/** Builds a `LanguagesClient`-typed stub with only the methods the test calls. */
export function createLanguagesClientStub(methods: Partial<LanguagesClient>): LanguagesClient {
  // SAFETY: stub implements the methods under test
  return methods as LanguagesClient;
}

/** Builds an `OrganizationsClient`-typed stub with only the methods the test calls. */
export function createOrganizationsClientStub(
  methods: Partial<OrganizationsClient>,
): OrganizationsClient {
  // SAFETY: stub implements the methods under test
  return methods as OrganizationsClient;
}

export const createYVWrapper = (
  appKey = 'test-app-key',
  options: YVWrapperOptions = {},
): ComponentType<{ children: ReactNode }> => {
  const { theme, bibleClient, languagesClient, organizationsClient } = options;
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <YouVersionContext.Provider
      value={{ appKey, theme, bibleClient, languagesClient, organizationsClient }}
    >
      <TestQueryClientProvider>{children}</TestQueryClientProvider>
    </YouVersionContext.Provider>
  );
  return Wrapper;
};
