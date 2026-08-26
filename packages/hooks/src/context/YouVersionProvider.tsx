'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { YouVersionContext } from './YouVersionContext';
import { serializeAdditionalHeaders } from '../internal/additionalHeadersKey';
import {
  YouVersionPlatformConfiguration,
  type YouVersionUserInfoJSON,
} from '@youversion/platform-core';

interface YouVersionProviderPropsBase {
  children: ReactNode;
  appKey: string;
  apiHost?: string;
  theme?: 'light' | 'dark' | 'system';
  /**
   * Integrator display name for the sign-in dialog body copy. Synced onto
   * `YouVersionPlatformConfiguration.appName`. The UI package also mirrors this
   * onto its bundled core copy (tsup `noExternal`), so pass it via
   * `YouVersionProvider` props — do not set the config from a separate
   * `@youversion/platform-core` import when consuming `@youversion/platform-react-ui`.
   */
  appName?: string;
  /**
   * Optional pitch line for the sign-in dialog. Synced onto
   * `YouVersionPlatformConfiguration.signInPromptMessage` (and mirrored by the
   * UI provider onto its bundled core copy — same dual-instance caveat as `appName`).
   */
  signInPromptMessage?: string;
  /**
   * Extra HTTP headers to add to every API call made through hooks created by
   * this provider. Values here override the SDK's built-in headers when keys
   * collide — useful for wrappers (e.g. the React Native Expo SDK) that need
   * to replace `X-YVP-Sdk` with their own identifier.
   */
  additionalHeaders?: Record<string, string>;
  /**
   * Bible version ids this app may use. Unset = no restriction. `[]` permits
   * nothing. Synced onto `YouVersionPlatformConfiguration` during render so
   * the first child fetch sees the filter (YPE-4657).
   */
  permittedVersionIds?: number[];
  /**
   * Bible version ids this app may not use. Unset or `[]` excludes nothing.
   * Exclusion wins over `permittedVersionIds`.
   */
  excludedVersionIds?: number[];
  /**
   * BCP 47 language tags this app may use (`en`, `zh-Hans`). Unset = no
   * restriction. `[]` permits nothing.
   */
  permittedLanguageTags?: string[];
}

interface YouVersionProviderPropsWithAuth extends YouVersionProviderPropsBase {
  authRedirectUrl: string;
  includeAuth: true;
  /**
   * Host-controlled auth state. When provided (including `null`), the host owns
   * sign-in and this profile drives the in-app auth UI instead of the web
   * token/OAuth flow. Used by the React Native Expo SDK to surface native sign-in.
   */
  userInfo?: YouVersionUserInfoJSON | null;
}

interface YouVersionProviderPropsWithoutAuth extends YouVersionProviderPropsBase {
  includeAuth?: false;
  authRedirectUrl?: never;
}

const AuthProvider = lazy(() => import('./YouVersionAuthProvider'));

function useResolvedTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => {
    if (theme !== 'system') return theme;
    if (!globalThis.window) return 'light';
    return globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme !== 'system') {
      setResolved(theme);
      return;
    }

    if (!globalThis.window) return;

    const mediaQueryList = globalThis.window.matchMedia('(prefers-color-scheme: dark)');
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
  // Fail loudly on a missing/empty app key. Without this the SDK renders an
  // empty shell and only surfaces errors in the console — see YPE-1565. The UI
  // package's provider catches this earlier and renders a styled message
  // instead; this throw is the baseline guarantee for hooks-only consumers.
  //
  // The guard lives in this thin wrapper so the hook-bearing implementation is
  // never entered with an invalid key. Keeping the throw out of the component
  // that calls hooks avoids any hook-order inconsistency if a mounted provider
  // ever transitions between a valid and an empty appKey.
  if (!props.appKey?.trim()) {
    throw new Error(
      'YouVersionProvider: a non-empty "appKey" is required. If you load it from an ' +
        'environment variable, make sure it is set and restart your dev server.',
    );
  }

  return <YouVersionProviderInner {...props} />;
}

