'use client';

import i18n from '@/i18n';
import { useDelayedLoading } from '@/lib/use-delayed-loading';
import { cn } from '@/lib/utils';
import { INTER_FONT, SOURCE_SERIF_FONT, type FontFamily } from '@/lib/verse-html-utils';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import type { BibleBook } from '@youversion/platform-core';
import { DEFAULT_LICENSE_FREE_BIBLE_VERSION, getAdjacentChapter } from '@youversion/platform-core';
import {
  useBooks,
  usePassage,
  useTheme,
  useVersion,
  useYVAuth,
  YouVersionContext,
} from '@youversion/platform-react-hooks';
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { BibleChapterPicker, type BibleChapterPickerPressData } from './bible-chapter-picker';
import { BibleVersionPicker, type BibleVersionPickerPressData } from './bible-version-picker';
import { ChevronLeftIcon } from './icons/chevron-left';
import { ChevronRightIcon } from './icons/chevron-right';
import { GearIcon } from './icons/gear';
import { InfoIcon } from './icons/info';
import { LoaderIcon } from './icons/loader';
import { PersonIcon } from './icons/person';
import { ProfileAvatar } from './profile-avatar';
import { Button } from './ui/button';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from './ui/popover';
import { useBibleReaderHighlights } from './use-bible-reader-highlights';
import { VerseActionPopover } from './verse-action-popover';
import { HighlightPermissionDialog } from './highlight-permission-dialog';
import { SignInDialog } from './sign-in-dialog';
import { BibleTextView, getCleanVerseText, type FootnoteData } from './verse';
import { buildVerseReference, buildVerseShareText, joinVerseTexts } from '@/lib/verse-share';
import { isHighlightsLive } from '@/lib/feature-flags';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';

type BibleReaderContextType = {
  book: string;
  chapter: string;
  versionId: number;
  setBook: React.Dispatch<React.SetStateAction<string>>;
  setChapter: React.Dispatch<React.SetStateAction<string>>;
  setVersionId: React.Dispatch<React.SetStateAction<number>>;
  booksData: BibleBook[];
  booksLoading: boolean;
  currentFontFamily: FontFamily;
  setCurrentFontFamily: React.Dispatch<React.SetStateAction<FontFamily>>;
  currentFontSize: number;
  setCurrentFontSize: React.Dispatch<React.SetStateAction<number>>;
  currentLineSpacing: number;
  setCurrentLineSpacing: React.Dispatch<React.SetStateAction<number>>;
  showVerseNumbers: boolean;
  background: 'light' | 'dark';
  onFootnotePress?: (data: FootnoteData) => void;
  onChapterPickerPress?: (data: BibleChapterPickerPressData) => void;
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
  onCopy?: (data: BibleReaderShareData) => void | Promise<void>;
  onShare?: (data: BibleReaderShareData) => void | Promise<void>;
};

/**
 * Serializable payload handed to the `onCopy` / `onShare` overrides. Mirrors
 * `VerseOfTheDayShareData` so React Native / Expo DOM hosts can forward verse
 * selections across the native bridge.
 */
export type BibleReaderShareData = {
  /** Full body: curly-quoted verse text, a blank line, then the reference. */
  text: string;
  /** Reference line only, e.g. `John 1:1-3 NIV`. */
  reference: string;
  /** Verse text only (no reference line), gaps joined with ` ... `. */
  verseText: string;
  /** Selected verse numbers, ascending and de-duplicated. */
  verses: number[];
  book: string;
  chapter: string;
  versionId: number;
};

const BibleReaderContext = createContext<BibleReaderContextType | null>(null);

function useBibleReaderContext() {
  const context = useContext(BibleReaderContext);
  if (!context) {
    throw new Error('BibleReader components must be used within BibleReader.Root');
  }
  return context;
}

export type RootProps = {
  book?: string;
  defaultBook?: string;
  onBookChange?: (book: string) => void;
  chapter?: string;
  defaultChapter?: string;
  onChapterChange?: (chapter: string) => void;
  versionId?: number;
  defaultVersionId?: number;
  onVersionChange?: (versionId: number) => void;
  fontSize?: number;
  defaultFontSize?: number;
  onFontSizeChange?: (fontSize: number) => void;
  fontFamily?: FontFamily;
  defaultFontFamily?: FontFamily;
  onFontFamilyChange?: (fontFamily: FontFamily) => void;
  lineSpacing?: number;
  defaultLineSpacing?: number;
  onChangeLineSpacing?: (size: number) => void;
  /**
   * @deprecated Use `defaultLineSpacing` (uncontrolled) or `lineSpacing` +
   * `onChangeLineSpacing` (controlled) instead. When provided, this is used as
   * the initial line spacing. Will be removed in the next major version.
   */
  lineHeight?: number;
  showVerseNumbers?: boolean;
  background?: 'light' | 'dark';
  onFootnotePress?: (data: FootnoteData) => void;
  onChapterPickerPress?: (data: BibleChapterPickerPressData) => void;
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
  /**
   * Called on Copy with the selection payload. When provided, suppresses the
   * default `navigator.clipboard` write — use for React Native / Expo hosts.
   */
  onCopy?: (data: BibleReaderShareData) => void | Promise<void>;
  /**
   * Called on Share with the selection payload. When provided, suppresses the
   * default Web Share / clipboard flow — use for React Native / Expo hosts.
   */
  onShare?: (data: BibleReaderShareData) => void | Promise<void>;
  children?: ReactNode;
};

