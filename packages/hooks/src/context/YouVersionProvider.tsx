'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { YouVersionContext } from './YouVersionContext';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';

interface YouVersionProviderPropsBase {
  children: ReactNode;
  appKey: string;
  apiHost?: string;
  theme?: 'light' | 'dark' | 'system';
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

function useResolvedTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => {
    if (theme !== 'system') return theme;
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme !== 'system') {
      setResolved(theme);
      return;
    }

    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    setResolved(mediaQueryList.matches ? 'dark' : 'light');

    const handler = (e: MediaQueryListEvent) => {
      setResolved(e.matches ? 'dark' : 'light');
    };
    mediaQueryList.addEventListener('change', handler);
    return () => mediaQueryList.removeEventListener('change', handler);
  }, [theme]);

  return resolved;
}

export function YouVersionProvider(
  props: PropsWithChildren<YouVersionProviderPropsWithAuth | YouVersionProviderPropsWithoutAuth>,
): React.ReactElement {
  const { appKey, apiHost = 'api.youversion.com', includeAuth, theme = 'light', children } = props;
  const resolvedTheme = useResolvedTheme(theme);

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
          theme: resolvedTheme,
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
        theme: resolvedTheme,
        authEnabled: !!includeAuth,
      }}
    >
      {children}
    </YouVersionContext.Provider>
  );
}
