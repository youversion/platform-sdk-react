'use client';

import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { useBooks, useVersion, useTheme } from '@youversion/platform-react-hooks';
import { BibleChapterPicker } from './bible-chapter-picker';
import { BibleVersionPicker } from './bible-version-picker';
import { BibleTextView } from './verse';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Info, Settings } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

type BibleReaderContextType = {
  book: string;
  chapter: string;
  versionId: number;
  setBook: React.Dispatch<React.SetStateAction<string>>;
  setChapter: React.Dispatch<React.SetStateAction<string>>;
  setVersionId: React.Dispatch<React.SetStateAction<number>>;
  currentFontFamily: string;
  setCurrentFontFamily: React.Dispatch<React.SetStateAction<string>>;
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
  fontFamily?: string;
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
  defaultVersionId = 111,
  onVersionChange,
  fontFamily = 'Inter',
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

  const [currentFontSize, setCurrentFontSize] = useState(() => {
    const validatedFontSize =
      fontSize > MAX_FONT_SIZE || fontSize < MIN_FONT_SIZE ? DEFAULT_FONT_SIZE : fontSize;
    if (typeof window === 'undefined') return validatedFontSize;
    const size = localStorage.getItem('youversion-platform:reader:font-size');
    return size ? parseInt(size) : validatedFontSize;
  });

  const [currentFontFamily, setCurrentFontFamily] = useState(() => {
    if (typeof window === 'undefined') return fontFamily;
    return localStorage.getItem('youversion-platform:reader:font-family') || fontFamily;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('youversion-platform:reader:font-size', currentFontSize.toString());
  }, [currentFontSize]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
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
              <Info size={12} /> Learn More
            </a>
          ) : null}
        </footer>
      )}
    </main>
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

  return (
    <section
      className={cn(
        'yv:flex yv:justify-center yv:gap-2 yv:p-4 yv:bg-background yv:border-border',
        border === 'top' && 'yv:border-t',
        border === 'bottom' && 'yv:border-b',
      )}
    >
      <div className="yv:grid yv:w-full yv:grid-cols-7 yv:items-center yv:max-w-lg yv:gap-1">
        <BibleChapterPicker.Root
          book={book}
          chapter={chapter}
          onBookChange={setBook}
          onChapterChange={setChapter}
          versionId={versionId}
          background={background}
        >
          <BibleChapterPicker.Trigger
            className="yv:col-span-2 yv:col-start-2"
            aria-label="Change Bible book and chapter"
          >
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
          <BibleVersionPicker.Trigger className="yv:col-span-2" aria-label="Change Bible version">
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
        <Popover>
          <PopoverTrigger className="yv:col-span-1">
            <Button
              aria-label="Settings"
              className="yv:px-2 yv:py-1 yv:text-foreground"
              variant="secondary"
            >
              <Settings size={24} />
            </Button>
          </PopoverTrigger>
          <PopoverContent heading="Reader Settings" theme={background}>
            <div className="yv:flex yv:flex-col yv:gap-7 yv:p-10">
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
                    currentFontFamily === 'Inter'
                      ? 'yv:bg-black yv:dark:bg-inherit yv:text-white yv:hover:text-white yv:hover:bg-black/80'
                      : '',
                  )}
                  onClick={() => setCurrentFontFamily('Inter')}
                  variant="outline"
                >
                  <div className="yv:flex yv:flex-col yv:w-full yv:items-start">
                    <span
                      className={cn(
                        'yv:text-xs yv:text-muted-foreground',
                        currentFontFamily === 'Inter'
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
                    currentFontFamily === 'Source Serif'
                      ? 'yv:bg-black yv:dark:bg-inherit yv:text-white yv:hover:text-white yv:hover:bg-black/80'
                      : '',
                  )}
                  onClick={() => setCurrentFontFamily('Source Serif')}
                  variant="outline"
                >
                  <div className="yv:flex yv:flex-col yv:w-full yv:items-start">
                    <span
                      className={cn(
                        'yv:text-xs yv:text-muted-foreground',
                        currentFontFamily === 'Source Serif'
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
