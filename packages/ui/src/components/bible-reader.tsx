'use client';

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
  useState,
  type ReactElement,
} from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_LICENSE_FREE_BIBLE_VERSION, getAdjacentChapter } from '@youversion/platform-core';
import { BibleChapterPicker } from './bible-chapter-picker';
import { BibleVersionPicker } from './bible-version-picker';
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
  fontFamily?: FontFamily;
  fontSize?: number;
  lineHeight?: number;
  showVerseNumbers?: boolean;
  background?: 'light' | 'dark';
  onFootnotePress?: (data: FootnoteData) => void;
  children?: ReactNode;
};

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 20;
const DEFAULT_FONT_SIZE = 16;
const FONT_SIZE_STEP = 2;

export type BibleThemeSettingsValues = {
  fontSize: number;
  fontFamily: FontFamily;
};

export type BibleThemeSettingsData = BibleThemeSettingsValues & {
  minFontSize: number;
  maxFontSize: number;
  onFontIncreased: () => BibleThemeSettingsValues;
  onFontDecreased: () => BibleThemeSettingsValues;
  onFontSelected: (fontFamily: FontFamily) => BibleThemeSettingsValues;
};

export type BibleThemeSettingsContentProps = {
  fontSize: number;
  fontFamily: FontFamily;
  onFontSelected: (fontFamily: FontFamily) => void;
  onFontIncreased: () => void;
  onFontDecreased: () => void;
};

function clampFontSize(fontSize: number): number {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, fontSize));
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
  fontFamily = SOURCE_SERIF_FONT,
  fontSize = DEFAULT_FONT_SIZE,
  lineHeight,
  showVerseNumbers = true,
  background,
  onFootnotePress,
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

  const validatedFontSize =
    fontSize > MAX_FONT_SIZE || fontSize < MIN_FONT_SIZE ? DEFAULT_FONT_SIZE : fontSize;

  const [currentFontSize, setCurrentFontSize] = useState(validatedFontSize);
  const [currentFontFamily, setCurrentFontFamily] = useState(fontFamily);

  // Load saved preferences from localStorage before paint (avoids flash of default values)
  useLayoutEffect(() => {
    const savedFontSize = localStorage.getItem('youversion-platform:reader:font-size');
    if (savedFontSize) {
      const parsed = parseInt(savedFontSize);
      if (parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
        setCurrentFontSize(parsed);
      }
    }

    const savedFontFamily = localStorage.getItem('youversion-platform:reader:font-family');
    if (savedFontFamily) {
      setCurrentFontFamily(savedFontFamily);
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('youversion-platform:reader:font-size', currentFontSize.toString());
  }, [currentFontSize]);

  useEffect(() => {
    localStorage.setItem('youversion-platform:reader:font-family', currentFontFamily);
  }, [currentFontFamily]);

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
        // This copy was taken from bible.com (e.g. https://www.bible.com/bible/4253/ACT.INTRO1.AFV)
        <p className="yv:text-center yv:text-balance yv:text-muted-foreground">
          This chapter is not available in this version. Please choose a different chapter or
          version.
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
              <InfoIcon className="yv:size-4" /> Learn More
            </a>
          ) : null}
        </footer>
      )}
    </main>
  );
}

