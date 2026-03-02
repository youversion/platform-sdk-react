/* eslint-disable react-hooks/rules-of-hooks */
import { test as base } from 'vitest';
import type { ReactNode } from 'react';
import { YouVersionContext } from '../context';

interface HookFixtures {
  appKey: string;
  wrapper: React.ComponentType<{ children: ReactNode }>;
}

export const test = base.extend<HookFixtures>({
  appKey: 'test-app-key',
  wrapper: async ({ appKey }, use) => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <YouVersionContext.Provider value={{ appKey }}>{children}</YouVersionContext.Provider>
    );
    await use(Wrapper);
  },
});

export { test as it };
