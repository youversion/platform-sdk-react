import React from 'react';
import { Button } from '@/components/ui/button';
import { Votd } from '@/components/icons/votd';
import { Share } from '@/components/icons/share';
import { BibleAppLogoLockup } from '@/components/bible-app-logo-lockup';
import { cn } from '@/lib/utils';
import { Verse } from '@/components/verse';
import {
  useVerseOfTheDay,
  usePassage,
  getDayOfYear,
  useVersion,
} from '@youversion/platform-react-hooks';

export type VerseOfTheDayProps = {
  /**
   * The Bible Translation version id to use, defaults to 1 (KJV).
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
        ...(url ? { url } : {}),
        ...(title ? { title } : {}),
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
 *   versionId={1}
 *   showSunIcon={true}
 *   showShareButton={false}
 *   showBibleAppAttribution={true}
 *   size={size}
 * />
 * ```
 */
export function VerseOfTheDay({
  dayOfYear,
  versionId = 1, // KJV by default
  showSunIcon = true,
  showShareButton = true,
  showBibleAppAttribution = true,
  size = 'default',
}: VerseOfTheDayProps): React.ReactElement {
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

  let referenceText = '';
  if (loadingPassage || loadingVerseOfTheDay || loadingVersion) {
    referenceText = 'Loading...';
  } else if (errorPassage || errorVerseOfTheDay) {
    referenceText = 'Error loading verse';
  } else if (passage?.human_reference && version?.local_abbreviation) {
    referenceText = `${passage?.human_reference} ${version?.local_abbreviation}`;
  } else if (passage?.human_reference) {
    referenceText = passage?.human_reference;
  } else {
    referenceText = 'No verse found';
  }

  const handleShareVerse = async () => {
    if (verseRef.current) {
      const text = verseRef.current.innerText + '\n\n' + referenceText;
      await share({ text });
    }
  };

  return (
    <section
      data-size={size}
      className={
        'yv:data-[size=lg]:p-8 yv:data-[size=default]:p-4 yv:*:shrink-0 yv:font-sans yv:flex yv:flex-col yv:gap-3 yv:max-w-screen-sm yv:p-4 yv:shadow yv:rounded-2xl'
      }
    >
      <div className="yv:flex yv:items-center yv:gap-2">
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
            Verse of The Day
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
              onClick={void handleShareVerse}
              size="icon"
              variant="ghost"
            >
              <Share className="yv:h-6! yv:w-6!" />
            </Button>
          </div>
        ) : null}
      </div>

      <div>
        {passage ? (
          <Verse.Html
            ref={verseRef}
            fontSize={size === 'default' ? 16 : 20}
            fontFamily={size === 'default' ? 'var(--yv-font-sans)' : 'var(--yv-font-serif)'}
            html={passage?.content || ''}
          />
        ) : null}
      </div>

      <p className="yv:text-(--yv-gray-30) yv:font-medium yv:text-sm">{referenceText}</p>

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
  );
}