export const BIBLE_READER_FONT = {
  MIN: 12,
  MAX: 20,
  DEFAULT: 16,
  STEP: 2,
} as const;

export const BIBLE_READER_SPACING = {
  SM: 1.45,
  DEFAULT: 1.7,
  LG: 2.0,
} as const;

const MIN_FONT_SIZE = BIBLE_READER_FONT.MIN;
const MAX_FONT_SIZE = BIBLE_READER_FONT.MAX;
const DEFAULT_FONT_SIZE = BIBLE_READER_FONT.DEFAULT;
const FONT_SIZE_STEP = BIBLE_READER_FONT.STEP;

export type BibleThemeSettingsValues = {
  fontSize: number;
  fontFamily: FontFamily;
  lineSpacing: number;
};

export type BibleThemeSettingsSnapshot = BibleThemeSettingsValues & {
  minFontSize: number;
  maxFontSize: number;
};

export type BibleThemeSettingsContentProps = {
  theme: 'light' | 'dark';
  fontSize: number;
  fontFamily: FontFamily;
  lineSpacing: number;
  onFontSelected: (fontFamily: FontFamily) => void;
  onFontIncreased: () => void;
  onFontDecreased: () => void;
  onChangeLineSpacing: () => void;
};

export function clampBibleReaderFontSize(fontSize: number): number {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSize));
}

function normalizeReaderFontSizeForInitialization(size: number): number {
  if (size > MAX_FONT_SIZE || size < MIN_FONT_SIZE) {
    return DEFAULT_FONT_SIZE;
  }
  return size;
}

export function nextBibleReaderFontSizeUp(current: number): number {
  return clampBibleReaderFontSize(current + FONT_SIZE_STEP);
}

export function nextBibleReaderFontSizeDown(current: number): number {
  return clampBibleReaderFontSize(current - FONT_SIZE_STEP);
}

export function changeBibleReaderLineSpacing(current: number): number {
  switch (current) {
    case BIBLE_READER_SPACING.DEFAULT:
      return BIBLE_READER_SPACING.LG;
    case BIBLE_READER_SPACING.LG:
      return BIBLE_READER_SPACING.SM;
    default:
      return BIBLE_READER_SPACING.DEFAULT;
  }
}

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

/**
 * Builds the three handler props for {@link BibleThemeSettingsContent} from host-owned font state.
 * Use this on the same side as `setFontSize` / `setFontFamily` (e.g. React Native before passing
 * **top-level** props into a `BibleThemeSettingsContent` Expo DOM wrapper). Expo allows functions as
 * top-level DOM props; do not nest these inside a {@link BibleThemeSettingsSnapshot}.
 */
export function createBibleThemeSettingsContentHandlers(options: {
  getFontSize: () => number;
  getFontFamily: () => FontFamily;
  setFontSize: (size: number) => void;
  setFontFamily: (fontFamily: FontFamily) => void;
  getLineSpacing: () => number;
  setLineSpacing: (size: number) => void;
}): Pick<
  BibleThemeSettingsContentProps,
  'onFontIncreased' | 'onFontDecreased' | 'onFontSelected' | 'onChangeLineSpacing'
> {
  return {
    onFontIncreased: () => {
      options.setFontSize(nextBibleReaderFontSizeUp(options.getFontSize()));
    },
    onFontDecreased: () => {
      options.setFontSize(nextBibleReaderFontSizeDown(options.getFontSize()));
    },
    onFontSelected: (fontFamily) => {
      options.setFontFamily(fontFamily);
    },
    onChangeLineSpacing: () => {
      options.setLineSpacing(changeBibleReaderLineSpacing(options.getLineSpacing()));
    },
  };
}

