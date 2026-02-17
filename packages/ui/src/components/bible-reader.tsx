'use client';

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import {
  useBooks,
  useTheme,
  useVersion,
  useYVAuth,
  YouVersionContext,
} from '@youversion/platform-react-hooks';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { DEFAULT_LICENSE_FREE_BIBLE_VERSION } from '@youversion/platform-core';
import { BibleChapterPicker } from './bible-chapter-picker';
import { BibleVersionPicker } from './bible-version-picker';
import { GearIcon } from './icons/gear';
import { InfoIcon } from './icons/info';
import { PersonIcon } from './icons/person';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { BibleTextView } from './verse';
import { INTER_FONT, SOURCE_SERIF_FONT, type FontFamily } from '@/lib/verse-html-utils';

type BibleReaderContextType = {
  book: string;
  chapter: string;
  versionId: number;
  setBook: React.Dispatch<React.SetStateAction<string>>;
  setChapter: React.Dispatch<React.SetStateAction<string>>;
  setVersionId: React.Dispatch<React.SetStateAction<number>>;
  currentFontFamily: FontFamily;
  setCurrentFontFamily: React.Dispatch<React.SetStateAction<FontFamily>>;
  currentFontSize: number;
  setCurrentFontSize: React.Dispatch<React.SetStateAction<number>>;
  lineHeight?: number;
  showVerseNumbers: boolean;
  background: 'light' | 'dark';
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
  children?: ReactNode;
};

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 20;
const DEFAULT_FONT_SIZE = 16;

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

  const contextValue: BibleReaderContextType = {
    book,
    chapter,
    versionId,
    setBook,
    setChapter,
    setVersionId,
    currentFontFamily,
    setCurrentFontFamily,
    currentFontSize,
    setCurrentFontSize,
    lineHeight,
    showVerseNumbers,
    background: theme,
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
    currentFontSize,
    currentFontFamily,
    lineHeight,
    showVerseNumbers,
  } = useBibleReaderContext();
  const { books } = useBooks(versionId);
  const { version } = useVersion(versionId);

  const bookData = useMemo(() => {
    return books?.data?.find((b) => b.id === book);
  }, [books?.data, book]);

  const usfmReference = `${book}.${chapter}`;

  return (
    <main className="yv:*:max-w-lg yv:flex yv:flex-col yv:items-center yv:gap-6 yv:overflow-y-auto yv:px-6 yv:max-sm:px-4 yv:py-12 yv:h-full">
      <h1 className="yv:flex yv:gap-2 yv:flex-col yv:justify-center yv:items-center yv:font-serif yv:text-muted-foreground yv:font-medium">
        <span
          className={cn(
            'yv:leading-none yv:block yv:text-2xl yv:transition-[filter]',
            !bookData?.title && 'yv:blur-sm',
          )}
        >
          {bookData?.title || 'Loading...'}
        </span>
        <span className="yv:leading-none yv:block yv:text-[2.5rem] yv:font-normal">
          {chapter || '-'}
        </span>
      </h1>

      <BibleTextView
        reference={usfmReference}
        versionId={versionId}
        fontFamily={currentFontFamily}
        fontSize={currentFontSize}
        lineHeight={lineHeight}
        showVerseNumbers={showVerseNumbers}
        theme={background}
      />

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

  return (
    <Popover>
      <PopoverTrigger asChild data-testid="user-menu-trigger">
        <Button size="icon" variant="secondary">
          {auth.isAuthenticated && userInfo?.avatarUrlFormat ? (
            <img
              src={userInfo.getAvatarUrl(32, 32)?.toString()}
              alt={userInfo.name || 'User avatar'}
              className="yv:size-full yv:rounded-full yv:object-cover"
            />
          ) : (
            <PersonIcon className="yv:text-foreground" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="yv:rounded-[6px] yv:w-fit! yv:px-4"
        sideOffset={16}
        showHeader={false}
      >
        {auth.isAuthenticated ? (
          <Button className="yv:card yv:text-foreground" onClick={signOut}>
            Sign Out
          </Button>
        ) : (
          <Button
            className="yv:card yv:text-foreground"
            onClick={() => void signIn({ scopes: ['profile'] })}
          >
            Sign In
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Toolbar({ border = 'top' }: { border?: 'top' | 'bottom' }) {
  const {
    book,
    chapter,
    versionId,
    setBook,
    setChapter,
    setVersionId,
    currentFontFamily,
    setCurrentFontFamily,
    setCurrentFontSize,
    background,
  } = useBibleReaderContext();
  const yvContext = useContext(YouVersionContext);

  return (
    <section
      className={cn(
        'yv:flex yv:justify-center yv:gap-2 yv:p-4 yv:bg-background yv:border-border',
        border === 'top' && 'yv:border-t',
        border === 'bottom' && 'yv:border-b',
      )}
    >
      <div className="yv:grid yv:w-full yv:grid-cols-[auto_1fr_auto] yv:items-center yv:max-w-lg yv:gap-4">
        {!!yvContext?.authEnabled && <UserMenu />}

        <div className="yv:grid yv:grid-cols-2 yv:gap-0.5">
          <BibleChapterPicker.Root
            book={book}
            chapter={chapter}
            onBookChange={setBook}
            onChapterChange={setChapter}
            versionId={versionId}
            background={background}
          >
            <BibleChapterPicker.Trigger aria-label="Change Bible book and chapter">
              {({ chapter, currentBook, loading }) => (
                <Button
                  variant="secondary"
                  className="yv:rounded-r-none yv:font-bold yv:text-foreground"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : `${currentBook?.title || 'Select'} ${chapter || ''}`}
                </Button>
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
                  variant="secondary"
                  className="yv:rounded-l-none yv:font-bold yv:text-foreground"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : version?.localized_abbreviation || 'Select version'}
                </Button>
              )}
            </BibleVersionPicker.Trigger>
            <BibleVersionPicker.Content />
          </BibleVersionPicker.Root>
        </div>

        <Popover>
          <PopoverTrigger asChild aria-label="Settings">
            <Button size="icon" variant="secondary">
              <GearIcon className="yv:text-foreground" />
            </Button>
          </PopoverTrigger>

          <PopoverContent sideOffset={16} heading="Reader Settings" theme={background}>
            <div className="yv:flex yv:flex-col yv:gap-4 yv:p-4">
              <div className="yv:grid yv:grid-cols-2">
                <Button
                  className="yv:text-xs yv:text-black yv:dark:text-muted-foreground yv:rounded-l-[8px] yv:rounded-r-none yv:border yv:border-white yv:dark:border-border yv:h-auto yv:py-2"
                  onClick={() =>
                    setCurrentFontSize((prev) => {
                      if (prev > MIN_FONT_SIZE) return prev - 2;
                      return prev;
                    })
                  }
                  size="lg"
                  variant="secondary"
                  data-testid="decrease-font-size"
                >
                  A
                </Button>
                <Button
                  className="yv:text-3xl yv:text-black yv:dark:text-muted-foreground yv:rounded-r-[8px] yv:rounded-l-none yv:border yv:border-white yv:dark:border-border yv:h-auto yv:py-2"
                  onClick={() =>
                    setCurrentFontSize((prev) => {
                      if (prev < MAX_FONT_SIZE) return prev + 2;
                      return prev;
                    })
                  }
                  size="lg"
                  variant="secondary"
                  data-testid="increase-font-size"
                >
                  A
                </Button>
              </div>
              <div className="yv:grid yv:grid-cols-2">
                <Button
                  className={cn(
                    'yv:group yv:dark:bg-muted yv:rounded-r-none yv:dark:border-border yv:rounded-l-[8px] yv:h-auto',
                    currentFontFamily === INTER_FONT
                      ? 'yv:bg-black yv:dark:bg-inherit yv:text-white yv:hover:text-white yv:hover:bg-black/80'
                      : '',
                  )}
                  onClick={() => setCurrentFontFamily(INTER_FONT)}
                  variant="outline"
                >
                  <div className="yv:flex yv:flex-col yv:w-full yv:items-start">
                    <span
                      className={cn(
                        'yv:text-xs yv:text-muted-foreground',
                        currentFontFamily === INTER_FONT
                          ? 'yv:text-muted yv:dark:text-muted-foreground yv:group-hover:text-muted'
                          : '',
                      )}
                    >
                      Font
                    </span>
                    <span className="yv:text-xl">Inter</span>
                  </div>
                </Button>
                <Button
                  className={cn(
                    'yv:group yv:dark:bg-muted yv:rounded-l-none yv:rounded-r-[8px] yv:h-auto',
                    currentFontFamily === SOURCE_SERIF_FONT
                      ? 'yv:bg-black yv:dark:bg-inherit yv:text-white yv:hover:text-white yv:hover:bg-black/80'
                      : '',
                  )}
                  onClick={() => setCurrentFontFamily(SOURCE_SERIF_FONT)}
                  variant="outline"
                >
                  <div className="yv:flex yv:flex-col yv:w-full yv:items-start">
                    <span
                      className={cn(
                        'yv:text-xs yv:text-muted-foreground',
                        currentFontFamily === SOURCE_SERIF_FONT
                          ? 'yv:text-muted yv:dark:text-muted-foreground yv:group-hover:text-muted'
                          : '',
                      )}
                    >
                      Font
                    </span>
                    <span className="yv:text-xl yv:font-serif">Source Serif</span>
                  </div>
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </section>
  );
}

export const BibleReader = Object.assign({}, { Root, Content, Toolbar });
export type BibleReaderRootProps = RootProps;
