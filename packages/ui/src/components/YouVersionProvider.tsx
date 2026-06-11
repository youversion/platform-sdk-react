import React, { type ComponentProps, useEffect } from 'react';
import { YouVersionProvider as BaseYouVersionProvider } from '@youversion/platform-react-hooks';
import { syncBrowserLanguageFromNavigator } from '@/i18n';
import { YvStyles } from '@/lib/yv-styles';
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

  // Guard against a missing/empty app key here (rather than letting the base
  // provider throw) so consumers of the UI package see a styled, actionable
  // message instead of a blank page. Hooks-only consumers still get a thrown
  // error from the base provider.
  if (!props.appKey?.trim()) {
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
      {props.children}
    </BaseYouVersionProvider>
  );
}
