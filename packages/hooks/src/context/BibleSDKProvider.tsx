'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { BibleSDKContext } from './BibleSDKContext';

type BibleSDKProviderProps = {
  children: ReactNode;
  appKey: string;
};

export function BibleSDKProvider({
  appKey,
  children,
}: PropsWithChildren<BibleSDKProviderProps>): React.ReactElement {
  return <BibleSDKContext.Provider value={{ appKey }}>{children}</BibleSDKContext.Provider>;
}
