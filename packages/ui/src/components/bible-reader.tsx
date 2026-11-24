'use client';

import i18n from '@/i18n';
import { copyTextToClipboard } from '@/lib/clipboard';
import { useInterfaceDirection } from '@/lib/direction';
import { useDelayedLoading } from '@/lib/use-delayed-loading';
import { useHighlightsControlledLatch } from '@/lib/use-highlights-controlled-latch';
import { useResolvedScriptureDirection } from '@/lib/scripture-direction';
import { cn } from '@/lib/utils';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import {
  DEFAULT_LICENSE_FREE_BIBLE_VERSION,
  YouVersionPlatformConfiguration,
  getPassageAttribution,
  type Highlight,
  type TextDirection,
} from '@youversion/platform-core';
import { useBooks, usePassage, useTheme, useVersion } from '@youversion/platform-react-hooks';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import type { BibleChapterPickerPressData } from './bible-chapter-picker';
import type { BibleVersionPickerPressData } from './bible-version-picker';
import { InfoIcon } from './icons/info';
import { LoaderIcon } from './icons/loader';
import { ReuseShadowBoundary, ShadowIsolationBoundary } from '@/lib/shadow-isolation';
import { VerseActionPopover } from './verse-action-popover';
import { useBibleReaderHighlights } from './use-bible-reader-highlights';
import { HighlightPermissionDialog } from './highlight-permission-dialog';
import { SignInDialog } from './sign-in-dialog';
import { BibleTextView, getCleanVerseText, type FootnoteData } from './verse';
import { buildVerseReference, buildVerseShareText, joinVerseTexts } from '@/lib/verse-share';
import { isHighlightsLive } from '@/lib/feature-flags';
import { YvComponentStyles } from '@/lib/yv-styles-components';
import type { BibleReaderSearchPressData } from './bible-reader-search';
import { useTransientVerseFocus, type VerseFocusRequest } from '@/lib/use-transient-verse-focus';
import {
  BibleReaderNavigation,
  type BibleReaderNavigationRequest,
} from './bible-reader-navigation';
import { VerseActionPopoverFocusRestoreProvider } from '@/lib/verse-action-popover-focus';
import { isElementFromOwnerDocument } from '@/lib/shadow-root-host';
import {
  BibleReaderContext,
  useBibleReaderContext,
  type BibleReaderContextType,
} from './bible-reader-context';

import type {
  BibleReaderHighlightIntent,
  BibleReaderSettingsProps,
  BibleReaderShareData,
  BibleReaderVerseSelection,
} from './bible-reader.types';

import { Toolbar } from './bible-reader-toolbar';
import { useBibleReaderSettings } from './use-bible-reader-settings';

export type { BibleReaderToolbarProps } from './bible-reader-toolbar';
export { useBibleReaderContext } from './bible-reader-context';
export { BibleThemeSettingsContent } from './bible-theme-settings';
export {
  BIBLE_READER_FONT,
  BIBLE_READER_SPACING,
  clampBibleReaderFontSize,
  nextBibleReaderFontSizeUp,
  nextBibleReaderFontSizeDown,
  changeBibleReaderLineSpacing,
  createBibleThemeSettingsContentHandlers,
  type BibleThemeSettingsValues,
  type BibleThemeSettingsSnapshot,
  type BibleThemeSettingsContentProps,
} from './bible-reader-settings';

export type {
  BibleReaderHighlightIntent,
  BibleReaderShareData,
  BibleReaderVerseSelection,
} from './bible-reader.types';

