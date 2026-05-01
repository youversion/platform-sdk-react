'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { YouVersionContext } from './YouVersionContext';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';

interface YouVersionProviderPropsBase {
  children: ReactNode;
  appKey: string;
  apiHost?: string;
  installationId?: string;
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
  const {
    appKey,
    apiHost = 'api.youversion.com',
    installationId,
    includeAuth,
    theme = 'light',
    children,
  } = props;
  const resolvedTheme = useResolvedTheme(theme);

  // Sync props to YouVersionPlatformConfiguration so any code that reads the
  // static config (e.g. core's auth/PKCE flows, called from user actions) sees
  // the same values. Children that read via context get the prop directly
  // below, so they don't depend on this effect having run yet.
  useEffect(() => {
    YouVersionPlatformConfiguration.appKey = appKey;
    YouVersionPlatformConfiguration.apiHost = apiHost;
    if (installationId) {
      YouVersionPlatformConfiguration.installationId = installationId;
    }
  }, [appKey, apiHost, installationId]);

  const contextValue = {
    appKey,
    apiHost,
    installationId: installationId ?? YouVersionPlatformConfiguration.installationId,
    theme: resolvedTheme,
    authEnabled: !!includeAuth,
  };

  if (includeAuth) {
    return (
      <YouVersionContext.Provider value={contextValue}>
        <Suspense>
          <AuthProvider config={{ appKey, apiHost, redirectUri: props.authRedirectUrl }}>
            {children}
          </AuthProvider>
        </Suspense>
      </YouVersionContext.Provider>
    );
  }

  return <YouVersionContext.Provider value={contextValue}>{children}</YouVersionContext.Provider>;
}
