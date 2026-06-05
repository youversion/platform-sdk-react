'use client';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import {
  useBooks,
  useTheme,
  useVersion,
  useYVAuth,
  YouVersionContext,
} from '@youversion/platform-react-hooks';
import type { BibleBook } from '@youversion/platform-core';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactElement,
} from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_LICENSE_FREE_BIBLE_VERSION, getAdjacentChapter } from '@youversion/platform-core';
import { BibleChapterPicker, type BibleChapterPickerPressData } from './bible-chapter-picker';
import { BibleVersionPicker, type BibleVersionPickerPressData } from './bible-version-picker';
import { GearIcon } from './icons/gear';
import { InfoIcon } from './icons/info';
import { LoaderIcon } from './icons/loader';
import { PersonIcon } from './icons/person';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from './ui/popover';
import { BibleTextView, type FootnoteData } from './verse';
import { INTER_FONT, SOURCE_SERIF_FONT, type FontFamily } from '@/lib/verse-html-utils';
import { ChevronLeftIcon } from './icons/chevron-left';
import { ChevronRightIcon } from './icons/chevron-right';

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
  lineHeight?: number;
  showVerseNumbers: boolean;
  background: 'light' | 'dark';
  onFootnotePress?: (data: FootnoteData) => void;
  onChapterPickerPress?: (data: BibleChapterPickerPressData) => void;
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
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
  lineHeight?: number;
  showVerseNumbers?: boolean;
  background?: 'light' | 'dark';
  onFootnotePress?: (data: FootnoteData) => void;
  onChapterPickerPress?: (data: BibleChapterPickerPressData) => void;
  onVersionPickerPress?: (data: BibleVersionPickerPressData) => void;
  onSignInPress?: () => void;
  onSignOutPress?: () => void;
  children?: ReactNode;
};

export const BIBLE_READER_FONT = {
  MIN: 12,
  MAX: 20,
  DEFAULT: 16,
  STEP: 2,
} as const;

const MIN_FONT_SIZE = BIBLE_READER_FONT.MIN;
const MAX_FONT_SIZE = BIBLE_READER_FONT.MAX;
const DEFAULT_FONT_SIZE = BIBLE_READER_FONT.DEFAULT;
const FONT_SIZE_STEP = BIBLE_READER_FONT.STEP;

export type BibleThemeSettingsValues = {
  fontSize: number;
  fontFamily: FontFamily;
};

export type BibleThemeSettingsSnapshot = BibleThemeSettingsValues & {
  minFontSize: number;
  maxFontSize: number;
};

export type BibleThemeSettingsContentProps = {
  theme: 'light' | 'dark';
  fontSize: number;
  fontFamily: FontFamily;
  onFontSelected: (fontFamily: FontFamily) => void;
  onFontIncreased: () => void;
  onFontDecreased: () => void;
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
}): Pick<BibleThemeSettingsContentProps, 'onFontIncreased' | 'onFontDecreased' | 'onFontSelected'> {
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
  lineHeight,
  showVerseNumbers = true,
  background,
  onFootnotePress,
  onChapterPickerPress,
  onVersionPickerPress,
  onSignInPress,
  onSignOutPress,
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
  }, [isFontFamilyControlled, isFontSizeControlled, setCurrentFontFamily, setCurrentFontSize]);

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
    lineHeight,
    showVerseNumbers,
    background: theme,
    onFootnotePress,
    onChapterPickerPress,
    onVersionPickerPress,
    onSignInPress,
    onSignOutPress,
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
    lineHeight,
    showVerseNumbers,
    onFootnotePress,
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

  let chapterLabel: string = bookData?.chapters?.find((ch) => ch.id === chapter)?.title || chapter;
  if (bookData?.intro && chapter === bookData?.intro.id) {
    chapterLabel = bookData.intro.title;
  }

  return (
    <main className="yv:*:max-w-lg yv:flex yv:flex-col yv:items-center yv:gap-6 yv:overflow-y-auto yv:px-6 yv:max-sm:px-4 yv:py-12 yv:h-full">
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
        <BibleTextView
          reference={usfmReference}
          versionId={versionId}
          fontFamily={currentFontFamily}
          fontSize={currentFontSize}
          lineHeight={lineHeight}
          showVerseNumbers={showVerseNumbers}
          theme={background}
          onFootnotePress={onFootnotePress}
        />
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
        {auth.isAuthenticated && userInfo?.avatarUrlFormat ? (
          <Button size="icon" variant="outline">
            <img
              src={userInfo.getAvatarUrl(32, 32)?.toString()}
              alt={userInfo.name || t('userAvatarAlt')}
              className="yv:size-full yv:rounded-full yv:object-cover"
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
  onFontSelected,
  onFontIncreased,
  onFontDecreased,
}: BibleThemeSettingsContentProps): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  return (
    <div data-yv-sdk data-yv-theme={theme} className="yv:flex yv:flex-col yv:gap-4 yv:p-4">
      <div className="yv:grid yv:grid-cols-2">
        <Button
          className="yv:text-xs yv:text-black yv:dark:text-muted-foreground yv:rounded-l-[8px] yv:rounded-r-none yv:border yv:border-white yv:dark:border-border yv:h-auto yv:py-2"
          onClick={onFontDecreased}
          size="lg"
          variant="secondary"
          data-testid="decrease-font-size"
          disabled={fontSize <= MIN_FONT_SIZE}
          aria-disabled={fontSize <= MIN_FONT_SIZE}
        >
          A
        </Button>
        <Button
          className="yv:text-3xl yv:text-black yv:dark:text-muted-foreground yv:rounded-r-[8px] yv:rounded-l-none yv:border yv:border-white yv:dark:border-border yv:h-auto yv:py-2"
          onClick={onFontIncreased}
          size="lg"
          variant="secondary"
          data-testid="increase-font-size"
          disabled={fontSize >= MAX_FONT_SIZE}
          aria-disabled={fontSize >= MAX_FONT_SIZE}
        >
          A
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
    background,
    onChapterPickerPress,
    onVersionPickerPress,
  } = useBibleReaderContext();
  const yvContext = useContext(YouVersionContext);
  const themesSettingsValuesRef = useRef<BibleThemeSettingsValues>({
    fontSize: currentFontSize,
    fontFamily: currentFontFamily,
  });

  themesSettingsValuesRef.current = {
    fontSize: currentFontSize,
    fontFamily: currentFontFamily,
  };

  const applyThemeSettings = (
    themeSettings: BibleThemeSettingsValues,
  ): BibleThemeSettingsValues => {
    const nextThemeSettings = {
      fontSize: clampBibleReaderFontSize(themeSettings.fontSize),
      fontFamily: themeSettings.fontFamily,
    };

    themesSettingsValuesRef.current = nextThemeSettings;
    setCurrentFontSize(nextThemeSettings.fontSize);
    setCurrentFontFamily(nextThemeSettings.fontFamily);

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
                onFontDecreased={handleFontDecreased}
                onFontIncreased={handleFontIncreased}
                onFontSelected={handleFontSelected}
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
