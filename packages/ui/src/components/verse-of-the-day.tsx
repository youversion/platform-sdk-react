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
import { DEFAULT_LICENSE_FREE_BIBLE_VERSION, type Highlight } from '@youversion/platform-core';
import { cn } from '@/lib/utils';
import { filterHighlightsForPassage } from '@/lib/highlight-projection';
import { useHighlightsControlledLatch } from '@/lib/use-highlights-controlled-latch';

export type VerseOfTheDayShareData = {
  /** Full share body: verse text, blank line, then reference (same as Web Share `text`). */
  text: string;
  /** Human-readable reference line, e.g. "John 3:16 NIV". */
  reference: string;
  /** Verse body only (DOM `innerText`), without the reference line. */
  verseText: string;
  /** Optional deep link; not populated today. */
  url?: string;
};

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
   * When provided, called on share button click with serializable share data.
   * Suppresses the default Web Share API / clipboard flow. Use for React Native
   * or Expo DOM hosts that forward the payload across the native bridge.
   */
  onShare?: (data: VerseOfTheDayShareData) => void | Promise<void>;
  /**
   * The size of the card. Changing this will change the
   * size of the card and the font size of the text.
   */
  size?: 'default' | 'lg';
  /**
   * When provided (including `[]`), paints these highlights on Verse of the
   * Day (controlled mode, no fetch). Use for React Native or Expo DOM hosts
   * that already own highlight data — pass `[]` while loading or signed out
   * so the WebView does not fetch. Mode is latched at this component's first
   * mount, including while today's verse is still loading. Nothing paints
   * until today's passage is known; overlapping ranges are clipped to that
   * passage.
   *
   * Omit the prop for self-contained paint: when the user is signed
   * in, has granted the `highlights` permission, and highlights are live,
   * matching verses are fetched and painted. A first render of `undefined`
   * latches self-contained (fetch when eligible), not "never paint".
   */
  highlights?: Highlight[];
};

function clipHighlightsToPassage(
  highlights: Highlight[] | undefined,
  passageId: string | undefined,
): Highlight[] | undefined {
  if (highlights === undefined) {
    return undefined;
  }
  if (!passageId) {
    return [];
  }
  return filterHighlightsForPassage(highlights, passageId);
}

function buildVerseOfTheDayShareData(
  verseEl: HTMLElement,
  referenceText: string,
): VerseOfTheDayShareData {
  const verseText = verseEl.innerText;
  const text = referenceText ? `${verseText}\n\n${referenceText}` : verseText;
  return { text, reference: referenceText, verseText };
}

async function share({
  title,
  text,
  url,
  errorMessage,
}: {
  title?: string;
  text: string;
  url?: string;
  errorMessage: string;
}) {
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
      alert(errorMessage);
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
  onShare,
  size = 'default',
  highlights,
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

  // Latched at this component's first mount, not at BibleTextView's. VOTD
  // delays mounting the child until load finishes; latching only there would
  // treat a highlights array that arrived during load as "present on first
  // mount" and paint, which BibleReader.Root would ignore.
  const isHighlightsControlled = useHighlightsControlledLatch(highlights, 'VerseOfTheDay');
  const hostHighlights = isHighlightsControlled ? (highlights ?? []) : undefined;
  const clippedHighlights = clipHighlightsToPassage(hostHighlights, data?.passage_id);

  let referenceText = '';
  if (passage?.reference && version?.localized_abbreviation) {
    referenceText = `${passage?.reference} ${version?.localized_abbreviation}`;
  } else if (passage?.reference) {
    referenceText = passage?.reference;
  }

  const handleShareVerse = async () => {
    if (!verseRef.current) {
      return;
    }
    const shareData = buildVerseOfTheDayShareData(verseRef.current, referenceText);
    if (onShare) {
      try {
        await onShare(shareData);
      } catch {
        // Silently fail — mirror navigator.share dismiss/cancel in share()
      }
      return;
    }
    await share({ text: shareData.text, errorMessage: t('unableToShare') });
  };

  return (
    <section
      data-yv-sdk
      data-yv-theme={theme}
      data-size={size}
      className={
        'yv:data-[size=lg]:p-8 yv:data-[size=default]:p-4 yv:*:shrink-0 yv:font-sans yv:flex yv:flex-col yv:w-full yv:grow yv:p-4 yv:rounded-2xl yv:bg-card yv:box-border'
      }
    >
      <div className="yv:card-content yv:flex yv:flex-col yv:gap-3">
        <div className="yv:flex yv:items-center yv:gap-2 yv:text-black yv:dark:text-white">
          {showSunIcon ? (
            <div
              data-slot="card-icon"
              className="yv:col-start-1 yv:row-start-1 yv:self-start yv:justify-self-start"
            >
              <Votd className="yv:shrink-0 yv:h-10 yv:w-10" />
            </div>
          ) : null}
          <div className="yv:grow yv:flex yv:flex-col">
            <p
              className={
                'trim-both yv:line-clamp-1 yv:text-muted-foreground yv:uppercase yv:text-xs yv:font-medium yv:select-none'
              }
            >
              {t('verseOfTheDay')}
            </p>
            {referenceText && !errorPassage && !errorVerseOfTheDay ? (
              <p className="yv:text-black yv:dark:text-white yv:font-medium yv:text-sm">
                {referenceText}
              </p>
            ) : null}
          </div>
          {showShareButton ? (
            <div
              data-slot="card-action"
              className="yv:col-start-2 yv:row-span-2 yv:row-start-1 yv:self-start yv:justify-self-end"
            >
              <Button
                aria-label={t('shareAriaLabel')}
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
              aria-label={t('loadingVerseAriaLabel')}
            >
              <LoaderIcon
                className="yv:size-4 yv:animate-spin yv:text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          ) : (
            <BibleTextView
              ref={verseRef}
              theme={theme}
              reference={data?.passage_id || ''}
              versionId={versionId}
              fontSize={size === 'default' ? 16 : 20}
              fontFamily={size === 'default' ? 'var(--yv-font-sans)' : 'var(--yv-font-serif)'}
              showVerseNumbers={false}
              passageState={{
                passage,
                loading: isLoading,
                error: errorPassage || errorVerseOfTheDay || null,
              }}
              highlights={clippedHighlights}
            />
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
      </div>
    </section>
  );
}
