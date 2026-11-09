import { YouVersionContext } from '@youversion/platform-react-hooks';
import { useContext, type ReactNode } from 'react';

export function ShadowRecoveryStoryProvider({
  apiHost,
  children,
}: {
  apiHost: string;
  children: ReactNode;
}): ReactNode {
  const parentContext = useContext(YouVersionContext);
  const value = parentContext
    ? { ...parentContext, apiHost, appKey: 'test' }
    : { apiHost, appKey: 'test' };

  return <YouVersionContext.Provider value={value}>{children}</YouVersionContext.Provider>;
}
