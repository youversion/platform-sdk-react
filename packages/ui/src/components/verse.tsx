'use client';

import { usePassage, useTheme } from '@youversion/platform-react-hooks';
import {
  forwardRef,
  memo,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { ExclamationCircle } from '@/components/icons/exclamation-circle';
import { Footnote } from '@/components/icons/footnote';
import { LoaderIcon } from '@/components/icons/loader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  type FontFamily,
  getFootnoteMarker,
  transformBibleHtml,
  type VerseNotes,
} from '@/lib/verse-html-utils';

type TransformedBibleHtml = {
  html: string;
  notes: Record<string, VerseNotes>;
};

type VerseFootnotePlaceholder = {
  verseNum: string;
  el: Element;
};

type PassageResult = ReturnType<typeof usePassage>;

export type BibleTextViewPassageState = {
  passage: PassageResult['passage'];
  loading: PassageResult['loading'];
  error: PassageResult['error'];
};

const VerseFootnoteButton = memo(function VerseFootnoteButton({
  verseNum,
  verseNotes,
  reference,
  fontSize,
  theme,
}: {
  verseNum: string;
  verseNotes: VerseNotes;
  reference?: string;
  fontSize?: number;
  theme: 'light' | 'dark';
}) {
  const { hasVerseContext } = verseNotes;
  const verseReference = reference ? `${reference}:${verseNum}` : `Verse ${verseNum}`;
  return (
    <Popover>
      <PopoverTrigger data-yv-sdk data-yv-theme={theme} asChild>
        <button
          type="button"
          className="yv:inline-flex yv:align-middle yv:cursor-pointer yv:ml-1! yv:text-(--yv-gray-20)"
        >
          <Footnote className="yv:size-[1.5em]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="yv:flex yv:flex-col yv:bg-background yv:p-0 yv:sm:w-sm yv:overflow-none yv:rounded-2xl yv:border-0 yv:shadow-lg"
        heading="Footnotes"
        theme={theme}
      >
        <div className="yv:p-3 yv:overflow-y-auto yv:max-h-[33svh]">
          {hasVerseContext && (
            <>
              <div className="yv:font-bold yv:mb-2">{verseReference}</div>
              <div
                className="yv:mb-3 yv:font-serif yv:*:font-serif"
                style={{ fontSize: fontSize ? `${fontSize}px` : '1.25rem' }}
                // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML has been run through DOMPurify and is safe
                dangerouslySetInnerHTML={{ __html: verseNotes.verseHtml }}
              />
            </>
          )}
          <ul className="yv:list-none yv:p-0 yv:m-0 yv:space-y-1">
            {verseNotes.notes.map((note, index) => {
              const marker = getFootnoteMarker(index);
              return (
                <li
                  key={marker}
                  className="yv:flex yv:gap-2 yv:text-xs yv:border-b yv:border-border yv:py-2"
                >
                  <span className="">{marker}.</span>
                  {/** biome-ignore lint/security/noDangerouslySetInnerHtml: HTML has been run through DOMPurify and is safe */}
                  <span dangerouslySetInnerHTML={{ __html: note }} />
                </li>
              );
            })}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
});

const VERSE_UNAVAILABLE_MESSAGE = 'Your previously selected Bible verse is unavailable.';

/**
 * Displays a verse-unavailable error message with a circular exclamation
 * icon and descriptive text.
 */
function VerseUnavailableMessage(): React.ReactElement {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="yv:flex yv:items-center yv:justify-center yv:gap-2.5 yv:px-3 yv:py-2.5 yv:text-foreground"
    >
      <ExclamationCircle className="yv:size-5 yv:shrink-0 yv:text-foreground" />
      <p className="yv:m-0 yv:text-[13px] yv:font-medium yv:leading-tight">
        {VERSE_UNAVAILABLE_MESSAGE}
      </p>
    </div>
  );
}

