'use client';

import React from 'react';
import { ExclamationCircle } from '@/components/icons/exclamation-circle';
import { getBrowserLanguages, resolveBrowserLanguage } from '@/i18n/detectLanguage';
import { providerStringLngs, providerStrings } from '@/i18n/provider-strings.generated';

function providerLocale(locale?: string): keyof typeof providerStrings {
  const lng = resolveBrowserLanguage(
    locale ? [locale] : getBrowserLanguages(),
    providerStringLngs,
    'en',
  );
  if (lng in providerStrings) {
    // SAFETY: `in` checked lng against the generated provider string map.
    return lng as keyof typeof providerStrings;
  }
  return 'en';
}

/**
 * Styled panel shown by {@link YouVersionProvider} when no (or an empty)
 * `appKey` is supplied. Replaces the provider's children so a misconfigured app
 * surfaces an actionable message instead of a blank page.
 */
export function MissingAppKey({
  theme = 'light',
  locale,
}: {
  theme?: 'light' | 'dark';
  locale?: string;
}): React.ReactElement {
  const strings = providerStrings[providerLocale(locale)];

  return (
    <div
      data-yv-sdk
      data-yv-theme={theme}
      role="alert"
      className="yv:flex yv:items-start yv:gap-2.5 yv:p-4 yv:bg-background yv:text-foreground"
    >
      <ExclamationCircle className="yv:size-5 yv:shrink-0 yv:text-foreground" aria-hidden="true" />
      <div className="yv:flex yv:flex-col yv:gap-1">
        <p className="yv:m-0 yv:text-sm yv:font-semibold yv:leading-tight">
          {strings.errorHeading}
        </p>
        <p className="yv:m-0 yv:text-[13px] yv:font-medium yv:leading-snug yv:text-muted-foreground">
          {strings.invalidAppKeyError}
        </p>
      </div>
    </div>
  );
}
