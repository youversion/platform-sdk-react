'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect } from 'react';
import { YouVersionContext } from './YouVersionContext';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';

type YouVersionProviderProps = {
  children: ReactNode;
  appKey: string;
  apiHost?: string;
};

export function YouVersionProvider({
  appKey,
  apiHost = 'api.youversion.com',
  children,
}: PropsWithChildren<YouVersionProviderProps>): React.ReactElement {
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
    <YouVersionContext.Provider
      value={{ appKey, apiHost, installationId: YouVersionPlatformConfiguration.installationId }}
    >
      {children}
    </YouVersionContext.Provider>
  );
}
