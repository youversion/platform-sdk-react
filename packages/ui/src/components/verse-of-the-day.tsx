import {
  getDayOfYear,
  usePassage,
  useTheme,
  useVerseOfTheDay,
  useVersion,
} from '@youversion/platform-react-hooks';
import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { AnimatedHeight } from '@/components/animated-height';
import { BibleAppLogoLockup } from '@/components/bible-app-logo-lockup';
import { LoaderIcon } from '@/components/icons/loader';
import { Share } from '@/components/icons/share';
import { Votd } from '@/components/icons/votd';
import { Button } from '@/components/ui/button';
import { BibleTextView } from '@/components/verse';
import { DEFAULT_LICENSE_FREE_BIBLE_VERSION } from '@youversion/platform-core';
import { cn } from '@/lib/utils';
import { YvStyles } from '@/lib/yv-styles';

export type VerseOfTheDayProps = {
  /**
   * Sets the background color of the Verse Of the Day component.
   */
  background?: 'light' | 'dark';
  /**
   * The Bible version id to use, defaults to DEFAULT_LICENSE_FREE_BIBLE_VERSION.
   */
  versionId?: number;
  /**
   * The day of the year to use (1-366)
   */
  dayOfYear?: number;
  /**
   * Whether to show the sun icon.
   */
  showSunIcon?: boolean;
  /**
   * Whether to show the YouVersion Bible App attribution.
   */
  showBibleAppAttribution?: boolean;
  /**
   * Whether to show the share button.
   */
  showShareButton?: boolean;
  /**
   * The size of the card. Changing this will change the
   * size of the card and the font size of the text.
   */
  size?: 'default' | 'lg';
};

async function share({ title, text, url }: { title?: string; text: string; url?: string }) {
  if (navigator.share) {
    try {
      await navigator.share({
        text,
        url,
        title,
      });
    } catch {
      // Silently fail
    }
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {
      alert('Unable to share. Please try again.');
    });
  }
}

/**
 * A Verse of the Day card component with customizable options.
 *
 * @example
 * ```tsx
 * <VerseOfTheDay
 *   versionId={3034}
 *   showSunIcon={true}
 *   showShareButton={false}
 *   showBibleAppAttribution={true}
 *   size={size}
 * />
 * ```
 */
export function VerseOfTheDay({
  background,
  dayOfYear,
  versionId = DEFAULT_LICENSE_FREE_BIBLE_VERSION,
  showSunIcon = true,
  showShareButton = true,
  showBibleAppAttribution = true,
  size = 'default',
}: VerseOfTheDayProps): React.ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const day = React.useMemo(() => dayOfYear || getDayOfYear(new Date()), [dayOfYear]);
  const verseRef = React.useRef<HTMLDivElement>(null);
  const { data, loading: loadingVerseOfTheDay, error: errorVerseOfTheDay } = useVerseOfTheDay(day);
  const {
    passage,
    loading: loadingPassage,
    error: errorPassage,
  } = usePassage({
    versionId,
    usfm: data?.passage_id || '',
    options: {
      enabled: !loadingVerseOfTheDay && !errorVerseOfTheDay && !!data?.passage_id,
    },
  });
  const { version, loading: loadingVersion } = useVersion(versionId);
  const providerTheme = useTheme();
  const theme = background || providerTheme;

  const isLoading = loadingPassage || loadingVerseOfTheDay || loadingVersion;

  let referenceText = '';
  if (passage?.reference && version?.localized_abbreviation) {
    referenceText = `${passage?.reference} ${version?.localized_abbreviation}`;
  } else if (passage?.reference) {
    referenceText = passage?.reference;
  }

  const handleShareVerse = async () => {
    if (verseRef.current) {
      const text = verseRef.current.innerText + '\n\n' + referenceText;
      await share({ text });
    }
  };

  return (
    <>
      <YvStyles />
      <section
        data-yv-sdk
        data-yv-theme={theme}
        data-size={size}
        className={
          'yv:data-[size=lg]:p-8 yv:data-[size=default]:p-4 yv:*:shrink-0 yv:font-sans yv:flex yv:flex-col yv:gap-3 yv:w-full yv:grow yv:max-w-md yv:p-4 yv:rounded-2xl yv:bg-card'
        }
      >
        <div className="yv:flex yv:items-center yv:gap-2 yv:text-black yv:dark:text-white">
          {showSunIcon ? (
            <div
              data-slot="card-icon"
              className="yv:col-start-1 yv:row-start-1 yv:self-start yv:justify-self-start"
            >
              <Votd className="yv:shrink-0 yv:h-10 yv:w-10" />
            </div>
          ) : null}
          <div className="yv:grow yv:grid">
            <p
              className={
                'trim-both yv:line-clamp-1 yv:text-muted-foreground yv:uppercase yv:text-xs yv:font-medium yv:select-none'
              }
            >
              {t('verseOfTheDay')}
            </p>
          </div>
          {showShareButton ? (
            <div
              data-slot="card-action"
              className="yv:col-start-2 yv:row-span-2 yv:row-start-1 yv:self-start yv:justify-self-end"
            >
              <Button
                aria-label="Share"
                className={cn(size === 'lg' ? 'yv:translate-x-3' : 'yv:translate-x-2')}
                onClick={() => void handleShareVerse()}
                disabled={!!(errorPassage || errorVerseOfTheDay)}
                size="icon"
                variant="ghost"
              >
                <Share className="yv:h-6! yv:w-6!" />
              </Button>
            </div>
          ) : null}
        </div>

        <AnimatedHeight>
          {isLoading ? (
            <div
              className="yv:flex yv:justify-center yv:py-2"
              role="status"
              aria-label="Loading verse"
            >
              <LoaderIcon
                className="yv:size-4 yv:animate-spin yv:text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          ) : (
            <div className="yv:flex yv:flex-col yv:gap-2">
              <BibleTextView
                ref={verseRef}
                theme={theme}
                reference={data?.passage_id || ''}
                versionId={versionId}
                fontSize={size === 'default' ? 16 : 20}
                fontFamily={size === 'default' ? 'var(--yv-font-sans)' : 'var(--yv-font-serif)'}
                passageState={{
                  passage,
                  loading: isLoading,
                  error: errorPassage || errorVerseOfTheDay || null,
                }}
              />

              {errorPassage || errorVerseOfTheDay ? null : (
                <p className="yv:text-muted-foreground yv:font-medium yv:text-sm yv:mt-3">
                  {referenceText}
                </p>
              )}
            </div>
          )}
        </AnimatedHeight>

        {showBibleAppAttribution ? (
          <div
            className={
              'yv:grid yv:grid-cols-1 yv:mt-4 yv:justify-between yv:items-center yv:gap-2 yv:w-full'
            }
          >
            <BibleAppLogoLockup data-slot="attribution" className="yv:justify-self-end" />
          </div>
        ) : null}
      </section>
    </>
  );
}
