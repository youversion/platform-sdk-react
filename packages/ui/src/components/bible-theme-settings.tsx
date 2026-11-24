'use client';

import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useInterfaceDirection } from '@/lib/direction';
import { ShadowIsolationBoundary } from '@/lib/shadow-isolation';
import { cn } from '@/lib/utils';
import { INTER_FONT, UNTITLED_SERIF_FONT } from '@/lib/verse-html-utils';
import { YvComponentStyles } from '@/lib/yv-styles-components';
import { Button } from './ui/button';
import {
  BIBLE_READER_FONT,
  BIBLE_READER_SPACING,
  type BibleThemeSettingsContentProps,
} from './bible-reader-settings';

const MIN_FONT_SIZE = BIBLE_READER_FONT.MIN;
const MAX_FONT_SIZE = BIBLE_READER_FONT.MAX;

function lineSpacingButtonGapClass(lineSpacing: number): string {
  switch (lineSpacing) {
    case BIBLE_READER_SPACING.SM:
      return 'yv:gap-1';
    case BIBLE_READER_SPACING.LG:
      return 'yv:gap-2';
    default:
      return 'yv:gap-1.5';
  }
}

const INTER_FONT_NAME = 'Inter';
const UNTITLED_SERIF_FONT_NAME = 'Untitled Serif';

export function BibleThemeSettingsContent(props: BibleThemeSettingsContentProps): ReactElement {
  return (
    <ShadowIsolationBoundary theme={props.theme} shrinkableBlockHost>
      <BibleThemeSettingsBody {...props} />
    </ShadowIsolationBoundary>
  );
}

function BibleThemeSettingsBody({
  theme,
  fontSize,
  fontFamily,
  lineSpacing,
  onFontSelected,
  onFontIncreased,
  onFontDecreased,
  onChangeLineSpacing,
}: BibleThemeSettingsContentProps): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const interfaceDirection = useInterfaceDirection();
  return (
    <>
      <YvComponentStyles />
      <div
        data-yv-sdk
        data-yv-theme={theme}
        dir={interfaceDirection}
        className="yv:flex yv:[block-size:100%] yv:min-h-0 yv:flex-col yv:gap-4 yv:overflow-y-auto yv:p-4"
      >
        <div className="yv:flex yv:justify-between yv:items-stretch yv:gap-4">
          <div className="yv:flex yv:flex-1">
            <Button
              className="yv:flex-1 yv:text-xs yv:text-black yv:dark:text-muted-foreground yv:rounded-s-[8px] yv:rounded-e-none yv:border yv:border-white yv:dark:border-border yv:h-auto yv:py-2 yv:focus-visible:ring-inset"
              onClick={onFontDecreased}
              size="lg"
              variant="secondary"
              data-testid="decrease-font-size"
              disabled={fontSize <= MIN_FONT_SIZE}
              aria-disabled={fontSize <= MIN_FONT_SIZE}
              aria-label={t('decreaseFontSizeAriaLabel')}
            >
              A
            </Button>
            <Button
              className="yv:flex-1 yv:text-3xl yv:text-black yv:dark:text-muted-foreground yv:rounded-e-[8px] yv:rounded-s-none yv:border yv:border-white yv:dark:border-border yv:h-auto yv:py-2 yv:focus-visible:ring-inset"
              onClick={onFontIncreased}
              size="lg"
              variant="secondary"
              data-testid="increase-font-size"
              disabled={fontSize >= MAX_FONT_SIZE}
              aria-disabled={fontSize >= MAX_FONT_SIZE}
              aria-label={t('increaseFontSizeAriaLabel')}
            >
              A
            </Button>
          </div>
          <Button
            className="yv:h-auto yv:border yv:border-white yv:dark:border-border yv:rounded-[8px] yv:focus-visible:ring-inset"
            variant="secondary"
            data-testid="line-spacing"
            onClick={onChangeLineSpacing}
            aria-label={t('changeLineSpacingAriaLabel')}
          >
            <div className={cn('yv:flex yv:flex-col', lineSpacingButtonGapClass(lineSpacing))}>
              <span className="yv:h-0.5 yv:w-8 yv:bg-black yv:dark:bg-current"></span>
              <span className="yv:h-0.5 yv:w-8 yv:bg-black yv:dark:bg-current"></span>
              <span className="yv:h-0.5 yv:w-8 yv:bg-black yv:dark:bg-current"></span>
            </div>
          </Button>
        </div>

        <div className="yv:grid yv:grid-cols-2">
          <Button
            className={cn(
              'yv:group yv:dark:bg-muted yv:rounded-e-none yv:border-e-0.5 yv:dark:border-border yv:rounded-s-[8px] yv:h-auto yv:focus-visible:ring-inset',
              fontFamily === INTER_FONT
                ? 'yv:bg-primary yv:border-primary yv:dark:bg-inherit yv:text-primary-foreground yv:hover:text-primary-foreground yv:hover:bg-primary/80 yv:focus-visible:ring-primary-foreground'
                : '',
            )}
            onClick={() => onFontSelected(INTER_FONT)}
            variant="outline"
          >
            <div className="yv:flex yv:flex-col yv:w-full yv:items-start">
              <span
                className={cn(
                  'yv:text-xs yv:text-muted-foreground',
                  fontFamily === INTER_FONT
                    ? 'yv:text-muted yv:dark:text-muted-foreground yv:group-hover:text-muted'
                    : '',
                )}
              >
                {t('font')}
              </span>
              <span className="yv:sm:text-xl yv:text-base">{INTER_FONT_NAME}</span>
            </div>
          </Button>
          <Button
            className={cn(
              'yv:group yv:dark:bg-muted yv:border-s-0.5 yv:rounded-s-none yv:rounded-e-[8px] yv:h-auto yv:focus-visible:ring-inset',
              fontFamily === UNTITLED_SERIF_FONT
                ? 'yv:bg-primary yv:border-primary yv:dark:bg-inherit yv:text-primary-foreground yv:hover:text-primary-foreground yv:hover:bg-primary/80 yv:focus-visible:ring-primary-foreground'
                : '',
            )}
            onClick={() => onFontSelected(UNTITLED_SERIF_FONT)}
            variant="outline"
          >
            <div className="yv:flex yv:flex-col yv:w-full yv:items-start">
              <span
                className={cn(
                  'yv:text-xs yv:text-muted-foreground',
                  fontFamily === UNTITLED_SERIF_FONT
                    ? 'yv:text-muted yv:dark:text-muted-foreground yv:group-hover:text-muted'
                    : '',
                )}
              >
                {t('font')}
              </span>
              <span className="yv:sm:text-xl yv:text-base yv:font-serif">
                {UNTITLED_SERIF_FONT_NAME}
              </span>
            </div>
          </Button>
        </div>
      </div>
    </>
  );
}