export type RootProps = BibleReaderSettingsProps & {
  /** Retain this connection outside the reader to request navigation before mount. */
  navigation?: BibleReaderNavigation;
  book?: string;
  defaultBook?: string;
  onBookChange?: (book: string) => void;
  chapter?: string;
  defaultChapter?: string;
  onChapterChange?: (chapter: string) => void;
  versionId?: number;
  defaultVersionId?: number;
  onVersionChange?: (versionId: number) => void;
  showVerseNumbers?: boolean;
  background?: 'light' | 'dark';
  onFootnotePress?: (data: FootnoteData) => void;
  onChapterPickerPress?: (data: BibleChapterPickerPressData) => void;
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
  /** Replaces the built-in search popover with host-owned search. */
  onSearchPress?: (data: BibleReaderSearchPressData) => void | Promise<void>;
  /**
   * Bible translation language for the version picker (`en`, `es`, …).
   * Controlled when set with `onLanguageChange`.
   *
   * Distinct from `YouVersionProvider` `locale`, which is app UI language.
   * Do not derive this from device locale unless the host intends the picker
   * to open on that Bible language.
   */
  languageId?: string;
  /**
   * Uncontrolled initial Bible translation language for the version picker.
   * Ignored when `languageId` is set. When omitted, the picker falls back to
   * the browser language, then `en`.
   */
  defaultLanguageId?: string;
  onLanguageChange?: (languageId: string) => void;
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
  /**
   * Host-supplied highlights in the core API shape (`{ version_id, passage_id,
   * color }`). Presence of this prop puts the reader's highlight slice in
   * **controlled mode**: the reader renders highlights purely from this prop
   * (filtered by the displayed version and chapter, range USFMs like
   * `'JHN.3.16-18'` expanded per verse) and performs no highlight persistence
   * of any kind — no network calls, no local store, no auth surface. Color
   * taps emit {@link onHighlightApply} / {@link onHighlightRemove} instead of
   * painting; nothing paints until the host round-trips an updated prop.
   *
   * The mode is latched at first mount: flipping between controlled and
   * self-contained across renders is unsupported (dev warning). `[]` means
   * "controlled, nothing highlighted"; leaving the prop off means
   * self-contained.
   *
   * Invalid API hex is dropped from paint. Valid non-palette colors paint and
   * appear in the remove tray at their exact hex (YPE-4494). Apply stays
   * palette-only.
   */
  highlights?: Highlight[];
  /**
   * Called on every verse selection change with the selection payload —
   * `verses: []` whenever a non-empty selection clears, whether by
   * deselecting, after a highlight/copy/share action, on popover dismiss, or
   * on navigation. Fires in both controlled and self-contained modes — it is
   * an observation, not a request.
   *
   * A clear fired by navigation carries the *destination* book/chapter/version
   * (the selection cleared because the reader moved there). Treat `verses: []`
   * as "no selection anywhere" rather than keying off its location fields.
   *
   * Also re-fires with the **same** `verses` when the localized book title or
   * version abbreviation resolves while a selection is live, so `reference` /
   * `shareData` don't stay on their fallbacks. Treat the payload as the current
   * state of the selection, not as one event per user action.
   */
  onVerseSelect?: (selection: BibleReaderVerseSelection) => void;
  /**
   * Controlled mode only: called when the user taps a highlight color, with
   * the intent payload. Ignored (never called) in self-contained mode, or with
   * `verseActions="none"` — the built-in popover is the only trigger, so a
   * host owning the action UI drives highlights via the `highlights` prop.
   */
  onHighlightApply?: (intent: BibleReaderHighlightIntent) => void;
  /**
   * Controlled mode only: called when the user taps a clear (X) circle, scoped
   * to the selected verses currently showing that color. Ignored (never
   * called) in self-contained mode, or with `verseActions="none"` (see
   * {@link onHighlightApply}).
   */
  onHighlightRemove?: (intent: BibleReaderHighlightIntent) => void;
  /**
   * Which verse-action UI the reader renders over a selection.
   *
   * - `'popover'` (default) renders the built-in {@link VerseActionPopover} —
   *   today's behavior, unchanged.
   * - `'none'` renders **no** verse-action UI while keeping everything else
   *   intact: verses still select and paint, and {@link onVerseSelect} still
   *   fires with `reference` and `shareData` populated, so the host can render
   *   its own label and run copy / share itself.
   *
   *   Highlight intents are the exception: the built-in popover is their only
   *   trigger, so {@link onHighlightApply} / {@link onHighlightRemove} do
   *   **not** fire in this mode. A host owning the action UI drives highlights
   *   by updating the `highlights` prop directly.
   *
   *   Use it when the host owns the action UI
   *   — e.g. a React Native host presenting a native bottom sheet, where a
   *   second in-WebView popover would stack on top of it.
   *
   * With `'none'` the host also owns clearing the selection; see
   * {@link clearSelectionSignal}.
   */
  verseActions?: 'popover' | 'none';
  /**
   * Clears the current verse selection from outside the reader. Any change to
   * this value runs the reader's own "close and clear" path, emitting
   * {@link onVerseSelect} with `verses: []`. The value at mount is the
   * baseline, so mounting never clears.
   *
   * A monotonically incremented counter rather than an imperative `ref` handle
   * because Expo DOM components accept only serializable props — a ref cannot
   * cross that bridge. Pairs with `verseActions="none"`, where nothing inside
   * the reader can clear the selection any more.
   */
  clearSelectionSignal?: number;
  scriptureDirection?: TextDirection;
  children?: ReactNode;
};

