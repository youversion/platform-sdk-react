import type { ReactNode, ComponentType } from 'react';
import { YouVersionContext } from '../context';

export const createYVWrapper = (
  appKey = 'test-app-key',
): ComponentType<{ children: ReactNode }> => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <YouVersionContext.Provider value={{ appKey }}>{children}</YouVersionContext.Provider>
  );
  return Wrapper;
};