function BibleTextHtml({
  html,
  notes,
  reference,
  fontSize,
  theme,
  selectedVerses = [],
  onVerseSelect,
  highlightedVerses = {},
}: {
  html: string;
  notes: Record<string, VerseNotes>;
  reference?: string;
  fontSize?: number;
  theme?: 'light' | 'dark';
  selectedVerses?: number[];
  onVerseSelect?: (verses: number[]) => void;
  highlightedVerses?: Record<number, boolean>;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [placeholders, setPlaceholders] = useState<VerseFootnotePlaceholder[]>([]);
  const providerTheme = useTheme();
  const currentTheme = theme || providerTheme;

  // Set innerHTML manually so the DOM nodes persist across renders
  // (portals need stable element references).
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.innerHTML = html;

    const anchors = contentRef.current.querySelectorAll('[data-verse-footnote]');
    const result: VerseFootnotePlaceholder[] = [];
    anchors.forEach((el) => {
      const verseNum = el.getAttribute('data-verse-footnote');
      if (verseNum) result.push({ verseNum, el });
    });
    setPlaceholders(result);
  }, [html]);

  // Toggle selected/highlighted classes on verse wrappers.
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.querySelectorAll('.yv-v[v]').forEach((el) => {
      const verseNum = parseInt(el.getAttribute('v') || '0', 10);
      el.classList.toggle('yv-v-selected', selectedVerses.includes(verseNum));
      el.classList.toggle('yv-v-highlighted', !!highlightedVerses[verseNum]);
    });
  }, [html, selectedVerses, highlightedVerses]);

  // Not wrapped in useCallback — this component is not memoized, so the
  // handler always captures the latest selectedVerses via closure.
  const handleClick = onVerseSelect
    ? (e: React.MouseEvent<HTMLDivElement>) => {
        const verseEl = (e.target as HTMLElement).closest('.yv-v[v]');
        if (!verseEl) return;
        const verseNum = parseInt(verseEl.getAttribute('v') || '0', 10);
        if (!verseNum) return;
        const newSelected = selectedVerses.includes(verseNum)
          ? selectedVerses.filter((v) => v !== verseNum)
          : [...selectedVerses, verseNum].sort((a, b) => a - b);
        onVerseSelect(newSelected);
      }
    : undefined;

  return (
    <>
      <div ref={contentRef} onClick={handleClick} />
      {placeholders.map(({ verseNum, el }, index) => {
        const verseNotes = notes[verseNum];
        if (!verseNotes) return null;
        return createPortal(
          <VerseFootnoteButton
            verseNum={verseNum}
            verseNotes={verseNotes}
            reference={reference}
            fontSize={fontSize}
            theme={currentTheme}
          />,
          el,
          `${verseNum}-${index}`,
        );
      })}
    </>
  );
}

/**
 * Represents a single verse with its number, text, and optional size.
 */
type VerseProps = {
  /**
   * The reference of the verse.
   */
  number: number;
  /**
   * The text content of the verse.
   */
  text: string;
  /**
   * The visual size of the verse.
   */
  size?: 'default' | 'lg';
};

type VerseHtmlProps = {
  html: string;
  fontFamily?: FontFamily;
  fontSize?: number;
  lineHeight?: number;
  showVerseNumbers?: boolean;
  renderNotes?: boolean;
  reference?: string;
  theme?: 'light' | 'dark';
  selectedVerses?: number[];
  onVerseSelect?: (verses: number[]) => void;
  highlightedVerses?: Record<number, boolean>;
};

/**
 * Scripture text component.
 */
