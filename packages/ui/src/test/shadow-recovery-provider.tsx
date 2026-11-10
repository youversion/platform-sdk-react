import { YouVersionContext } from '@youversion/platform-react-hooks';
import { useContext, useMemo, type ReactNode } from 'react';

export function ShadowRecoveryStoryProvider({
  apiHost,
  children,
}: {
  apiHost: string;
  children: ReactNode;
}): ReactNode {
  const parentContext = useContext(YouVersionContext);
  const value = useMemo(
    () =>
      parentContext ? { ...parentContext, apiHost, appKey: 'test' } : { apiHost, appKey: 'test' },
    [apiHost, parentContext],
  );

  return <YouVersionContext.Provider value={value}>{children}</YouVersionContext.Provider>;
}
