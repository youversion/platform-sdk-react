'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { ExclamationCircle } from '@/components/icons/exclamation-circle';

/**
 * Styled panel shown by {@link YouVersionProvider} when no (or an empty)
 * `appKey` is supplied. Replaces the provider's children so a misconfigured app
 * surfaces an actionable message instead of a blank page.
 */
export function MissingAppKey({
  theme = 'light',
}: {
  theme?: 'light' | 'dark';
}): React.ReactElement {
  const { t } = useTranslation(undefined, { i18n });

  return (
    <div
      data-yv-sdk
      data-yv-theme={theme}
      role="alert"
      className="yv:flex yv:items-start yv:gap-2.5 yv:p-4 yv:bg-background yv:text-foreground"
    >
      <ExclamationCircle className="yv:size-5 yv:shrink-0 yv:text-foreground" aria-hidden="true" />
      <div className="yv:flex yv:flex-col yv:gap-1">
        <p className="yv:m-0 yv:text-sm yv:font-semibold yv:leading-tight">{t('errorHeading')}</p>
        <p className="yv:m-0 yv:text-[13px] yv:font-medium yv:leading-snug yv:text-muted-foreground">
          {t('invalidAppKeyError')}
        </p>
      </div>
    </div>
  );
}
