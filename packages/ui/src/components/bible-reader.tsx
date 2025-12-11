'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { useBooks, useVersion, YouVersionContext } from '@youversion/platform-react-hooks';
import { BibleChapterPicker } from './bible-chapter-picker';
import { BibleVersionPicker } from './bible-version-picker';
import { BibleTextView } from './verse';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

type BibleReaderContextType = {
  book: string;
  chapter: string;
  versionId: number;
  setBook: React.Dispatch<React.SetStateAction<string>>;
  setChapter: React.Dispatch<React.SetStateAction<string>>;
  setVersionId: React.Dispatch<React.SetStateAction<number>>;
  fontFamily?: string;
  fontSize?: number;
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
  fontFamily,
  fontSize = 16,
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

  const context = useContext(YouVersionContext);
  const theme = background || context?.theme;

  const contextValue: BibleReaderContextType = {
    book,
    chapter,
    versionId,
    setBook,
    setChapter,
    setVersionId,
    fontFamily,
    fontSize,
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
  const { book, chapter, versionId, fontFamily, fontSize, lineHeight, showVerseNumbers } =
    useBibleReaderContext();
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
        fontFamily={fontFamily}
        fontSize={fontSize}
        lineHeight={lineHeight}
        showVerseNumbers={showVerseNumbers}
      />

      {version?.copyright_short && (
        <footer style={{ fontSize }}>
          <p className="yv:text-balance yv:text-[0.75em] yv:text-center yv:text-muted-foreground">
            {version.copyright_short}
          </p>
        </footer>
      )}
    </main>
  );
}

function Toolbar({ border = 'top' }: { border?: 'top' | 'bottom' }) {
  const { book, chapter, versionId, setBook, setChapter, setVersionId, background } =
    useBibleReaderContext();

  return (
    <section
      className={cn(
        'yv:flex yv:justify-center yv:gap-2 yv:p-4 yv:bg-background yv:border-border',
        border === 'top' && 'yv:border-t',
        border === 'bottom' && 'yv:border-b',
      )}
    >
      <div className="yv:grid yv:w-full yv:grid-cols-2 yv:items-center yv:max-w-lg yv:gap-1">
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
    </section>
  );
}

export const BibleReader = Object.assign({}, { Root, Content, Toolbar });
export type BibleReaderRootProps = RootProps;
