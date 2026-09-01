import { type ReactNode, type ComponentType } from 'react';
import type { BibleClient, LanguagesClient, OrganizationsClient } from '@youversion/platform-core';
import { YouVersionContext } from '../context';
import { TestQueryClientProvider } from '../test-utils';

export { TestQueryClientProvider };

export type YVWrapperOptions = {
  theme?: 'light' | 'dark';
  bibleClient?: BibleClient;
  languagesClient?: LanguagesClient;
  organizationsClient?: OrganizationsClient;
};

type CacheEnvelope<T> = {
  data: T;
  policy: { allowsCaching: boolean; remainingMs: number };
};

/** Envelope a stubbed Bible body so `useApiData(..., { cacheControl: true })` can unwrap it. */
export function cacheEnvelope<T>(data: T, remainingMs = 0): CacheEnvelope<T> {
  return {
    data,
    policy: { allowsCaching: remainingMs > 0, remainingMs },
  };
}

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