function UserMenu() {
  const { auth, signIn, signOut, userInfo } = useYVAuth();
  const yvContext = useContext(YouVersionContext);

  return (
    <Popover>
      <PopoverTrigger asChild data-testid="user-menu-trigger">
        {auth.isAuthenticated && userInfo?.avatarUrlFormat ? (
          <Button size="icon" variant="outline">
            <img
              src={userInfo.getAvatarUrl(32, 32)?.toString()}
              alt={userInfo.name || 'User avatar'}
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
            <Button variant="secondary" className="yv:card yv:text-foreground" onClick={signOut}>
              Sign Out
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="yv:card yv:text-foreground"
              onClick={() => void signIn({ scopes: ['profile'] })}
            >
              Sign In
            </Button>
          )}
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

export function BibleThemeSettingsContent({
  fontSize,
  fontFamily,
  onFontSelected,
  onFontIncreased,
  onFontDecreased,
}: BibleThemeSettingsContentProps): ReactElement {
  return (
    <div data-yv-sdk className="yv:flex yv:flex-col yv:gap-4 yv:p-4">
      <div className="yv:grid yv:grid-cols-2">
        <Button
          className="yv:text-xs yv:text-black yv:dark:text-muted-foreground yv:rounded-l-[8px] yv:rounded-r-none yv:border yv:border-white yv:dark:border-border yv:h-auto yv:py-2"
          onClick={onFontDecreased}
          size="lg"
          variant="secondary"
          data-testid="decrease-font-size"
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
              Font
            </span>
            <span className="yv:sm:text-xl yv:text-base">Inter</span>
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
              Font
            </span>
            <span className="yv:sm:text-xl yv:text-base yv:font-serif">Source Serif</span>
          </div>
        </Button>
      </div>
    </div>
  );
}

export type BibleReaderToolbarProps = {
  border?: 'top' | 'bottom';
  onOpenBibleThemeSettings?: (data: BibleThemeSettingsData) => void;
};

function Toolbar({ border = 'top', onOpenBibleThemeSettings }: BibleReaderToolbarProps) {
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
  } = useBibleReaderContext();
  const yvContext = useContext(YouVersionContext);
  const settingsValuesRef = useRef<BibleThemeSettingsValues>({
    fontSize: currentFontSize,
    fontFamily: currentFontFamily,
  });

  settingsValuesRef.current = {
    fontSize: currentFontSize,
    fontFamily: currentFontFamily,
  };

  const applySettings = (settings: BibleThemeSettingsValues): BibleThemeSettingsValues => {
    const nextSettings = {
      fontSize: clampFontSize(settings.fontSize),
      fontFamily: settings.fontFamily,
    };

    settingsValuesRef.current = nextSettings;
    setCurrentFontSize(nextSettings.fontSize);
    setCurrentFontFamily(nextSettings.fontFamily);

    return nextSettings;
  };

  const handleFontIncreased = (): BibleThemeSettingsValues => {
    const settings = settingsValuesRef.current;
    return applySettings({
      ...settings,
      fontSize: settings.fontSize + FONT_SIZE_STEP,
    });
  };

  const handleFontDecreased = (): BibleThemeSettingsValues => {
    const settings = settingsValuesRef.current;
    return applySettings({
      ...settings,
      fontSize: settings.fontSize - FONT_SIZE_STEP,
    });
  };

  const handleFontSelected = (fontFamily: FontFamily): BibleThemeSettingsValues => {
    return applySettings({
      ...settingsValuesRef.current,
      fontFamily,
    });
  };

  const buildBibleThemeSettingsPayload = (): BibleThemeSettingsData => ({
    ...settingsValuesRef.current,
    minFontSize: MIN_FONT_SIZE,
    maxFontSize: MAX_FONT_SIZE,
    onFontIncreased: handleFontIncreased,
    onFontDecreased: handleFontDecreased,
    onFontSelected: handleFontSelected,
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
        >
          <BibleChapterPicker.Trigger>
            {({ chapterLabel, currentBook, loading }) => (
              <div
                className="yv:grid yv:grid-cols-[auto_1fr_auto]
 yv:justify-start yv:grid-rows-1 yv:overflow-hidden yv:rounded-full yv:min-w-30 yv:bg-muted yv:text-muted-foreground yv:hover:bg-muted/80"
              >
                <Button
                  className="yv:min-w-0 yv:group yv:place-self-center yv:max-size-9 yv:touch-hitbox"
                  size="icon"
                  variant="ghost"
                  disabled={!canNavigatePrevious}
                  aria-label="Previous chapter"
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
                  aria-label="Change Bible book and chapter"
                >
                  {loading ? (
                    <LoaderIcon className="yv:size-4 yv:animate-spin yv:text-muted-foreground" />
                  ) : (
                    <>
                      <span className="yv:min-w-[3ch] yv:truncate">
                        {currentBook?.title || 'Select'}
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
                  aria-label="Next chapter"
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
        >
          <BibleVersionPicker.Trigger aria-label="Change Bible version">
            {({ version, loading }) => (
              <Button
                size="lg"
                variant="secondary"
                className="yv:min-w-[calc(0.25rem*4*2+3ch)] yv:px-4 yv:font-bold yv:text-foreground"
                disabled={loading}
                aria-label={loading ? 'Loading Bible version' : 'Change Bible version'}
              >
                {/* This div exists merely as a wrapper to minimize width layout shifting */}
                <div className="yv:min-w-[3ch] yv:flex yv:justify-center">
                  {loading ? (
                    <LoaderIcon className="yv:size-4 yv:animate-spin yv:text-muted-foreground" />
                  ) : (
                    <span className="yv:truncate">
                      {version?.localized_abbreviation || 'Select version'}
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
            aria-label="Settings"
            onClick={() => onOpenBibleThemeSettings(buildBibleThemeSettingsPayload())}
          >
            <GearIcon className="yv:text-foreground" />
          </Button>
        ) : (
          <Popover>
            <PopoverTrigger asChild aria-label="Settings">
              <Button size="sm" variant="secondary">
                <GearIcon className="yv:text-foreground" />
              </Button>
            </PopoverTrigger>

            <PopoverContent sideOffset={16} heading="Reader Settings" theme={background}>
              <BibleThemeSettingsContent
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
