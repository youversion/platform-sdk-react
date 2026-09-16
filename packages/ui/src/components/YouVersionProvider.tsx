'use client';

import React, { type ComponentProps, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { YouVersionProvider as BaseYouVersionProvider } from '@youversion/platform-react-hooks';
import { syncSdkLanguage } from '@/i18n';
import { InterfaceDirectionProvider, resolveInterfaceDirection } from '@/lib/direction';
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
  /**
   * Direction for SDK interface controls and their portaled surfaces. When
   * omitted, direction follows the resolved SDK UI locale, including browser
   * detection. Server rendering uses a deterministic LTR fallback.
   * Scripture direction remains controlled by each scripture surface.
   */
  direction?: 'ltr' | 'rtl';
};

export function YouVersionProvider({
  locale,
  direction,
  additionalHeaders,
  ...props
}: YouVersionProviderProps): React.ReactElement {
  const normalizedLocale = locale?.trim() || undefined;
  const [browserLocale, setBrowserLocale] = useState<string>();
  const interfaceDirection = resolveInterfaceDirection(
    direction,
    normalizedLocale ?? browserLocale,
  );

  // Layout effects never run during SSR. Apply an explicit locale during render
  // so children emit the host language in the server HTML and the first client
  // paint matches it. When locale is omitted, wait for the layout effect so SSR
  // stays on the English fallback instead of a request-time browser language.
  if (normalizedLocale) {
    void syncSdkLanguage(normalizedLocale);
  }

  useLayoutEffect(() => {
    let active = true;
    void syncSdkLanguage(normalizedLocale).then((resolvedLocale) => {
      if (active && !normalizedLocale) setBrowserLocale(resolvedLocale);
    });
    return () => {
      active = false;
    };
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
        <MissingAppKey theme={resolveTheme(props.theme)} direction={interfaceDirection} />
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
      <InterfaceDirectionProvider direction={interfaceDirection}>
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
      </InterfaceDirectionProvider>
    </BaseYouVersionProvider>
  );
}