export const Verse = {
  /**
   * Renders a single verse with superscript number and text.
   *
   * @param props - The verse properties.
   * @param props.number - The verse number.
   * @param props.text - The verse text.
   * @param props.size - The size variant. Defaults to 'default'.
   * @returns The rendered verse element.
   */
  Text: ({ number, text, size = 'default' }: VerseProps): React.ReactElement => {
    if (size === 'lg') {
      return (
        <span className="yv:[&>p]:inline-block">
          <sup className="yv:text-muted-foreground yv:align-super yv:text-[0.6em]">{number}</sup>
          &nbsp;{/* This spacing is intentional */}
          <span className="yv:font-serif! yv:text-xl yv:text-primary">{text}</span>
          &nbsp;{/* This spacing is intentional */}
        </span>
      );
    }

    return (
      <span className="yv:[&>p]:inline-block">
        <sup className="yv:text-muted-foreground yv:align-super yv:text-[0.6em]">{number}</sup>
        &nbsp;{/* This spacing is intentional */}
        <span className="yv:text-primary">{text}</span>
        &nbsp;{/* This spacing is intentional */}
      </span>
    );
  },

  Html: forwardRef<HTMLDivElement, VerseHtmlProps>(
    (
      {
        html,
        fontFamily,
        fontSize,
        lineHeight,
        showVerseNumbers = true,
        renderNotes = true,
        reference,
        theme,
        selectedVerses,
        onVerseSelect,
        highlightedVerses,
      }: VerseHtmlProps,
      ref,
    ): ReactNode => {
      const transformedData = useMemo<TransformedBibleHtml>(() => transformBibleHtml(html), [html]);
      const providerTheme = useTheme();
      const currentTheme = theme || providerTheme;

      return (
        <section
          ref={ref}
          style={
            {
              ...(fontFamily ? { '--yv-reader-font-family': fontFamily } : {}),
              ...(fontSize ? { '--yv-reader-font-size': `${fontSize}px` } : {}),
              ...(lineHeight ? { '--yv-reader-line-height': lineHeight } : {}),
            } as React.CSSProperties
          }
          data-show-verse-numbers={showVerseNumbers}
          data-show-notes={renderNotes}
          data-slot="yv-bible-renderer"
          data-selectable={onVerseSelect ? 'true' : 'false'}
        >
          <BibleTextHtml
            html={transformedData.html}
            notes={transformedData.notes}
            reference={reference}
            fontSize={fontSize}
            theme={currentTheme}
            selectedVerses={selectedVerses}
            onVerseSelect={onVerseSelect}
            highlightedVerses={highlightedVerses}
          />
        </section>
      );
    },
  ),
};

export type BibleTextViewProps = {
  reference: string;
  fontFamily?: FontFamily;
  fontSize?: number;
  lineHeight?: number;
  versionId: number;
  showVerseNumbers?: boolean;
  renderNotes?: boolean;
  theme?: 'light' | 'dark';
  selectedVerses?: number[];
  onVerseSelect?: (verses: number[]) => void;
  highlightedVerses?: Record<number, boolean>;
  passageState?: Partial<BibleTextViewPassageState>;
};

/**
 * A component that renders style Bible text.
 */
export const BibleTextView = ({
  reference,
  fontFamily,
  fontSize,
  lineHeight,
  versionId,
  showVerseNumbers,
  renderNotes,
  theme,
  selectedVerses,
  onVerseSelect,
  highlightedVerses,
  passageState,
}: BibleTextViewProps): React.ReactElement => {
  const providerTheme = useTheme();
  const currentTheme = theme || providerTheme;

  const hasProvidedPassageState = passageState !== undefined;

  const {
    passage: fetchedPassage,
    loading: fetchedLoading,
    error: fetchedError,
  } = usePassage({
    versionId,
    usfm: reference,
    include_headings: true,
    include_notes: true,
    options: {
      enabled: !hasProvidedPassageState,
    },
  });

  const currentPassage = hasProvidedPassageState ? passageState?.passage : fetchedPassage;
  const currentLoading = hasProvidedPassageState
    ? (passageState?.loading ?? false)
    : fetchedLoading;
  const currentError = hasProvidedPassageState ? (passageState?.error ?? null) : fetchedError;

  if (currentLoading && !currentPassage) {
    return (
      <div data-yv-sdk data-yv-theme={currentTheme} role="status" aria-label="Loading passage">
        <LoaderIcon
          className="yv:size-3 yv:animate-spin yv:text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (currentError) {
    return (
      <div data-yv-sdk data-yv-theme={currentTheme}>
        <VerseUnavailableMessage />
      </div>
    );
  }

  return (
    <div
      data-yv-sdk
      data-yv-theme={currentTheme}
      className={cn(fetchedLoading || currentLoading ? 'yv:animate-pulse' : '')}
      aria-busy={currentLoading || undefined}
      style={currentLoading ? { pointerEvents: 'none' } : undefined}
    >
      <Verse.Html
        html={currentPassage?.content || ''}
        fontFamily={fontFamily}
        fontSize={fontSize}
        lineHeight={lineHeight}
        showVerseNumbers={showVerseNumbers}
        renderNotes={renderNotes}
        reference={currentPassage?.reference}
        theme={currentTheme}
        selectedVerses={selectedVerses}
        onVerseSelect={onVerseSelect}
        highlightedVerses={highlightedVerses}
      />
    </div>
  );
};