function Root({
  book: controlledBook,
  defaultBook = 'JHN',
  onBookChange,
  chapter: controlledChapter,
  defaultChapter = '1',
  onChapterChange,
  versionId: controlledVersionId,
  defaultVersionId = DEFAULT_LICENSE_FREE_BIBLE_VERSION,
  onVersionChange,
  fontSize: fontSizeProp,
  defaultFontSize = DEFAULT_FONT_SIZE,
  onFontSizeChange,
  fontFamily: fontFamilyProp,
  defaultFontFamily = SOURCE_SERIF_FONT,
  onFontFamilyChange,
  lineSpacing: lineSpacingProp,
  defaultLineSpacing,
  onChangeLineSpacing,
  lineHeight,
  showVerseNumbers = true,
  background,
  onFootnotePress,
  onChapterPickerPress,
  onVersionPickerPress,
  onSignInPress,
  onSignOutPress,
  onCopy,
  onShare,
  children,
}: RootProps) {
  const [book, setBook] = useControllableState({
    prop: controlledBook,
    defaultProp: defaultBook,
    onChange: onBookChange,
  });

  const [chapter, setChapter] = useControllableState({
    prop: controlledChapter,
    defaultProp: defaultChapter,
    onChange: onChapterChange,
  });

  const [versionId, setVersionId] = useControllableState({
    prop: controlledVersionId,
    defaultProp: defaultVersionId,
    onChange: onVersionChange,
  });

  const validatedDefaultFontSize =
    defaultFontSize > MAX_FONT_SIZE || defaultFontSize < MIN_FONT_SIZE
      ? DEFAULT_FONT_SIZE
      : defaultFontSize;

  const isFontSizeControlled = onFontSizeChange !== undefined;
  const isFontFamilyControlled = onFontFamilyChange !== undefined;
  const isLineSpacingControlled = onChangeLineSpacing !== undefined;

  const defaultPropFontSize = normalizeReaderFontSizeForInitialization(
    fontSizeProp ?? validatedDefaultFontSize,
  );

  const [currentFontSize, setCurrentFontSize] = useControllableState({
    prop: isFontSizeControlled ? fontSizeProp : undefined,
    defaultProp: defaultPropFontSize,
    onChange: onFontSizeChange,
  });

  const defaultPropFontFamily = fontFamilyProp ?? defaultFontFamily;

  const [currentFontFamily, setCurrentFontFamily] = useControllableState({
    prop: isFontFamilyControlled ? fontFamilyProp : undefined,
    defaultProp: defaultPropFontFamily,
    onChange: onFontFamilyChange,
  });

  const resolvedDefaultLineSpacing =
    defaultLineSpacing ?? lineHeight ?? BIBLE_READER_SPACING.DEFAULT;

  const [currentLineSpacing, setCurrentLineSpacing] = useControllableState({
    prop: isLineSpacingControlled ? lineSpacingProp : undefined,
    defaultProp: resolvedDefaultLineSpacing,
    onChange: onChangeLineSpacing,
  });

  const didHydrateThemeSettingsRef = useRef(false);

  useLayoutEffect(() => {
    if (didHydrateThemeSettingsRef.current) return;
    didHydrateThemeSettingsRef.current = true;

    if (!isFontSizeControlled) {
      const savedFontSize = localStorage.getItem('youversion-platform:reader:font-size');
      if (savedFontSize) {
        const parsed = parseInt(savedFontSize);
        if (parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
          setCurrentFontSize(parsed);
        }
      }
    }

    if (!isFontFamilyControlled) {
      const savedFontFamily = localStorage.getItem('youversion-platform:reader:font-family');
      if (savedFontFamily) {
        setCurrentFontFamily(savedFontFamily);
      }
    }

    if (!isLineSpacingControlled) {
      const savedLineSpacing = localStorage.getItem('youversion-platform:reader:line-spacing');
      if (savedLineSpacing) {
        const parsed = parseFloat(savedLineSpacing);
        if (Object.values(BIBLE_READER_SPACING).some((spacing) => spacing === parsed)) {
          setCurrentLineSpacing(parsed);
        }
      }
    }
  }, [
    isFontFamilyControlled,
    isFontSizeControlled,
    setCurrentFontFamily,
    setCurrentFontSize,
    isLineSpacingControlled,
    setCurrentLineSpacing,
  ]);

  useEffect(() => {
    if (!isFontSizeControlled) {
      localStorage.setItem('youversion-platform:reader:font-size', currentFontSize.toString());
    }
  }, [currentFontSize, isFontSizeControlled]);

  useEffect(() => {
    if (!isFontFamilyControlled) {
      localStorage.setItem('youversion-platform:reader:font-family', currentFontFamily);
    }
  }, [currentFontFamily, isFontFamilyControlled]);

  useEffect(() => {
    if (!isLineSpacingControlled) {
      localStorage.setItem(
        'youversion-platform:reader:line-spacing',
        currentLineSpacing.toString(),
      );
    }
  }, [currentLineSpacing, isLineSpacingControlled]);

  const providerTheme = useTheme();
  const theme = background || providerTheme;

  const { books, loading: booksLoading } = useBooks(versionId);
  const booksData = books?.data ?? [];

  const contextValue: BibleReaderContextType = {
    book,
    chapter,
    versionId,
    setBook,
    setChapter,
    setVersionId,
    booksData,
    booksLoading,
    currentFontFamily,
    setCurrentFontFamily,
    currentFontSize,
    setCurrentFontSize,
    currentLineSpacing,
    setCurrentLineSpacing,
    showVerseNumbers,
    background: theme,
    onFootnotePress,
    onChapterPickerPress,
    onVersionPickerPress,
    onSignInPress,
    onSignOutPress,
    onCopy,
    onShare,
  };

  return (
    <BibleReaderContext.Provider value={contextValue}>
      <div
        data-yv-sdk
        data-yv-theme={theme}
        className="yv:flex yv:flex-col yv:h-full yv:bg-background yv:text-foreground"
      >
        {children}
      </div>
    </BibleReaderContext.Provider>
  );
}

