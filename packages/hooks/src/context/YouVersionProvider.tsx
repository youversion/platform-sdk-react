'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { lazy, Suspense, useEffect } from 'react';
import { YouVersionContext } from './YouVersionContext';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';

interface YouVersionProviderPropsBase {
  children: ReactNode;
  appKey: string;
  apiHost?: string;
  theme?: 'light' | 'dark';
}

interface YouVersionProviderPropsWithAuth extends YouVersionProviderPropsBase {
  authRedirectUrl: string;
  includeAuth: true;
}

interface YouVersionProviderPropsWithoutAuth extends YouVersionProviderPropsBase {
  includeAuth?: false;
  authRedirectUrl?: never;
}

const AuthProvider = lazy(() => import('./YouVersionAuthProvider'));

export function YouVersionProvider(
  props: PropsWithChildren<YouVersionProviderPropsWithAuth | YouVersionProviderPropsWithoutAuth>,
): React.ReactElement {
  const { appKey, apiHost = 'api.youversion.com', includeAuth, theme = 'light', children } = props;

  // Syncing appKey and apiHost to YouVersionPlatformConfiguration
  // so that this can be in sync with any other code that uses
  // the YouVersionPlatformConfiguration, of which a lot of our
  // core package uses this configuration.
  useEffect(() => {
    YouVersionPlatformConfiguration.appKey = appKey;
    YouVersionPlatformConfiguration.apiHost = apiHost;
  }, [appKey, apiHost]);

  if (includeAuth) {
    const { authRedirectUrl } = props;

    // Installation ID gets set automatically by YouVersionPlatformConfiguration
    return (
      <YouVersionContext.Provider
        value={{
          appKey,
          apiHost,
          installationId: YouVersionPlatformConfiguration.installationId,
          theme,
          authEnabled: !!includeAuth,
        }}
      >
        <Suspense>
          <AuthProvider config={{ appKey, apiHost, redirectUri: authRedirectUrl }}>
            {children}
          </AuthProvider>
        </Suspense>
      </YouVersionContext.Provider>
    );
  }

  // Installation ID gets set automatically by YouVersionPlatformConfiguration
  return (
    <YouVersionContext.Provider
      value={{
        appKey,
        apiHost,
        installationId: YouVersionPlatformConfiguration.installationId,
        theme,
        authEnabled: !!includeAuth,
      }}
    >
      {children}
    </YouVersionContext.Provider>
  );
}
