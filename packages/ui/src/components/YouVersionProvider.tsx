'use client';

import React, { type ComponentProps, Suspense, useEffect, useLayoutEffect } from 'react';
import { YouVersionProvider as BaseYouVersionProvider } from '@youversion/platform-react-hooks';
import { requestSdkLanguage } from '@/i18n/pending-locale';
import { YvStyles } from '@/lib/yv-styles-chrome';
import { YvFonts } from '@/lib/yv-fonts';
import { MissingAppKey } from '@/components/missing-app-key';

function resolveTheme(theme: 'light' | 'dark' | 'system' = 'light'): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (!globalThis.window) return 'light';
  return globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export type YouVersionProviderProps = ComponentProps<typeof BaseYouVersionProvider> & {
  /**
   * BCP-47 tag for SDK UI strings and the `Accept-Language` header on API
   * calls. When omitted, UI language follows the browser and API language
   * stays the server default unless the host sets `Accept-Language` in
   * `additionalHeaders`.
   *
   * This is app locale, not Bible translation language. Seed the version
   * picker with `defaultLanguageId` on `BibleReader.Root` instead of mapping
   * `locale` to a Bible language.
   */
  locale?: string;
};

export function YouVersionProvider({
  locale,
  additionalHeaders,
  ...props
}: YouVersionProviderProps): React.ReactElement {
  const normalizedLocale = locale?.trim() || undefined;

  // Record the locale without importing i18next or locale JSON. A translating
  // child loads catalogs. Kick off an explicit locale during render so that
  // import can start before paint. The first HTML may still be English until
  // the catalog resolves. When locale is omitted, wait for the layout effect
  // so SSR stays on the English fallback.
  if (normalizedLocale) {
    requestSdkLanguage(normalizedLocale);
  }

  useLayoutEffect(() => {
    requestSdkLanguage(normalizedLocale);
  }, [normalizedLocale]);

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
        <MissingAppKey locale={normalizedLocale} theme={resolveTheme(props.theme)} />
      </>
    );
  }

  let mergedHeaders = additionalHeaders;
  if (normalizedLocale) {
    const hostSetsAcceptLanguage = Object.keys(additionalHeaders ?? {}).some(
      (key) => key.toLowerCase() === 'accept-language',
    );
    if (!hostSetsAcceptLanguage) {
      mergedHeaders = { 'Accept-Language': normalizedLocale, ...additionalHeaders };
    }
  }

  return (
    <BaseYouVersionProvider {...props} additionalHeaders={mergedHeaders}>
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
