'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { YouVersionContext } from './YouVersionContext';
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
   * Allowlist of Bible version ids the SDK offers in its lists. `undefined` is
   * unrestricted; an **empty array permits nothing**. ANDed with
   * {@link YouVersionProviderPropsBase.permittedLanguageTags}.
   *
   * Synced onto `YouVersionPlatformConfiguration.permittedVersionIds`, which
   * `getVersions`/`getLanguages` read at fetch time. Set-at-init: changing this
   * mid-session affects future fetches only — lists already fetched are not
   * re-filtered. Filters never block fetching or rendering a version by id.
   */
  permittedVersionIds?: number[];
  /**
   * Denylist of Bible version ids. Exclusion is checked first and beats
   * permission: a version named in both lists is excluded.
   *
   * Synced onto `YouVersionPlatformConfiguration.excludedVersionIds`; same
   * set-at-init caveat as `permittedVersionIds`.
   */
  excludedVersionIds?: number[];
  /**
   * Allowlist of BCP-47 language tags. `undefined` is unrestricted; an **empty
   * array permits nothing**. ANDed with
   * {@link YouVersionProviderPropsBase.permittedVersionIds}.
   *
   * Synced onto `YouVersionPlatformConfiguration.permittedLanguageTags`; same
   * set-at-init caveat as `permittedVersionIds`.
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

  const resolvedTheme = useResolvedTheme(theme);

  // Stable identity so memoized consumers (hooks that build ApiClient) don't
  // rebuild when the parent re-renders with an inline object literal. Sort
  // entries before serialising so key-insertion-order differences don't
  // invalidate the memo for headers that are semantically identical.
  const additionalHeadersKey = additionalHeaders
    ? JSON.stringify(Object.entries(additionalHeaders).sort(([a], [b]) => a.localeCompare(b)))
    : null;
  const stableAdditionalHeaders = useMemo(
    () => additionalHeaders,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [additionalHeadersKey],
  );

  // The version filters are the one part of the config that has to be in place
  // *before* children render or fetch: core's list clients read it while
  // building a request (`getVersions` adds the fields the predicate keys off
  // back into a caller's projection), and children fetch from their own
  // effects, which React runs before the parent's. Syncing these in an effect
  // would leave the first fetch after a mount building against an unset
  // config. Assign during render instead — plain idempotent writes to a
  // singleton, no cleanup, and the parent renders before any child.
  YouVersionPlatformConfiguration.permittedVersionIds = permittedVersionIds;
  YouVersionPlatformConfiguration.excludedVersionIds = excludedVersionIds;
  YouVersionPlatformConfiguration.permittedLanguageTags = permittedLanguageTags;

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
  };

  if (includeAuth) {
    return (
      <YouVersionContext.Provider value={contextValue}>
        <Suspense>
          <AuthProvider
            config={{ appKey, apiHost, redirectUri: props.authRedirectUrl }}
            userInfo={props.userInfo}
          >
            {children}
          </AuthProvider>
        </Suspense>
      </YouVersionContext.Provider>
    );
  }

  return <YouVersionContext.Provider value={contextValue}>{children}</YouVersionContext.Provider>;
}
