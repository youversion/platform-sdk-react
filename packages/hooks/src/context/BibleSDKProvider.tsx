'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { BibleSDKContext } from './BibleSDKContext';

type BibleSDKProviderProps = {
  children: ReactNode;
  appId: string;
};

export function BibleSDKProvider({
  appId,
  children,
}: PropsWithChildren<BibleSDKProviderProps>): React.ReactElement {
  return <BibleSDKContext.Provider value={{ appId }}>{children}</BibleSDKContext.Provider>;
}
