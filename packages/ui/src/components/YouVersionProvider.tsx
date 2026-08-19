import React, { type ComponentProps, Suspense, useEffect, useLayoutEffect } from 'react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { YouVersionProvider as BaseYouVersionProvider } from '@youversion/platform-react-hooks';
import { syncUiLanguage } from '@/i18n';
import { YvStyles } from '@/lib/yv-styles';
import { YvFonts } from '@/lib/yv-fonts';
import { MissingAppKey } from '@/components/missing-app-key';

export type YouVersionProviderProps = ComponentProps<typeof BaseYouVersionProvider> & {
  /**
   * Optional UI language (BCP-47 tag, e.g. `es` or `es-MX`). When set, bundled
   * copy such as the Verse of the Day heading uses this language instead of
   * `navigator.languages`. Hosts like the React Native Expo SDK pass their
   * provider locale through a WebView this way.
   */
  lng?: string;
};

function resolveTheme(theme: 'light' | 'dark' | 'system' = 'light'): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (!globalThis.window) return 'light';
  return globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function YouVersionProvider(props: YouVersionProviderProps): React.ReactElement {
  const { lng, ...baseProps } = props;

  useLayoutEffect(() => {
    syncUiLanguage(lng);
  }, [lng]);

  // UI tsup inlines `@youversion/platform-core`, so this singleton is a different
  // copy from the one hooks syncs. BibleReader reads appName / signInPromptMessage
  // from *this* copy — keep it in sync with the provider props.
  useEffect(() => {
    YouVersionPlatformConfiguration.appName = baseProps.appName;
    YouVersionPlatformConfiguration.signInPromptMessage = baseProps.signInPromptMessage;
  }, [baseProps.appName, baseProps.signInPromptMessage]);

  // Guard against a missing/empty app key here (rather than letting the base
  // provider throw) so consumers of the UI package see a styled message instead
  // of a blank page. The visible panel is intentionally generic; the actionable
  // fix (set the env var, restart the dev server) goes to console.error for the
  // developer. Hooks-only consumers still get a thrown error from the base
  // provider.
  const missingAppKey = !baseProps.appKey?.trim();

  // Log from an effect (not the render body) so the guidance is emitted once per
  // state change instead of on every re-render and twice under Strict Mode.
  useEffect(() => {
    if (missingAppKey) {
      console.error(
        'YouVersionProvider: a non-empty "appKey" is required. If you load it from an ' +
          'environment variable, make sure it is set and restart your dev server.',
      );
    }
  }, [missingAppKey]);

  if (missingAppKey) {
    return (
      <>
        <YvStyles />
        <MissingAppKey theme={resolveTheme(baseProps.theme)} />
      </>
    );
  }

  return (
    <BaseYouVersionProvider {...baseProps}>
      <YvStyles />
      {/* Only in this branch — the missing-app-key guard above has no key, and
          without a key the gated Fonts API request would 401.

          React suspends the component that renders a `precedence` stylesheet
          while it loads. The local boundary keeps that suspension scoped to the
          font link so it can't bubble to the consumer's nearest boundary above
          the provider and hold their tree during the Fonts API fetch. */}
      <Suspense fallback={null}>
        <YvFonts appKey={baseProps.appKey} apiHost={baseProps.apiHost} />
      </Suspense>
      {baseProps.children}
    </BaseYouVersionProvider>
  );
}