// Non-scrolling focus requests apply only to the chapter/version already displayed.
function canApplyNavigationRequest(
  target: BibleReaderNavigationRequest,
  versionId: number,
  book: string,
  chapter: string,
): boolean {
  return (
    target.scrollsToVerse ||
    (target.versionId === versionId && target.book === book && target.chapter === chapter)
  );
}

function Root({
  navigation: navigationProp,
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
  defaultFontSize,
  onFontSizeChange,
  fontFamily: fontFamilyProp,
  defaultFontFamily,
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
  onSearchPress,
  languageId,
  defaultLanguageId,
  onLanguageChange,
  onSignInPress,
  onSignOutPress,
  onCopy,
  onShare,
  highlights,
  onVerseSelect,
  onHighlightApply,
  onHighlightRemove,
  verseActions = 'popover',
  clearSelectionSignal,
  scriptureDirection,
  children,
}: RootProps) {
  const interfaceDirection = useInterfaceDirection();
  // Latched at first mount: a transient `undefined` on a controlled reader must
  // render as "no highlights", never fall through to the self-contained path.
  const isHighlightsControlled = useHighlightsControlledLatch(highlights, 'BibleReader.Root');

  const [localNavigation] = useState(() => new BibleReaderNavigation());
  const navigation = navigationProp ?? localNavigation;
  const [initialNavigation, setInitialNavigation] = useState(() => {
    const target = navigation.peek();
    if (
      target &&
      !canApplyNavigationRequest(
        target,
        controlledVersionId ?? defaultVersionId,
        controlledBook ?? defaultBook,
        controlledChapter ?? defaultChapter,
      )
    )
      return null;
    return target;
  });

  const [currentBook, setBook] = useControllableState({
    prop: controlledBook,
    defaultProp: defaultBook,
    onChange: onBookChange,
  });

  const [currentChapter, setChapter] = useControllableState({
    prop: controlledChapter,
    defaultProp: defaultChapter,
    onChange: onChapterChange,
  });

  const [currentVersionId, setVersionId] = useControllableState({
    prop: controlledVersionId,
    defaultProp: defaultVersionId,
    onChange: onVersionChange,
  });

  // Show the queued destination on the first render without consuming it during
  // render. Controlled values still belong to the host; Content waits for them.
  const book = controlledBook ?? initialNavigation?.book ?? currentBook;
  const chapter = controlledChapter ?? initialNavigation?.chapter ?? currentChapter;
  const versionId = controlledVersionId ?? initialNavigation?.versionId ?? currentVersionId;

  const {
    currentFontSize,
    setCurrentFontSize,
    currentFontFamily,
    setCurrentFontFamily,
    currentLineSpacing,
    setCurrentLineSpacing,
  } = useBibleReaderSettings({
    fontSize: fontSizeProp,
    defaultFontSize,
    onFontSizeChange,
    fontFamily: fontFamilyProp,
    defaultFontFamily,
    onFontFamilyChange,
    lineSpacing: lineSpacingProp,
    defaultLineSpacing,
    onChangeLineSpacing,
    lineHeight,
  });

  const providerTheme = useTheme();
  const theme = background || providerTheme;

  const { books, loading: booksLoading } = useBooks(versionId);
  const booksData = books?.data ?? [];

  const [verseFocus, setVerseFocus] = useState<VerseFocusRequest | null>(() =>
    initialNavigation ? { ...initialNavigation, seq: 0 } : null,
  );
  const [activatedFocus, setActivatedFocus] = useState<VerseFocusRequest | null>(null);
  const atFocusDestination =
    verseFocus?.versionId === versionId &&
    verseFocus.book === book &&
    verseFocus.chapter === chapter;
  if (verseFocus !== null && atFocusDestination && activatedFocus !== verseFocus) {
    setActivatedFocus(verseFocus);
  } else if (verseFocus !== null && !atFocusDestination && activatedFocus === verseFocus) {
    // Clear before children render when controlled props leave an activated
    // destination. A request awaiting its first host round-trip stays pending.
    setVerseFocus(null);
    setActivatedFocus(null);
  }
  const verseFocusSeqRef = useRef(0);
  useEffect(() => {
    const consume = (): void => {
      const target = navigation.consume();
      if (target === null) return;
      setInitialNavigation(null);
      if (!canApplyNavigationRequest(target, versionId, book, chapter)) return;
      verseFocusSeqRef.current += 1;
      setVersionId(target.versionId);
      setBook(target.book);
      setChapter(target.chapter);
      if (target !== initialNavigation) {
        setVerseFocus({
          ...target,
          seq: verseFocusSeqRef.current,
        });
      }
    };
    const unsubscribe = navigation.subscribe(consume);
    consume();
    return unsubscribe;
  }, [navigation, initialNavigation, versionId, book, chapter, setVersionId, setBook, setChapter]);

  const contextValue: BibleReaderContextType = {
    book,
    chapter,
    versionId,
    setBook: (value) => {
      setVerseFocus(null);
      setBook(value);
    },
    setChapter: (value) => {
      setVerseFocus(null);
      setChapter(value);
    },
    setVersionId: (value) => {
      setVerseFocus(null);
      setVersionId(value);
    },
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
    onSearchPress,
    languageId,
    defaultLanguageId,
    onLanguageChange,
    onSignInPress,
    onSignOutPress,
    onCopy,
    onShare,
    highlights: isHighlightsControlled ? highlights : undefined,
    isHighlightsControlled,
    onVerseSelect,
    onHighlightApply,
    onHighlightRemove,
    verseActions,
    clearSelectionSignal,
    navigation,
    verseFocus,
    scriptureDirection,
  };

  return (
    <ShadowIsolationBoundary theme={theme} portalStrategy="local-top-layer">
      <BibleReaderContext.Provider value={contextValue}>
        <YvComponentStyles />
        <div
          data-yv-sdk
          data-yv-theme={theme}
          dir={interfaceDirection}
          className="yv:flex yv:flex-col yv:h-full yv:bg-background yv:text-foreground"
        >
          {children}
        </div>
      </BibleReaderContext.Provider>
    </ShadowIsolationBoundary>
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
    highlights,
    isHighlightsControlled,
    onVerseSelect,
    onHighlightApply,
    onHighlightRemove,
    verseActions,
    clearSelectionSignal,
    verseFocus,
    scriptureDirection,
  } = useBibleReaderContext();
  const { version } = useVersion(versionId);
  const attribution = version ? getPassageAttribution(version) : null;
  const publisherUrl = version?.publisher_url;

  const bookData = useMemo(() => {
    return booksData.find((b) => b.id === book);
  }, [booksData, book]);

  const chapterReference = `${book}.${chapter}`;
  const activeNavigation =
    verseFocus?.versionId === versionId &&
    verseFocus.book === book &&
    verseFocus.chapter === chapter
      ? verseFocus
      : null;
  const usfmReference =
    activeNavigation && !activeNavigation.showsFullChapter
      ? activeNavigation.passageId
      : chapterReference;
  const awaitingNavigation = verseFocus !== null && activeNavigation === null;

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
    passage: fetchedPassage,
    loading: fetchingPassage,
    error: fetchedPassageError,
  } = usePassage({
    versionId,
    usfm: usfmReference,
    include_headings: true,
    include_notes: true,
    options: { enabled: !chapterUnavailable && !awaitingNavigation },
  });
  const passage = awaitingNavigation ? null : fetchedPassage;
  const passageLoading = awaitingNavigation || fetchingPassage;
  const passageError = awaitingNavigation ? null : fetchedPassageError;
  const resolvedScriptureDirection = useResolvedScriptureDirection(
    passage?.content,
    scriptureDirection,
  );

  const isRefetching = !chapterUnavailable && passageLoading && passage !== null;
  const showLoadingOverlay = useDelayedLoading(isRefetching);

  // Version-only changes intentionally preserve scroll position.
  const scrollContainerRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [book, chapter]);

  // ---- Verse selection + highlights ------------------------------------------
  // Selection is ephemeral (ADR-007 in YPE-642). Highlights come from
  // useBibleReaderHighlights: host-supplied in controlled mode (YPE-3705), or
  // server-only account data in self-contained mode (YPE-1034 ADR-001),
  // dark-launched behind HIGHLIGHTS_LIVE. The reader DOM ref anchors the
  // popover and supplies clean verse text for Copy / Share.
  const readerRef = useRef<HTMLDivElement>(null);
  const renderedReference = !passageLoading && !passageError && passage ? usfmReference : '';
  useTransientVerseFocus({
    request: activeNavigation,
    renderedReference,
    containerRef: readerRef,
  });
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [clipboardFailed, setClipboardFailed] = useState(false);
  const actionAttemptRef = useRef(0);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const verseFocusRestoreTargetRef = useRef<Element | null>(null);
  const takeVerseFocusRestoreTarget = useCallback(() => {
    const target = verseFocusRestoreTargetRef.current;
    verseFocusRestoreTargetRef.current = null;
    return target;
  }, []);
  const [highlightRedirectPending, setHighlightRedirectPending] = useState(false);
  const lastSelectionRef = useRef<number[]>([]);
  const highlightRedirectRef = useRef({
    onStarted: () => undefined,
    onFailed: () => undefined,
  });

  const {
    highlightedVerses,
    highlightsInteractive,
    apply: applyHighlight,
    remove: removeHighlight,
    permissionDialogOpen,
    onPermissionDialogOpenChange,
    confirmPermissionDialog,
    cancelPermissionDialog,
    signInDialogOpen,
    confirmSignInDialog,
    cancelSignInDialog,
  } = useBibleReaderHighlights({
    versionId,
    book,
    chapter,
    controlled: isHighlightsControlled
      ? {
          highlights: highlights ?? [],
          onApply: onHighlightApply,
          onRemove: onHighlightRemove,
        }
      : undefined,
    onAuthRedirectStarted: () => highlightRedirectRef.current.onStarted(),
    onAuthRedirectFailed: () => highlightRedirectRef.current.onFailed(),
  });

  // Color row: controlled mode always shows it (YPE-3705 bypasses HIGHLIGHTS_LIVE).
  // Self-contained needs the live flag AND an auth provider — without a provider
  // the machine is inert (taps noop), so hide dead swatches for copy/share-only.
  // Copy / Share are always available.
  const highlightsEnabled = isHighlightsControlled || (isHighlightsLive() && highlightsInteractive);
  // Copy shown to the sign-in dialog. Falls back to a neutral label when the
  // integrator hasn't set `YouVersionPlatformConfiguration.appName`.
  const signInAppName = YouVersionPlatformConfiguration.appName ?? t('signInAppNameFallback');
  const signInPromptMessage = YouVersionPlatformConfiguration.signInPromptMessage;

  // Read via ref in the navigation effect so an inline callback prop doesn't
  // retrigger it every render.
  const onVerseSelectRef = useRef(onVerseSelect);
  onVerseSelectRef.current = onVerseSelect;

  // Navigating away (book/chapter/version) drops the selection — those verses
  // no longer exist on screen (ADR-007).
  useEffect(() => {
    actionAttemptRef.current += 1;
    setClipboardFailed(false);
    setSelectedVerses([]);
    setPopoverOpen(false);
    setAnchorElement(null);
    if (lastSelectionRef.current.length > 0) {
      lastSelectionRef.current = [];
      onVerseSelectRef.current?.({
        versionId,
        book,
        chapter,
        verses: [],
        passageIds: [],
        reference: '',
        shareData: null,
      });
    }
  }, [book, chapter, versionId, activeNavigation?.seq]);

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
    // The deselect-tap path emits its own `[]` via handleVerseSelect. Read via
    // ref: async callers (navigator.share().then) capture this closure, and a
    // host-swapped callback must not go stale on that path.
    if (lastSelectionRef.current.length > 0) {
      lastSelectionRef.current = [];
      onVerseSelectRef.current?.(buildVerseSelection([]));
    }
  }

  // `clearSelectionSignal` is a host-owned command, not state: any change runs
  // the same close-and-clear path an outside click would. Read the handler via a
  // ref so the effect fires on the signal alone (the handler is re-created every
  // render). The ref seeds from the mount value, so mounting is never a clear.
  const closeAndClearSelectionRef = useRef(closeAndClearSelection);
  closeAndClearSelectionRef.current = closeAndClearSelection;
  const lastClearSelectionSignalRef = useRef(clearSelectionSignal);
  useEffect(() => {
    if (lastClearSelectionSignalRef.current === clearSelectionSignal) return;
    lastClearSelectionSignalRef.current = clearSelectionSignal;
    closeAndClearSelectionRef.current();
  }, [clearSelectionSignal]);

  // The verse menu is hidden while a redirect starts, so the popover cannot see
  // an outside click. Keep that dismiss alive until the prompt's modal is gone.
  useEffect(() => {
    if (!highlightRedirectPending || permissionDialogOpen || signInDialogOpen) return;
    const ownerDocument = readerRef.current?.ownerDocument ?? document;
    function onPointerDown(event: PointerEvent) {
      const interactedWithVerse = event
        .composedPath()
        .some(
          (target) =>
            isElementFromOwnerDocument(target, ownerDocument.documentElement, 'Element') &&
            target.matches('.yv-v[v]'),
        );
      if (interactedWithVerse) return;
      closeAndClearSelectionRef.current();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      closeAndClearSelectionRef.current();
    }
    ownerDocument.addEventListener('pointerdown', onPointerDown);
    ownerDocument.addEventListener('keydown', onKeyDown);
    return () => {
      ownerDocument.removeEventListener('pointerdown', onPointerDown);
      ownerDocument.removeEventListener('keydown', onKeyDown);
    };
  }, [highlightRedirectPending, permissionDialogOpen, signInDialogOpen]);

  /** Builds the serializable selection payload (verses ascending, de-duped). */
  function buildVerseSelection(verses: number[]): BibleReaderVerseSelection {
    const sorted = [...new Set(verses)].sort((a, b) => a - b);
    return {
      versionId,
      book,
      chapter,
      verses: sorted,
      passageIds: sorted.map((verse) => `${book}.${chapter}.${verse}`),
      // The label a host renders over its own verse-action UI. No version
      // abbreviation here — that belongs to copied text, not to a title.
      reference:
        sorted.length === 0
          ? ''
          : buildVerseReference({
              bookName: bookData?.title ?? book,
              chapter,
              verses: sorted,
              versionAbbreviation: '',
            }),
      shareData: sorted.length === 0 ? null : buildSelectionShareData(sorted),
    };
  }

  // The payload's localized fields (`reference`, `shareData`) are a snapshot of
  // `useBooks` / `useVersion`, which can resolve *after* a selection is made —
  // that payload carries the USFM book code and no version abbreviation. Re-emit
  // the live selection once the metadata lands so a host owning the verse-action
  // UI isn't stuck showing `HEB 11:4` until the user selects again.
  //
  // Both refs seed from the mount values, so the first effect run is never an
  // emit. Navigation clears the selection in the effect above (declared first,
  // so it runs first), which makes the empty-selection guard here catch a
  // book/version change before it can re-emit a dead selection.
  const buildVerseSelectionRef = useRef(buildVerseSelection);
  buildVerseSelectionRef.current = buildVerseSelection;
  const bookTitle = bookData?.title;
  const versionAbbreviation = version?.localized_abbreviation;
  const lastEmittedMetadataRef = useRef({ bookTitle, versionAbbreviation });
  useEffect(() => {
    const emitted = lastEmittedMetadataRef.current;
    if (emitted.bookTitle === bookTitle && emitted.versionAbbreviation === versionAbbreviation) {
      return;
    }
    lastEmittedMetadataRef.current = { bookTitle, versionAbbreviation };
    if (lastSelectionRef.current.length === 0) return;
    onVerseSelectRef.current?.(buildVerseSelectionRef.current(lastSelectionRef.current));
  }, [bookTitle, versionAbbreviation]);

  function handleVerseSelect(verses: number[]) {
    const added = verses.find((verse) => !lastSelectionRef.current.includes(verse));
    lastSelectionRef.current = verses;
    setSelectedVerses(verses);
    onVerseSelect?.(buildVerseSelection(verses));

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
    // Entering the auth flow (sign-in or permission prompt) keeps only the verse
    // selection. The popover is hidden while the prompt is open and returns on
    // cancel. Confirm hides it until the redirect starts, then clears the
    // selection. If the redirect fails to start, the menu comes back. This is
    // the YPE-5943 exception to YPE-642 Resolved (round 2). An immediate apply
    // — or an inert no-op — clears as before.
    if (outcome === 'flow') return;
    closeAndClearSelection();
  }

  function handleClearHighlight(color: string) {
    removeHighlight(color, selectedVerses);

    // Multiple colors active → keep open so the user can remove others (AC 8a);
    // last color removed → dismiss (AC 8). In self-contained mode
    // `highlightedVerses` still holds the pre-removal snapshot here (the
    // optimistic overlay lands next render); in controlled mode the host
    // round-trip is what unpaints.
    const hasRemaining = selectedVerses.some((verse) => {
      const current = highlightedVerses[verse];
      return current && current !== color;
    });
    if (!hasRemaining) closeAndClearSelection();
  }

  /**
   * `verses` is a parameter rather than a read of `selectedVerses` because
   * `buildVerseSelection` runs inside the click handler that *sets* the new
   * selection — reading state there would build the payload for the previous
   * one.
   */
  function buildSelectionShareData(verses: number[]): BibleReaderShareData | null {
    const container = readerRef.current;
    if (!container) return null;
    const textByVerse: Record<number, string> = {};
    for (const verse of verses) {
      textByVerse[verse] = getCleanVerseText(container, verse);
    }
    const bookName = bookData?.title ?? book;
    const versionAbbreviation = version?.localized_abbreviation ?? '';
    return {
      text: buildVerseShareText({
        verses,
        textByVerse,
        bookName,
        chapter,
        versionAbbreviation,
      }),
      reference: buildVerseReference({
        bookName,
        chapter,
        verses,
        versionAbbreviation,
      }),
      verseText: joinVerseTexts(verses, textByVerse),
      verses: [...new Set(verses)].sort((a, b) => a - b),
      book,
      chapter,
      versionId,
    };
  }

  async function copySelectionText(text: string, attempt: number) {
    const copied = await copyTextToClipboard(text);
    if (actionAttemptRef.current !== attempt) return;
    setClipboardFailed(!copied);
  }

  function handleCopy() {
    const attempt = ++actionAttemptRef.current;
    setClipboardFailed(false);
    const data = buildSelectionShareData(selectedVerses);
    if (onCopy) {
      if (data) {
        void Promise.resolve(onCopy(data)).catch(() => {
          // Host overrides own their error feedback.
        });
      }
      closeAndClearSelection();
      return;
    }
    if (data?.text) void copySelectionText(data.text, attempt);
    closeAndClearSelection();
  }

  function handleShare() {
    const attempt = ++actionAttemptRef.current;
    setClipboardFailed(false);
    const data = buildSelectionShareData(selectedVerses);
    if (onShare) {
      if (data) {
        void Promise.resolve(onShare(data)).catch(() => {
          // Host rejected or cancelled — mirror the silent navigator.share dismiss.
        });
      }
      closeAndClearSelection();
      return;
    }
    void shareSelectionText(data?.text ?? '', attempt);
  }

  async function shareSelectionText(text: string, attempt: number) {
    if (text && globalThis.navigator?.share instanceof Function) {
      // Each selection update replaces this array, even when the same verses are reselected.
      const sharedSelection = lastSelectionRef.current;
      try {
        await globalThis.navigator.share({ text });
        if (actionAttemptRef.current !== attempt || lastSelectionRef.current !== sharedSelection)
          return;
        closeAndClearSelectionRef.current();
        return;
      } catch (error) {
        // A cancelled share keeps the selection and popover available for retry.
        if (
          (error instanceof DOMException || error instanceof Error) &&
          error.name === 'AbortError'
        )
          return;
        if (actionAttemptRef.current !== attempt || lastSelectionRef.current !== sharedSelection)
          return;
      }
    }
    // Unsupported or failed Web Share falls back to clipboard.
    if (text) void copySelectionText(text, attempt);
    closeAndClearSelection();
  }

  highlightRedirectRef.current = {
    onStarted: () => {
      setHighlightRedirectPending(false);
      closeAndClearSelection();
    },
    onFailed: () => {
      setHighlightRedirectPending(false);
    },
  };

  // Sign-in and permission prompts are modal. Opening one is an outside
  // interaction for the verse-action popover, so Radix dismisses it. That
  // dismiss is the prompt taking focus. The selection stays, and the menu
  // returns when the prompt closes without applying a highlight (YPE-5943).
  // Once the prompt is gone and the redirect is still starting, an outside
  // click clears the selection again, so a failed start does not restore a
  // menu the reader already dismissed.
  const highlightDialogOpen = permissionDialogOpen || signInDialogOpen;
  const highlightPromptOpen = highlightDialogOpen || highlightRedirectPending;

  function handlePopoverOpenChange(open: boolean) {
    if (open) {
      setPopoverOpen(true);
      return;
    }
    if (highlightDialogOpen) return;
    // Outside click / Escape closes and clears (YPE-642, Resolved round 2).
    closeAndClearSelection();
  }

  function confirmHighlightPrompt(confirm: () => void) {
    // Hide the menu without dropping the selection. The selection clears only
    // after the redirect promise fulfills. If it rejects, the menu comes back.
    setHighlightRedirectPending(true);
    confirm();
  }

  let chapterLabel: string = bookData?.chapters?.find((ch) => ch.id === chapter)?.title || chapter;
  if (bookData?.intro && chapter === bookData?.intro.id) {
    chapterLabel = bookData.intro.title;
  }

  return (
    <main
      ref={scrollContainerRef}
      className="yv:*:max-w-lg yv:flex yv:flex-col yv:items-center yv:gap-6 yv:overflow-y-auto yv:px-6 yv:max-sm:px-4 yv:py-12 yv:h-full"
      onPointerDownCapture={(event) => {
        let activeElement = event.currentTarget.ownerDocument.activeElement;
        while (activeElement?.shadowRoot?.activeElement) {
          activeElement = activeElement.shadowRoot.activeElement;
        }
        verseFocusRestoreTargetRef.current =
          activeElement === event.currentTarget.ownerDocument.body ? null : activeElement;
      }}
    >
      <h1
        dir={resolvedScriptureDirection}
        className="yv:flex yv:gap-2 yv:flex-col yv:justify-center yv:items-center yv:text-muted-foreground yv:font-medium"
      >
        <span
          className={cn(
            'yv:font-serif yv:leading-none yv:block yv:text-2xl yv:transition-[filter]',
          )}
        >
          {bookData?.title ? (
            <bdi dir="auto">{bookData.title}</bdi>
          ) : (
            <LoaderIcon className="yv:size-6 yv:animate-spin yv:text-muted-foreground" />
          )}
        </span>
        <span className="yv:font-serif yv:leading-none yv:block yv:text-[2.5rem] yv:font-normal yv:tabular-nums">
          <bdi dir="auto">{chapterLabel || chapter || '-'}</bdi>
        </span>
      </h1>

      <div
        role="status"
        aria-live="polite"
        className="yv:sticky yv:[inset-block-start:0] yv:z-10 yv:rounded-md yv:bg-background yv:px-4 yv:py-2 yv:empty:sr-only yv:text-center yv:text-destructive"
      >
        {clipboardFailed ? t('unableToShare') : null}
      </div>

      {chapterUnavailable ? (
        <p className="yv:text-center yv:text-balance yv:text-muted-foreground">
          {t('chapterUnavailable')}
        </p>
      ) : (
        <div className="yv:relative yv:w-full">
          <div
            aria-busy={showLoadingOverlay || undefined}
            className={cn(
              'yv:transition-opacity yv:duration-150 yv:motion-reduce:transition-none',
              showLoadingOverlay ? 'yv:opacity-40' : 'yv:opacity-100',
            )}
          >
            <ReuseShadowBoundary>
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
                scriptureDirection={scriptureDirection}
                selectedVerses={selectedVerses}
                onVerseSelect={handleVerseSelect}
                highlightedVerses={highlightedVerses}
                passageState={{
                  passage,
                  loading: isRefetching ? false : passageLoading,
                  error: passageError,
                }}
              />
            </ReuseShadowBoundary>
          </div>

          {/* `verseActions="none"`: the host renders its own action UI (e.g. a
              native bottom sheet), so the built-in popover must not mount at
              all — two action surfaces would stack. Selection, painting, and
              every payload above are untouched. */}
          {verseActions !== 'none' && (
            <VerseActionPopoverFocusRestoreProvider takeTarget={takeVerseFocusRestoreTarget}>
              <VerseActionPopover
                open={popoverOpen && selectedVerses.length > 0 && !highlightPromptOpen}
                onOpenChange={handlePopoverOpenChange}
                activeHighlights={activeHighlights}
                selectedVerses={selectedVerses}
                highlightedVerses={highlightedVerses}
                highlightsEnabled={highlightsEnabled}
                anchorElement={anchorElement}
                scrollRoot={scrollContainerRef.current}
                onHighlight={handleHighlight}
                onClearHighlight={handleClearHighlight}
                onCopy={handleCopy}
                onShare={handleShare}
                theme={background}
              />
            </VerseActionPopoverFocusRestoreProvider>
          )}

          <HighlightPermissionDialog
            open={permissionDialogOpen}
            onOpenChange={onPermissionDialogOpenChange}
            onConfirm={() => confirmHighlightPrompt(confirmPermissionDialog)}
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
            onConfirm={() => confirmHighlightPrompt(confirmSignInDialog)}
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

      {attribution && (
        <footer
          className="yv:flex yv:flex-col yv:items-center yv:gap-2"
          style={{ fontSize: currentFontSize }}
        >
          <p className="yv:text-balance yv:text-[0.75em] yv:text-center yv:text-muted-foreground">
            <bdi dir="auto">{attribution.text}</bdi>
          </p>
          {publisherUrl ? (
            <a
              className="yv:flex yv:items-center yv:gap-1 yv:text-xs yv:font-bold"
              href={publisherUrl}
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

export const BibleReader = Object.assign({}, { Root, Content, Toolbar });
export type BibleReaderRootProps = RootProps;