function YouVersionProviderInner(
  props: PropsWithChildren<YouVersionProviderPropsWithAuth | YouVersionProviderPropsWithoutAuth>,
): React.ReactElement {
  const {
    appKey,
    apiHost = 'api.youversion.com',
    includeAuth,
    theme = 'light',
    additionalHeaders,
    appName,
    signInPromptMessage,
    permittedVersionIds,
    excludedVersionIds,
    permittedLanguageTags,
    children,
  } = props;

  YouVersionPlatformConfiguration.permittedVersionIds = permittedVersionIds;
  YouVersionPlatformConfiguration.excludedVersionIds = excludedVersionIds;
  YouVersionPlatformConfiguration.permittedLanguageTags = permittedLanguageTags;

  const resolvedTheme = useResolvedTheme(theme);

  // This QueryClient is private.
  // `useApiData` uses this client.
  // Callers cannot read query keys or the cache.
  //
  // The initializer in `useState` runs once per instance.
  // `useMemo` does not give that guarantee.
  // If a module holds the client, SSR requests share one cache.
  // Concurrent renderers also share that cache.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Hooks show the error on the first failure.
            // TanStack Query retries three times by default.
            // Those retries delay the error.
            // The reason is in `docs/adr/0006`.
            retry: false,
            // Hooks always attempt the request and report a transport
            // failure through `error`.
            // TanStack Query pauses a fetch by default when the browser
            // reports that it is offline.
            // A paused first load stays `loading: true` and never settles.
            // A paused fetch after a key change shows the previous key's
            // data as if it belonged to the new key.
            networkMode: 'always',
            // Returning to the tab costs no request.
            // TanStack Query revalidates every mounted query on focus by
            // default, and a reader holds several at once.
            // Most reads are Bible content, which does not change while the
            // reader is open.
            // Mounting, a key change, and `refetch` all still revalidate, so
            // data stays fresh at the points that matter.
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // Stable identity so memoized consumers (hooks that build ApiClient) don't
  // rebuild when the parent re-renders with an inline object literal. Sort
  // entries before serialising so key-insertion-order differences don't
  // invalidate the memo for headers that are semantically identical.
  const additionalHeadersKey = serializeAdditionalHeaders(additionalHeaders);
  const stableAdditionalHeaders = useMemo(
    () => additionalHeaders,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [additionalHeadersKey],
  );

  // Sync props to YouVersionPlatformConfiguration so any code that reads the
  // static config (e.g. core's auth/PKCE flows, called from user actions) sees
  // the same values. Children that read via context get the prop directly
  // below, so they don't depend on this effect having run yet.
  useEffect(() => {
    YouVersionPlatformConfiguration.appKey = appKey;
    YouVersionPlatformConfiguration.apiHost = apiHost;
    YouVersionPlatformConfiguration.appName = appName;
    YouVersionPlatformConfiguration.signInPromptMessage = signInPromptMessage;
  }, [appKey, apiHost, appName, signInPromptMessage]);

  const contextValue = {
    appKey,
    apiHost,
    installationId: YouVersionPlatformConfiguration.installationId,
    theme: resolvedTheme,
    authEnabled: !!includeAuth,
    additionalHeaders: stableAdditionalHeaders,
    additionalHeadersKey,
  };

  if (includeAuth) {
    return (
      <YouVersionContext.Provider value={contextValue}>
        <QueryClientProvider client={queryClient}>
          <Suspense>
            <AuthProvider
              config={{ appKey, apiHost, redirectUri: props.authRedirectUrl }}
              userInfo={props.userInfo}
            >
              {children}
            </AuthProvider>
          </Suspense>
        </QueryClientProvider>
      </YouVersionContext.Provider>
    );
  }

  return (
    <YouVersionContext.Provider value={contextValue}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </YouVersionContext.Provider>
  );
}