function Content() {
  const { t } = useTranslation(undefined, { i18n });
  const {
    background,
    book,
    chapter,
    versionId,
    booksData,
    currentFontSize,
    currentFontFamily,
    currentLineSpacing,
    showVerseNumbers,
    onFootnotePress,
    onCopy,
    onShare,
  } = useBibleReaderContext();
  const { version } = useVersion(versionId);

  const bookData = useMemo(() => {
    return booksData.find((b) => b.id === book);
  }, [booksData, book]);

  const usfmReference = `${book}.${chapter}`;

  // Check if the current chapter is available in this version
  const chapterUnavailable = useMemo(() => {
    if (!bookData || !chapter) return false;
    const inChapters = bookData.chapters?.some((ch) => ch.passage_id.split('.').pop() === chapter);
    const isIntro = bookData.intro?.id === chapter;
    return !inChapters && !isIntro;
  }, [bookData, chapter]);

  // Own the passage fetch here (instead of BibleTextView) to control the loading
  // treatment. Args mirror BibleTextView's internal fetch so the cache key matches.
  const {
    passage,
    loading: passageLoading,
    error: passageError,
  } = usePassage({
    versionId,
    usfm: usfmReference,
    include_headings: true,
    include_notes: true,
    options: { enabled: !chapterUnavailable },
  });

  const isRefetching = !chapterUnavailable && passageLoading && passage !== null;
  const showLoadingOverlay = useDelayedLoading(isRefetching);

  // Version-only changes intentionally preserve scroll position.
  const scrollContainerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [book, chapter]);

  // ---- Verse selection + highlights ------------------------------------------
  // Selection is ephemeral (ADR-007 in YPE-642). Highlights are server-only
  // account data (ADR-001 in YPE-1034): fetched and written through
  // useBibleReaderHighlights, dark-launched behind the internal HIGHLIGHTS_LIVE
  // flag. The reader DOM ref lets us anchor the popover and pull clean verse
  // text for Copy / Share.
  const readerRef = useRef<HTMLDivElement>(null);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const lastSelectionRef = useRef<number[]>([]);

  const {
    highlightedVerses,
    recentColors,
    apply: applyHighlight,
    remove: removeHighlight,
    permissionDialogOpen,
    onPermissionDialogOpenChange,
    confirmPermissionDialog,
    cancelPermissionDialog,
    signInDialogOpen,
    confirmSignInDialog,
    cancelSignInDialog,
  } = useBibleReaderHighlights({ versionId, book, chapter });

  // The color row / clear-highlight affordances only render when the highlights
  // feature is live (dark-launch flag). Copy / Share are always available.
  const highlightsEnabled = isHighlightsLive();
  // Copy shown to the sign-in dialog. Falls back to a neutral label when the
  // integrator hasn't set `YouVersionPlatformConfiguration.appName`.
  const signInAppName = YouVersionPlatformConfiguration.appName ?? 'This app';
  const signInPromptMessage = YouVersionPlatformConfiguration.signInPromptMessage;

  // Navigating away (book/chapter/version) drops the selection — those verses no
  // longer exist on screen (ADR-007).
  useEffect(() => {
    setSelectedVerses([]);
    setPopoverOpen(false);
    setAnchorElement(null);
    lastSelectionRef.current = [];
  }, [book, chapter, versionId]);

  // Distinct colors present in the current selection → drives the X (remove) circles.
  const activeHighlights = useMemo(
    () =>
      new Set(
        selectedVerses
          .map((verse) => highlightedVerses[verse])
          .filter((color): color is string => Boolean(color)),
      ),
    [selectedVerses, highlightedVerses],
  );

  function closeAndClearSelection() {
    setPopoverOpen(false);
    setSelectedVerses([]);
    setAnchorElement(null);
    lastSelectionRef.current = [];
  }

  function handleVerseSelect(verses: number[]) {
    const added = verses.find((verse) => !lastSelectionRef.current.includes(verse));
    lastSelectionRef.current = verses;
    setSelectedVerses(verses);

    if (verses.length === 0) {
      setPopoverOpen(false);
      setAnchorElement(null);
      return;
    }

    // Anchor to the most recently tapped verse (falls back to the last by number
    // when a verse was removed), using its final wrapper so the caret sits at the
    // verse's visual bottom.
    const anchorVerse = added ?? Math.max(...verses);
    const wrappers = readerRef.current?.querySelectorAll(`.yv-v[v="${anchorVerse}"]`);
    const anchor = wrappers?.[wrappers.length - 1];
    setAnchorElement(anchor instanceof HTMLElement ? anchor : null);
    setPopoverOpen(true);
  }

  function handleHighlight(color: string) {
    const outcome = applyHighlight(color, selectedVerses);
    // Entering the auth flow (sign-in redirect or the permission confirm dialog)
    // keeps the verse selection and popover intact so a cancel leaves the reader
    // exactly where it was (YPE-1034 decision 7). An immediate apply — or an
    // inert no-op — clears as before.
    if (outcome === 'flow') return;
    closeAndClearSelection();
  }

  function handleClearHighlight(color: string) {
    removeHighlight(color, selectedVerses);

    // Multiple colors active → keep open so the user can remove others (AC 8a);
    // last color removed → dismiss (AC 8). `highlightedVerses` still holds the
    // pre-removal snapshot here — the optimistic overlay lands next render.
    const hasRemaining = selectedVerses.some((verse) => {
      const current = highlightedVerses[verse];
      return current && current !== color;
    });
    if (!hasRemaining) closeAndClearSelection();
  }

  function buildSelectionShareData(): BibleReaderShareData | null {
    const container = readerRef.current;
    if (!container) return null;
    const textByVerse: Record<number, string> = {};
    for (const verse of selectedVerses) {
      textByVerse[verse] = getCleanVerseText(container, verse);
    }
    const bookName = bookData?.title ?? book;
    const versionAbbreviation = version?.localized_abbreviation ?? '';
    return {
      text: buildVerseShareText({
        verses: selectedVerses,
        textByVerse,
        bookName,
        chapter,
        versionAbbreviation,
      }),
      reference: buildVerseReference({
        bookName,
        chapter,
        verses: selectedVerses,
        versionAbbreviation,
      }),
      verseText: joinVerseTexts(selectedVerses, textByVerse),
      verses: [...new Set(selectedVerses)].sort((a, b) => a - b),
      book,
      chapter,
      versionId,
    };
  }

  function handleCopy() {
    const data = buildSelectionShareData();
    if (onCopy) {
      if (data) {
        void Promise.resolve(onCopy(data)).catch(() => {
          // Host rejected — mirror the silent failure of navigator.clipboard.
        });
      }
      closeAndClearSelection();
      return;
    }
    if (data?.text) void navigator.clipboard?.writeText(data.text);
    closeAndClearSelection();
  }

  function handleShare() {
    const data = buildSelectionShareData();
    if (onShare) {
      if (data) {
        void Promise.resolve(onShare(data)).catch(() => {
          // Host rejected or cancelled — mirror the silent navigator.share dismiss.
        });
      }
      closeAndClearSelection();
      return;
    }
    const text = data?.text ?? '';
    if (text && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      navigator
        .share({ text })
        .then(() => closeAndClearSelection())
        .catch(() => {
          // Cancelled or failed — keep the popover open (AC 4).
        });
      return;
    }
    // No Web Share support (e.g. most desktop browsers) — fall back to clipboard.
    if (text && typeof navigator !== 'undefined') {
      void navigator.clipboard?.writeText(text);
    }
    closeAndClearSelection();
  }

  function handlePopoverOpenChange(open: boolean) {
    if (open) {
      setPopoverOpen(true);
      return;
    }
    // Outside click / Escape closes and clears (ADR-007).
    closeAndClearSelection();
  }

  let chapterLabel: string = bookData?.chapters?.find((ch) => ch.id === chapter)?.title || chapter;
  if (bookData?.intro && chapter === bookData?.intro.id) {
    chapterLabel = bookData.intro.title;
  }

  return (
    <main
      ref={scrollContainerRef}
      className="yv:*:max-w-lg yv:flex yv:flex-col yv:items-center yv:gap-6 yv:overflow-y-auto yv:px-6 yv:max-sm:px-4 yv:py-12 yv:h-full"
    >
      <h1 className="yv:flex yv:gap-2 yv:flex-col yv:justify-center yv:items-center yv:text-muted-foreground yv:font-medium">
        <span
          className={cn(
            'yv:font-serif yv:leading-none yv:block yv:text-2xl yv:transition-[filter]',
          )}
        >
          {bookData?.title || (
            <LoaderIcon className="yv:size-6 yv:animate-spin yv:text-muted-foreground" />
          )}
        </span>
        <span className="yv:font-serif yv:leading-none yv:block yv:text-[2.5rem] yv:font-normal yv:tabular-nums">
          {chapterLabel || chapter || '-'}
        </span>
      </h1>

      {chapterUnavailable ? (
        <p className="yv:text-center yv:text-balance yv:text-muted-foreground">
          {t('chapterUnavailable')}
        </p>
      ) : (
        <div className="yv:relative yv:w-full">
          <div
            className={cn(
              'yv:transition-opacity yv:duration-150 yv:motion-reduce:transition-none',
              showLoadingOverlay ? 'yv:opacity-40' : 'yv:opacity-100',
            )}
          >
            <BibleTextView
              ref={readerRef}
              reference={usfmReference}
              versionId={versionId}
              fontFamily={currentFontFamily}
              fontSize={currentFontSize}
              lineHeight={currentLineSpacing}
              showVerseNumbers={showVerseNumbers}
              theme={background}
              onFootnotePress={onFootnotePress}
              selectedVerses={selectedVerses}
              onVerseSelect={handleVerseSelect}
              highlightedVerses={highlightedVerses}
              passageState={{
                passage,
                loading: isRefetching ? false : passageLoading,
                error: passageError,
              }}
            />
          </div>

          <VerseActionPopover
            open={popoverOpen && selectedVerses.length > 0}
            onOpenChange={handlePopoverOpenChange}
            activeHighlights={activeHighlights}
            selectedVerses={selectedVerses}
            highlightedVerses={highlightedVerses}
            recentColors={recentColors}
            highlightsEnabled={highlightsEnabled}
            anchorElement={anchorElement}
            scrollRoot={scrollContainerRef.current}
            onHighlight={handleHighlight}
            onClearHighlight={handleClearHighlight}
            onCopy={handleCopy}
            onShare={handleShare}
            theme={background}
          />

          <HighlightPermissionDialog
            open={permissionDialogOpen}
            onOpenChange={onPermissionDialogOpenChange}
            onConfirm={confirmPermissionDialog}
            onCancel={cancelPermissionDialog}
            theme={background}
          />

          <SignInDialog
            open={signInDialogOpen}
            onOpenChange={(open) => {
              if (!open) cancelSignInDialog();
            }}
            appName={signInAppName}
            promptMessage={signInPromptMessage}
            onConfirm={confirmSignInDialog}
            onDecline={cancelSignInDialog}
            theme={background}
          />

          {showLoadingOverlay ? (
            <div
              role="status"
              aria-label={t('loadingPassageAriaLabel')}
              className="yv:pointer-events-none yv:absolute yv:inset-0"
            >
              {/* top-[50vh] (viewport-relative) keeps the spinner centered in the scrollport.
                  top-1/2 would resolve to 50% of the tall passage container and strand the
                  spinner off-screen when scrolled (e.g. on version changes). */}
              <LoaderIcon
                className="yv:sticky yv:top-[50vh] yv:mx-auto yv:block yv:size-6 yv:-translate-y-1/2 yv:animate-spin yv:text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          ) : null}
        </div>
      )}

      {version?.copyright && (
        <footer
          className="yv:flex yv:flex-col yv:items-center yv:gap-2"
          style={{ fontSize: currentFontSize }}
        >
          <p className="yv:text-balance yv:text-[0.75em] yv:text-center yv:text-muted-foreground">
            {version.copyright}
          </p>
          {version.publisher_url ? (
            <a
              className="yv:flex yv:items-center yv:gap-1 yv:text-xs yv:font-bold"
              href={version.publisher_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <InfoIcon className="yv:size-4" /> {t('learnMore')}
            </a>
          ) : null}
        </footer>
      )}
    </main>
  );
}

function UserMenu() {
  const { t } = useTranslation(undefined, { i18n });
  const { auth, signIn, signOut, userInfo } = useYVAuth();
  const yvContext = useContext(YouVersionContext);
  const { onSignInPress, onSignOutPress } = useBibleReaderContext();

  // Prefer host-supplied native actions (e.g. the Expo DOM wrapper bridges these to
  // native PKCE sign-in). Fall back to the Web SDK's own auth for pure-web usage.
  const handleSignIn = () => {
    if (onSignInPress) {
      onSignInPress();
    } else {
      void signIn({ scopes: ['profile'] });
    }
  };
  const handleSignOut = () => {
    if (onSignOutPress) {
      onSignOutPress();
    } else {
      void signOut();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild data-testid="user-menu-trigger">
        {auth.isAuthenticated ? (
          <Button size="icon" variant="outline">
            <ProfileAvatar
              name={userInfo?.name}
              src={userInfo?.getAvatarUrl(32, 32)?.toString()}
              aria-label={userInfo?.name || t('userAvatarAlt')}
              className="yv:size-full"
            />
          </Button>
        ) : (
          <Button size="sm" variant="secondary">
            <PersonIcon className="yv:text-foreground" />
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent
        theme={yvContext?.theme}
        className="yv:w-fit! yv:rounded-full"
        sideOffset={16}
        showHeader={false}
      >
        <PopoverClose asChild>
          {auth.isAuthenticated ? (
            <Button
              variant="secondary"
              className="yv:card yv:text-foreground"
              onClick={handleSignOut}
            >
              {t('signOut')}
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="yv:card yv:text-foreground"
              onClick={handleSignIn}
            >
              {t('signIn')}
            </Button>
          )}
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

export function BibleThemeSettingsContent({
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
  return (
    <div data-yv-sdk data-yv-theme={theme} className="yv:flex yv:flex-col yv:gap-4 yv:p-4">
      <div className="yv:flex yv:justify-between yv:items-stretch yv:gap-4">
        <div className="yv:flex yv:flex-1">
          <Button
            className="yv:flex-1 yv:text-xs yv:text-black yv:dark:text-muted-foreground yv:rounded-l-[8px] yv:rounded-r-none yv:border yv:border-white yv:dark:border-border yv:h-auto yv:py-2"
            onClick={onFontDecreased}
            size="lg"
            variant="secondary"
            data-testid="decrease-font-size"
            disabled={fontSize <= MIN_FONT_SIZE}
            aria-disabled={fontSize <= MIN_FONT_SIZE}
            aria-label="Decrease font size"
          >
            A
          </Button>
          <Button
            className="yv:flex-1 yv:text-3xl yv:text-black yv:dark:text-muted-foreground yv:rounded-r-[8px] yv:rounded-l-none yv:border yv:border-white yv:dark:border-border yv:h-auto yv:py-2"
            onClick={onFontIncreased}
            size="lg"
            variant="secondary"
            data-testid="increase-font-size"
            disabled={fontSize >= MAX_FONT_SIZE}
            aria-disabled={fontSize >= MAX_FONT_SIZE}
            aria-label="Increase font size"
          >
            A
          </Button>
        </div>
        <Button
          className="yv:h-auto yv:border yv:border-white yv:dark:border-border yv:rounded-[8px]"
          variant="secondary"
          data-testid="line-spacing"
          onClick={onChangeLineSpacing}
          aria-label="Change line spacing"
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
            'yv:group yv:dark:bg-muted yv:rounded-r-none yv:border-r-0.5 yv:dark:border-border yv:rounded-l-[8px] yv:h-auto',
            fontFamily === INTER_FONT
              ? 'yv:bg-primary yv:border-primary yv:dark:bg-inherit yv:text-primary-foreground yv:hover:text-primary-foreground yv:hover:bg-primary/80'
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
              {t('fontLabel')}
            </span>
            <span className="yv:sm:text-xl yv:text-base">{t('interFontName')}</span>
          </div>
        </Button>
        <Button
          className={cn(
            'yv:group yv:dark:bg-muted yv:border-l-0.5 yv:rounded-l-none yv:rounded-r-[8px] yv:h-auto',
            fontFamily === SOURCE_SERIF_FONT
              ? 'yv:bg-primary yv:border-primary yv:dark:bg-inherit yv:text-primary-foreground yv:hover:text-primary-foreground yv:hover:bg-primary/80'
              : '',
          )}
          onClick={() => onFontSelected(SOURCE_SERIF_FONT)}
          variant="outline"
        >
          <div className="yv:flex yv:flex-col yv:w-full yv:items-start">
            <span
              className={cn(
                'yv:text-xs yv:text-muted-foreground',
                fontFamily === SOURCE_SERIF_FONT
                  ? 'yv:text-muted yv:dark:text-muted-foreground yv:group-hover:text-muted'
                  : '',
              )}
            >
              {t('fontLabel')}
            </span>
            <span className="yv:sm:text-xl yv:text-base yv:font-serif">
              {t('sourceSerifFontName')}
            </span>
          </div>
        </Button>
      </div>
    </div>
  );
}

export type BibleReaderToolbarProps = {
  border?: 'top' | 'bottom';
  onOpenBibleThemeSettings?: (snapshot: BibleThemeSettingsSnapshot) => void;
};

function Toolbar({ border = 'top', onOpenBibleThemeSettings }: BibleReaderToolbarProps) {
  const { t } = useTranslation(undefined, { i18n });
  const {
    book,
    chapter,
    versionId,
    setBook,
    setChapter,
    setVersionId,
    booksData,
    booksLoading,
    currentFontFamily,
    setCurrentFontFamily,
    currentFontSize,
    setCurrentFontSize,
    currentLineSpacing,
    setCurrentLineSpacing,
    background,
    onChapterPickerPress,
    onVersionPickerPress,
  } = useBibleReaderContext();
  const yvContext = useContext(YouVersionContext);
  const themesSettingsValuesRef = useRef<BibleThemeSettingsValues>({
    fontSize: currentFontSize,
    fontFamily: currentFontFamily,
    lineSpacing: currentLineSpacing,
  });

  themesSettingsValuesRef.current = {
    fontSize: currentFontSize,
    fontFamily: currentFontFamily,
    lineSpacing: currentLineSpacing,
  };

  const applyThemeSettings = (
    themeSettings: BibleThemeSettingsValues,
  ): BibleThemeSettingsValues => {
    const nextThemeSettings = {
      fontSize: clampBibleReaderFontSize(themeSettings.fontSize),
      fontFamily: themeSettings.fontFamily,
      lineSpacing: themeSettings.lineSpacing,
    };

    themesSettingsValuesRef.current = nextThemeSettings;
    setCurrentFontSize(nextThemeSettings.fontSize);
    setCurrentFontFamily(nextThemeSettings.fontFamily);
    setCurrentLineSpacing(nextThemeSettings.lineSpacing);

    return nextThemeSettings;
  };

  const handleFontIncreased = (): BibleThemeSettingsValues => {
    const settings = themesSettingsValuesRef.current;
    return applyThemeSettings({
      ...settings,
      fontSize: nextBibleReaderFontSizeUp(settings.fontSize),
    });
  };

  const handleFontDecreased = (): BibleThemeSettingsValues => {
    const settings = themesSettingsValuesRef.current;
    return applyThemeSettings({
      ...settings,
      fontSize: nextBibleReaderFontSizeDown(settings.fontSize),
    });
  };

  const handleFontSelected = (fontFamily: FontFamily): BibleThemeSettingsValues => {
    return applyThemeSettings({
      ...themesSettingsValuesRef.current,
      fontFamily,
    });
  };

  const handleLineSpacingChange = (): BibleThemeSettingsValues => {
    const settings = themesSettingsValuesRef.current;
    return applyThemeSettings({
      ...settings,
      lineSpacing: changeBibleReaderLineSpacing(settings.lineSpacing),
    });
  };

  const buildBibleThemeSettingsSnapshot = (): BibleThemeSettingsSnapshot => ({
    ...themesSettingsValuesRef.current,
    minFontSize: MIN_FONT_SIZE,
    maxFontSize: MAX_FONT_SIZE,
  });

  const prevResult = getAdjacentChapter(booksData, book, chapter, 'previous');
  const nextResult = getAdjacentChapter(booksData, book, chapter, 'next');
  const canNavigatePrevious = !booksLoading && prevResult !== null;
  const canNavigateNext = !booksLoading && nextResult !== null;

  return (
    <section
      className={cn(
        'yv:flex yv:justify-center yv:gap-2 yv:p-4 yv:bg-background yv:border-border yv:max-w-screen yv:overflow-x-hidden',
        border === 'top' && 'yv:border-t',
        border === 'bottom' && 'yv:border-b',
      )}
    >
      <div
        className={cn(
          'yv:grid yv:w-full yv:items-center yv:sm:max-w-lg yv:max-w-[calc(100vw-2rem)] yv:gap-3',
          yvContext?.authEnabled
            ? 'yv:grid-cols-[auto_1fr_auto_auto]'
            : 'yv:grid-cols-[1fr_auto_auto]',
        )}
      >
        {yvContext?.authEnabled && <UserMenu />}

        <BibleChapterPicker.Root
          book={book}
          chapter={chapter}
          onBookChange={setBook}
          onChapterChange={setChapter}
          versionId={versionId}
          background={background}
          onChapterPickerPress={onChapterPickerPress}
        >
          <BibleChapterPicker.Trigger>
            {({ chapterLabel, currentBook, loading }) => (
              <div className="yv:grid yv:grid-cols-[auto_1fr_auto] yv:justify-start yv:grid-rows-1 yv:overflow-hidden yv:rounded-full yv:min-w-30 yv:bg-muted yv:text-muted-foreground yv:hover:bg-muted/80">
                <Button
                  className="yv:min-w-0 yv:group yv:place-self-center yv:max-size-9 yv:touch-hitbox"
                  size="icon"
                  variant="ghost"
                  disabled={!canNavigatePrevious}
                  aria-label={t('previousChapterAriaLabel')}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (prevResult) {
                      setBook(prevResult.bookId);
                      setChapter(prevResult.chapterId);
                    }
                  }}
                >
                  <ChevronLeftIcon className="yv:transition-transform yv:duration-100 yv:group-active:translate-y-px" />
                </Button>

                <Button
                  size="lg"
                  variant="secondary"
                  className="yv:px-0 yv:font-bold yv:text-foreground yv:min-w-[5ch]"
                  disabled={loading}
                  aria-label={t('changeBibleBookAndChapterAriaLabel')}
                >
                  {loading ? (
                    <LoaderIcon className="yv:size-4 yv:animate-spin yv:text-muted-foreground" />
                  ) : (
                    <>
                      <span className="yv:min-w-[3ch] yv:truncate">
                        {currentBook?.title || t('select')}
                      </span>
                      <span className="yv:tabular-nums yv:min-w-[1ch] yv:truncate">
                        {chapterLabel || ''}
                      </span>
                    </>
                  )}
                </Button>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (nextResult) {
                      setBook(nextResult.bookId);
                      setChapter(nextResult.chapterId);
                    }
                  }}
                  className="yv:min-w-0 yv:group yv:place-self-center yv:size-9 yv:touch-hitbox"
                  size="icon"
                  variant="ghost"
                  disabled={!canNavigateNext}
                  aria-label={t('nextChapterAriaLabel')}
                >
                  <ChevronRightIcon className="yv:transition-transform yv:duration-100 yv:group-active:translate-y-px" />
                </Button>
              </div>
            )}
          </BibleChapterPicker.Trigger>
        </BibleChapterPicker.Root>

        <BibleVersionPicker.Root
          versionId={versionId}
          onVersionChange={setVersionId}
          background={background}
          onVersionPickerPress={onVersionPickerPress}
        >
          <BibleVersionPicker.Trigger aria-label={t('changeBibleVersionAriaLabel')}>
            {({ version, loading }) => (
              <Button
                size="lg"
                variant="secondary"
                className="yv:min-w-[calc(0.25rem*4*2+3ch)] yv:px-4 yv:font-bold yv:text-foreground"
                disabled={loading}
                aria-label={
                  loading ? t('loadingBibleVersionAriaLabel') : t('changeBibleVersionAriaLabel')
                }
              >
                {/* This div exists merely as a wrapper to minimize width layout shifting */}
                <div className="yv:min-w-[3ch] yv:flex yv:justify-center">
                  {loading ? (
                    <LoaderIcon className="yv:size-4 yv:animate-spin yv:text-muted-foreground" />
                  ) : (
                    <span className="yv:truncate">
                      {version?.localized_abbreviation || t('selectVersion')}
                    </span>
                  )}
                </div>
              </Button>
            )}
          </BibleVersionPicker.Trigger>
          <BibleVersionPicker.Content />
        </BibleVersionPicker.Root>

        {onOpenBibleThemeSettings ? (
          <Button
            size="sm"
            variant="secondary"
            aria-label={t('settingsAriaLabel')}
            onClick={() => onOpenBibleThemeSettings(buildBibleThemeSettingsSnapshot())}
          >
            <GearIcon className="yv:text-foreground" />
          </Button>
        ) : (
          <Popover>
            <PopoverTrigger asChild aria-label={t('settingsAriaLabel')}>
              <Button size="sm" variant="secondary">
                <GearIcon className="yv:text-foreground" />
              </Button>
            </PopoverTrigger>

            <PopoverContent sideOffset={16} heading={t('readerSettingsHeading')} theme={background}>
              <BibleThemeSettingsContent
                theme={background}
                fontSize={currentFontSize}
                fontFamily={currentFontFamily}
                lineSpacing={currentLineSpacing}
                onFontDecreased={handleFontDecreased}
                onFontIncreased={handleFontIncreased}
                onFontSelected={handleFontSelected}
                onChangeLineSpacing={handleLineSpacingChange}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
    </section>
  );
}

export const BibleReader = Object.assign({}, { Root, Content, Toolbar });
export type BibleReaderRootProps = RootProps;
