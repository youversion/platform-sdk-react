import type { ReactNode, ComponentType } from 'react';
import { YouVersionContext } from '../context';

export const createYVWrapper = (
  appKey = 'test-app-key',
  { theme }: { theme?: 'light' | 'dark' } = {},
): ComponentType<{ children: ReactNode }> => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <YouVersionContext.Provider value={{ appKey, theme }}>{children}</YouVersionContext.Provider>
  );
  return Wrapper;
};
