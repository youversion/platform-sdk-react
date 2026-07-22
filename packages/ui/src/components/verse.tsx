'use client';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
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
import { getBibleTextErrorMessage } from '@/lib/bible-text-error';
import { cn } from '@/lib/utils';
import { type FontFamily } from '@/lib/verse-html-utils';

import { transformBibleHtml } from '@youversion/platform-core/browser';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

function getFootnoteMarker(index: number): string {
  const base = LETTERS.length;
  if (base === 0) return String(index + 1);
  let value = index;
  let marker = '';
  do {
    marker = LETTERS[value % base] + marker;
    value = Math.floor(value / base) - 1;
  } while (value >= 0);
  return marker;
}

export type FootnoteData = {
  verseNum: string;
  notes: string[];
  verseHtml: string;
  reference?: string;
};

export type FootnoteContentProps = FootnoteData & {
  fontSize?: number;
  theme?: 'light' | 'dark';
  hasVerseContext?: boolean;
};

export function FootnoteContent({
  verseNum,
  notes,
  verseHtml,
  reference,
  fontSize,
  theme,
  hasVerseContext,
}: FootnoteContentProps): React.ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const verseReference = reference ? `${reference}:${verseNum}` : t('verseLabel', { verseNum });
  const showVerseContext = hasVerseContext ?? verseHtml.length > 0;

  return (
    <div data-yv-sdk data-yv-theme={theme}>
      <div className="yv:p-3 yv:overflow-y-auto yv:bg-background yv:text-foreground">
        {showVerseContext && (
          <>
            <div className="yv:font-bold yv:mb-2">{verseReference}</div>
            <div
              className="yv:mb-3 yv:font-serif yv:*:font-serif"
              style={{ fontSize: fontSize ? `${fontSize}px` : '1.25rem' }}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Bible footnote HTML comes from our YouVersion APIs and is safe
              dangerouslySetInnerHTML={{ __html: verseHtml }}
            />
          </>
        )}
        <ul className="yv:list-none yv:p-0 yv:m-0 yv:space-y-1">
          {notes.map((note, index) => {
            const marker = getFootnoteMarker(index);
            return (
              <li
                key={marker}
                className="yv:flex yv:gap-2 yv:text-xs yv:border-b yv:border-border yv:py-2"
              >
                <span>{marker}.</span>
                {/** biome-ignore lint/security/noDangerouslySetInnerHtml: Bible footnote HTML comes from our YouVersion APIs and is safe */}
                <span dangerouslySetInnerHTML={{ __html: note }} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type VerseFootnoteData = {
  verseNum: string;
  el: Element;
  notes: string[];
  verseHtml: string;
  hasVerseContext: boolean;
};

type PassageResult = ReturnType<typeof usePassage>;

export type BibleTextViewPassageState = {
  passage: PassageResult['passage'];
  loading: PassageResult['loading'];
  error: PassageResult['error'];
};

/**
 * Builds verse HTML for the footnote popover by cloning verse wrappers from the live DOM.
 * Strips headings and verse labels, replaces footnote anchors with superscript markers.
 */
function getVerseHtmlFromDom(container: HTMLElement, verseNum: string): string {
  const wrappers = container.querySelectorAll(`.yv-v[v="${verseNum}"]`);
  if (!wrappers.length) return '';

  const parts: string[] = [];
  let noteIdx = 0;

  wrappers.forEach((wrapper, i) => {
    if (i > 0) parts.push(' ');
    const clone = wrapper.cloneNode(true) as Element;
    clone.querySelectorAll('.yv-h, .yv-vlbl').forEach((el) => el.remove());
    clone.querySelectorAll('[data-verse-footnote]').forEach((anchor) => {
      const sup = wrapper.ownerDocument.createElement('sup');
      sup.className = 'yv:text-muted-foreground';
      sup.textContent = getFootnoteMarker(noteIdx++);
      anchor.replaceWith(sup);
    });
    parts.push(clone.innerHTML);
  });

  return parts.join('');
}

/**
 * Verse highlight fill opacity, matched to the Swift SDK (cross-SDK parity is the
 * UX baseline). Light mode paints the highlight hex at full strength; dark mode
 * fades it so the fill sits behind the text without overpowering it. See
 * `docs/adr/YPE-642-verse-action-popover.md` (ADR-005 as-built).
 */
const HIGHLIGHT_FILL_OPACITY_LIGHT = 1.0;
const HIGHLIGHT_FILL_OPACITY_DARK = 0.3;

/** Verse-number label color over a dark-mode highlight fill, for legibility (Swift parity). */
const HIGHLIGHT_DARK_LABEL_COLOR = '#ffffff';

/** Converts a 6-digit hex (no `#`) to an `rgba()` string at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Extracts clean prose for a verse from the rendered DOM: concatenates every
 * `.yv-v[v="N"]` wrapper (a verse can span multiple, e.g. poetry) with verse
 * numbers (`.yv-vlbl`), headings (`.yv-h`), and footnote markers
 * (`[data-verse-footnote]`) stripped. Used to build Copy / Share text.
 */
export function getCleanVerseText(container: HTMLElement, verseNum: number): string {
  const wrappers = container.querySelectorAll(`.yv-v[v="${verseNum}"]`);
  if (!wrappers.length) return '';

  const parts: string[] = [];
  wrappers.forEach((wrapper) => {
    const clone = wrapper.cloneNode(true) as Element;
    clone.querySelectorAll('.yv-h, .yv-vlbl, [data-verse-footnote]').forEach((el) => el.remove());
    const text = (clone.textContent || '').trim();
    if (text) parts.push(text);
  });

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

const VerseFootnoteButton = memo(function VerseFootnoteButton({
  verseNum,
  notes,
  verseHtml,
  hasVerseContext,
  reference,
  fontSize,
  theme,
  onFootnotePress,
  isHighlighted,
}: {
  verseNum: string;
  notes: string[];
  verseHtml: string;
  hasVerseContext: boolean;
  reference?: string;
  fontSize?: number;
  theme: 'light' | 'dark';
  onFootnotePress?: (data: FootnoteData) => void;
  isHighlighted?: boolean;
}) {
  const { t } = useTranslation(undefined, { i18n });

  // On a highlight fill the default light-gray marker loses contrast
  const iconClassName = cn(
    'yv:inline-flex yv:align-middle yv:cursor-pointer yv:ml-1!',
    isHighlighted ? 'yv:text-muted-foreground' : 'yv:text-(--yv-gray-20)',
  );

  if (onFootnotePress) {
    return (
      <button
        aria-label={t('footnoteAriaLabel')}
        type="button"
        className={iconClassName}
        onClick={() => onFootnotePress({ verseNum, notes, verseHtml, reference })}
      >
        <Footnote className="yv:size-[1.5em]" />
      </button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger data-yv-sdk data-yv-theme={theme} asChild>
        <button aria-label={t('footnoteAriaLabel')} type="button" className={iconClassName}>
          <Footnote className="yv:size-[1.5em]" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="yv:flex yv:flex-col yv:bg-background yv:p-0 yv:sm:w-sm yv:overflow-none yv:rounded-2xl yv:border-0 yv:shadow-lg"
        heading={t('footnotesHeading')}
        theme={theme}
      >
        <div className="yv:max-h-[33svh] yv:overflow-y-auto">
          <FootnoteContent
            verseNum={verseNum}
            notes={notes}
            verseHtml={verseHtml}
            hasVerseContext={hasVerseContext}
            reference={reference}
            fontSize={fontSize}
            theme={theme}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
});

/**
 * Displays a verse-unavailable error message with a circular exclamation
 * icon and descriptive text.
 */
function VerseUnavailableMessage({ message }: { message: string }): React.ReactElement {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="yv:flex yv:items-center yv:justify-center yv:gap-2.5 yv:px-3 yv:py-2.5 yv:text-foreground"
    >
      <ExclamationCircle className="yv:size-5 yv:shrink-0 yv:text-foreground" />
      <p className="yv:m-0 yv:text-[13px] yv:font-medium yv:leading-tight">{message}</p>
    </div>
  );
}

function BibleTextHtml({
  html,
  reference,
  fontSize,
  theme,
  selectedVerses = [],
  onVerseSelect,
  highlightedVerses = {},
  onFootnotePress,
}: {
  html: string;
  reference?: string;
  fontSize?: number;
  theme?: 'light' | 'dark';
  selectedVerses?: number[];
  onVerseSelect?: (verses: number[]) => void;
  highlightedVerses?: Record<number, string>;
  onFootnotePress?: (data: FootnoteData) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [footnoteData, setFootnoteData] = useState<VerseFootnoteData[]>([]);
  const providerTheme = useTheme();
  const currentTheme = theme || providerTheme;

  // Set innerHTML and extract footnote data from the DOM.
  // Portals need stable element references, so we set innerHTML manually.
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    contentRef.current.innerHTML = html;

    const anchors = contentRef.current.querySelectorAll('[data-verse-footnote]');

    // First pass: collect all notes per verse key
    const notesByKey = new Map<string, string[]>();
    anchors.forEach((el) => {
      const verseNum = el.getAttribute('data-verse-footnote');
      if (!verseNum) return;
      const content = el.getAttribute('data-verse-footnote-content') || '';
      const existing = notesByKey.get(verseNum);
      if (existing) existing.push(content);
      else notesByKey.set(verseNum, [content]);
    });

    // Second pass: create one entry per anchor (each anchor gets its own portal)
    const result: VerseFootnoteData[] = [];
    anchors.forEach((el) => {
      const verseNum = el.getAttribute('data-verse-footnote');
      if (!verseNum) return;
      const allNotes = notesByKey.get(verseNum) || [];
      const hasVerseContext = el.closest('.yv-v[v]') !== null;
      const verseHtml = hasVerseContext ? getVerseHtmlFromDom(contentRef.current!, verseNum) : '';
      result.push({ verseNum, el, notes: allNotes, verseHtml, hasVerseContext });
    });
    setFootnoteData(result);
  }, [html]);

  // Toggle selection underline + paint highlight fills on verse wrappers.
  // A verse can map to multiple `.yv-v[v="N"]` wrappers; each is painted so the
  // highlight reads as one solid block across line/paragraph breaks.
  // Theme-aware fill opacity mirrors the Swift SDK: full strength in light mode,
  // faded in dark mode. In dark mode a highlighted verse's number label renders
  // white so it stays legible over the fill; both are cleared on removal.
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const isDark = currentTheme === 'dark';
    const fillOpacity = isDark ? HIGHLIGHT_FILL_OPACITY_DARK : HIGHLIGHT_FILL_OPACITY_LIGHT;
    contentRef.current.querySelectorAll('.yv-v[v]').forEach((el) => {
      const verseNum = parseInt(el.getAttribute('v') || '0', 10);
      el.classList.toggle('yv-v-selected', selectedVerses.includes(verseNum));
      const color = highlightedVerses[verseNum];
      const isHighlighted = Boolean(color);
      (el as HTMLElement).style.backgroundColor = color ? hexToRgba(color, fillOpacity) : '';
      // Mirror the backgroundColor clear: set white in dark mode when highlighted,
      // otherwise reset to '' so unhighlighted labels keep their inherited color.
      el.querySelectorAll('.yv-vlbl').forEach((label) => {
        (label as HTMLElement).style.color =
          isDark && isHighlighted ? HIGHLIGHT_DARK_LABEL_COLOR : '';
      });
    });
  }, [html, selectedVerses, highlightedVerses, currentTheme]);

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
      {footnoteData.map(({ verseNum, el, notes, verseHtml, hasVerseContext }, index) =>
        createPortal(
          <VerseFootnoteButton
            verseNum={verseNum}
            notes={notes}
            verseHtml={verseHtml}
            hasVerseContext={hasVerseContext}
            reference={reference}
            fontSize={fontSize}
            theme={currentTheme}
            onFootnotePress={onFootnotePress}
            isHighlighted={Boolean(highlightedVerses[Number(verseNum)])}
          />,
          el,
          `${verseNum}-${index}`,
        ),
      )}
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
  highlightedVerses?: Record<number, string>;
  onFootnotePress?: (data: FootnoteData) => void;
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
        onFootnotePress,
      }: VerseHtmlProps,
      ref,
    ): ReactNode => {
      // transformBibleHtml uses the browser's native DOMParser, which doesn't
      // exist during SSR. Return raw html on the server; the client-side
      // useLayoutEffect in BibleTextHtml will handle it after hydration.
      const transformedHtml = useMemo(
        () => (typeof window === 'undefined' ? html : transformBibleHtml(html).html),
        [html],
      );
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
            html={transformedHtml}
            reference={reference}
            fontSize={fontSize}
            theme={currentTheme}
            selectedVerses={selectedVerses}
            onVerseSelect={onVerseSelect}
            highlightedVerses={highlightedVerses}
            onFootnotePress={onFootnotePress}
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
  highlightedVerses?: Record<number, string>;
  passageState?: Partial<BibleTextViewPassageState>;
  onFootnotePress?: (data: FootnoteData) => void;
};

/**
 * A component that renders style Bible text.
 */
export const BibleTextView = forwardRef<HTMLDivElement, BibleTextViewProps>(
  (
    {
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
      onFootnotePress,
    },
    ref,
  ): React.ReactElement => {
    const { t } = useTranslation(undefined, { i18n });
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
        <div
          ref={ref}
          data-yv-sdk
          data-yv-theme={currentTheme}
          role="status"
          aria-label={t('loadingPassageAriaLabel')}
          className="yv:flex yv:grow yv:items-center yv:justify-center"
        >
          <LoaderIcon
            className="yv:size-4 yv:animate-spin yv:text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      );
    }

    if (currentError) {
      return (
        <div ref={ref} data-yv-sdk data-yv-theme={currentTheme}>
          <VerseUnavailableMessage message={getBibleTextErrorMessage(currentError, t)} />
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
          ref={ref}
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
          onFootnotePress={onFootnotePress}
        />
      </div>
    );
  },
);
