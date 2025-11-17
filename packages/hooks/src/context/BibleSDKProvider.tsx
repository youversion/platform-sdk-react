'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect } from 'react';
import { BibleSDKContext } from './BibleSDKContext';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';

type BibleSDKProviderProps = {
  children: ReactNode;
  appKey: string;
  apiHost?: string;
};

export function BibleSDKProvider({
  appKey,
  apiHost = 'api.youversion.com',
  children,
}: PropsWithChildren<BibleSDKProviderProps>): React.ReactElement {
  // Syncing appKey and apiHost to YouVersionPlatformConfiguration
  // so that this can be in sync with any other code that uses
  // the YouVersionPlatformConfiguration, of which a lot of our
  // core package uses this configuration.
  useEffect(() => {
    YouVersionPlatformConfiguration.appKey = appKey;
    YouVersionPlatformConfiguration.apiHost = apiHost;
  }, [appKey, apiHost]);
  // Installation ID gets set automatically by YouVersionPlatformConfiguration
  return (
    <BibleSDKContext.Provider
      value={{ appKey, apiHost, installationId: YouVersionPlatformConfiguration.installationId }}
    >
      {children}
    </BibleSDKContext.Provider>
  );
}
