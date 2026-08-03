import React, { type ComponentProps, Suspense, useEffect } from 'react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { YouVersionProvider as BaseYouVersionProvider } from '@youversion/platform-react-hooks';
import { syncBrowserLanguageFromNavigator } from '@/i18n';
import { YvStyles } from '@/lib/yv-styles';
import { YvFonts } from '@/lib/yv-fonts';
import { MissingAppKey } from '@/components/missing-app-key';

function resolveTheme(theme: 'light' | 'dark' | 'system' = 'light'): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function YouVersionProvider(
  props: ComponentProps<typeof BaseYouVersionProvider>,
): React.ReactElement {
  useEffect(() => {
    syncBrowserLanguageFromNavigator();
  }, []);

  // UI tsup inlines `@youversion/platform-core`, so this singleton is a different
  // copy from the one hooks syncs. BibleReader reads appName / signInPromptMessage
  // from *this* copy — keep it in sync with the provider props.
  useEffect(() => {
    YouVersionPlatformConfiguration.appName = props.appName;
    YouVersionPlatformConfiguration.signInPromptMessage = props.signInPromptMessage;
  }, [props.appName, props.signInPromptMessage]);

  // Guard against a missing/empty app key here (rather than letting the base
  // provider throw) so consumers of the UI package see a styled message instead
  // of a blank page. The visible panel is intentionally generic; the actionable
  // fix (set the env var, restart the dev server) goes to console.error for the
  // developer. Hooks-only consumers still get a thrown error from the base
  // provider.
  const missingAppKey = !props.appKey?.trim();

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
        <MissingAppKey theme={resolveTheme(props.theme)} />
      </>
    );
  }

  return (
    <BaseYouVersionProvider {...props}>
      <YvStyles />
      {/* Only in this branch — the missing-app-key guard above has no key, and
          without a key the gated Fonts API request would 401.

          React suspends the component that renders a `precedence` stylesheet
          while it loads. The local boundary keeps that suspension scoped to the
          font link so it can't bubble to the consumer's nearest boundary above
          the provider and hold their tree during the Fonts API fetch. */}
      <Suspense fallback={null}>
        <YvFonts appKey={props.appKey} apiHost={props.apiHost} />
      </Suspense>
      {props.children}
    </BaseYouVersionProvider>
  );
}
