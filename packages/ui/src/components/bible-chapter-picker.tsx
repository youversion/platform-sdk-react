import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { useBooks, useTheme } from '@youversion/platform-react-hooks';
import { type BibleBook } from '@youversion/platform-core';
import { InfoIcon } from './icons/info';
import { SearchIcon } from './icons/search';
import { Button } from './ui/button';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import { InputGroup, InputGroupInput, InputGroupAddon } from './ui/input-group';

export type BibleChapterPickerContentProps = {
  versionId: number;
  defaultBook?: string;
  onSelectChapter: (bookId: string, chapterId: string) => void;
  background?: 'light' | 'dark';
};

export function BibleChapterPickerContent({
  versionId,
  defaultBook,
  onSelectChapter,
}: BibleChapterPickerContentProps): ReactElement {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBook, setExpandedBook] = useState<string | null>(defaultBook || null);
  const bookElementsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const { books } = useBooks(versionId);

  const filteredBooks = useMemo(() => {
    if (!books?.data) return null;
    if (searchQuery.trim() === '') return books.data;
    return books.data.filter((book) =>
      book.title?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [books?.data, searchQuery]);

  useEffect(() => {
    if (!expandedBook) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        bookElementsRef.current[expandedBook]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [expandedBook]);

  const handleChapterClick = (bookId: string, passageId: string) => {
    const chapterId = passageId.split('.').pop() || '';
    if (chapterId && bookId) {
      onSelectChapter(bookId, chapterId);
      setSearchQuery('');
    }
  };

  return (
    <>
      <Accordion
        className="yv:relative yv:overflow-y-auto yv:bg-background yv:px-6"
        type="single"
        collapsible
        defaultValue={defaultBook || 'GEN'}
        onValueChange={setExpandedBook}
      >
        {filteredBooks && filteredBooks.length > 0 ? (
          filteredBooks.map((bookItem) => (
            <AccordionItem
              className="yv:border-b yv:border-border"
              key={bookItem.id}
              value={bookItem.id}
              id={bookItem.id}
              ref={(node) => {
                if (node) {
                  bookElementsRef.current[bookItem.id] = node;
                } else {
                  delete bookElementsRef.current[bookItem.id];
                }
              }}
            >
              <AccordionTrigger className="yv:rounded-none">{bookItem.title}</AccordionTrigger>
              <AccordionContent>
                {bookItem.chapters && bookItem.chapters.length > 0 ? (
                  <div className="yv:grid yv:grid-cols-5 yv:gap-2">
                    {bookItem.intro?.id && bookItem.intro?.passage_id ? (
                      <Button
                        key={`${bookItem.id}-${bookItem.intro.passage_id}`}
                        variant="secondary"
                        size="icon"
                        className="yv:aspect-square yv:w-full yv:h-full yv:flex yv:items-center yv:justify-center yv:rounded-[4px]"
                        onClick={() =>
                          handleChapterClick(bookItem.id, bookItem.intro?.passage_id || '')
                        }
                      >
                        <InfoIcon />
                      </Button>
                    ) : null}
                    {bookItem.chapters.map((chapterRef) => {
                      const chapterId = chapterRef.passage_id.split('.').pop() || '';
                      return (
                        <Button
                          key={`${bookItem.id}-${chapterRef.passage_id}`}
                          variant="secondary"
                          size="icon"
                          className="yv:aspect-square yv:w-full yv:h-full yv:flex yv:items-center yv:justify-center yv:rounded-[4px]"
                          onClick={() => handleChapterClick(bookItem.id, chapterRef.passage_id)}
                        >
                          {chapterId}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="yv:w-full yv:flex yv:items-center yv:justify-center yv:py-4 yv:text-muted-foreground yv:text-sm">
                    No chapters available
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))
        ) : (
          <div className="yv:w-full yv:h-full yv:flex yv:items-center yv:justify-center yv:py-4 yv:text-center yv:text-balance yv:text-muted-foreground yv:text-sm">
            We're sorry, there are no Bible results for this search.
          </div>
        )}
      </Accordion>

      <section className="yv:bg-muted yv:border-s yv:border-muted yv:p-4 yv:w-full">
        <InputGroup className="yv:rounded-3xl yv:bg-background yv:shadow-none yv:border-border">
          <InputGroupInput
            tabIndex={1}
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <InputGroupAddon align="inline-start">
            <SearchIcon className="yv:size-5 yv:text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>
      </section>
    </>
  );
}

type BibleChapterPickerContextType = {
  book: string;
  chapter: string;
  setBook: (book: string) => void;
  setChapter: (chapter: string) => void;
  versionId: number;
  background: 'light' | 'dark';
  defaultBook: string;
  onContentClick?: (props: BibleChapterPickerContentProps) => void;
  isPopoverOpen: boolean;
  setIsPopoverOpen: (open: boolean) => void;
};

const BibleChapterPickerContext = createContext<BibleChapterPickerContextType | null>(null);

function useBibleChapterPickerContext() {
  const context = useContext(BibleChapterPickerContext);
  if (!context) {
    throw new Error('BibleChapterPicker components must be used within BibleChapterPicker.Root');
  }
  return context;
}

export type RootProps = {
  book?: BibleBook['id'];
  defaultBook?: BibleBook['id'];
  onBookChange?: (book: BibleBook['id']) => void;
  chapter?: string;
  defaultChapter?: string;
  onChapterChange?: (chapter: string) => void;
  versionId: number;
  background?: 'light' | 'dark';
  onContentClick?: (props: BibleChapterPickerContentProps) => void;
  children?: ReactNode;
};

export type BibleChapterPickerRootProps = RootProps;

function Root({
  book: controlledBook,
  defaultBook = '',
  onBookChange,
  chapter: controlledChapter,
  defaultChapter = '',
  onChapterChange,
  versionId,
  background,
  onContentClick,
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

  const providerTheme = useTheme();
  const theme = background || providerTheme;

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const contextValue: BibleChapterPickerContextType = {
    book,
    chapter,
    setBook,
    setChapter,
    versionId,
    background: theme,
    defaultBook,
    onContentClick,
    isPopoverOpen,
    setIsPopoverOpen,
  };

  if (onContentClick) {
    return (
      <BibleChapterPickerContext.Provider value={contextValue}>
        {children}
      </BibleChapterPickerContext.Provider>
    );
  }

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <BibleChapterPickerContext.Provider value={contextValue}>
        {children}
      </BibleChapterPickerContext.Provider>
    </Popover>
  );
}

export type TriggerProps = Omit<React.ComponentProps<typeof PopoverTrigger>, 'children'> & {
  children?:
    | React.ReactNode
    | ((props: {
        book: string;
        /** Raw chapter ID as passed to the Root component (e.g. "1", "INTRO"). */
        chapter: string;
        /** Display label for the current chapter (e.g. "1", "Intro"). */
        chapterLabel: string;
        currentBook: BibleBook | undefined;
        loading: boolean;
      }) => React.ReactNode);
};

function Trigger({ asChild = true, children, ...props }: TriggerProps) {
  const { book, chapter, background, versionId, defaultBook, setBook, setChapter, onContentClick } =
    useBibleChapterPickerContext();
  const { books, loading } = useBooks(versionId);
  const providerTheme = useTheme();
  const theme = background || providerTheme;

  const currentBook = books?.data?.find((bookItem) => bookItem.id === book);
  let chapterLabel: string =
    currentBook?.chapters?.find((ch) => ch.id === chapter)?.title || chapter;
  if (!!currentBook?.intro && chapter === currentBook.intro.id) {
    chapterLabel = currentBook.intro.title;
  }
  const buttonText = loading
    ? 'Loading...'
    : `${currentBook?.title || 'Select a chapter'}${chapterLabel ? ` ${chapterLabel}` : ''}`;

  const content =
    typeof children === 'function'
      ? children({ book, chapter, chapterLabel, currentBook, loading })
      : children || <Button variant="secondary">{buttonText}</Button>;

  if (onContentClick) {
    const contentProps: BibleChapterPickerContentProps = {
      versionId,
      defaultBook: defaultBook || book || undefined,
      onSelectChapter: (bookId, chapterId) => {
        setBook(bookId);
        setChapter(chapterId);
      },
      background: theme,
    };
    return (
      <div
        data-yv-sdk
        data-yv-theme={theme}
        onClick={() => onContentClick(contentProps)}
        className="yv:inline-flex yv:cursor-pointer"
      >
        {content}
      </div>
    );
  }

  return (
    <PopoverTrigger data-yv-sdk data-yv-theme={theme} asChild={asChild} {...props}>
      {content}
    </PopoverTrigger>
  );
}

function Content() {
  const {
    book,
    setBook,
    setChapter,
    versionId,
    background,
    defaultBook,
    onContentClick,
    setIsPopoverOpen,
  } = useBibleChapterPickerContext();

  if (onContentClick) return null;

  return (
    <PopoverContent sideOffset={16} heading="Books" theme={background} side="top">
      <BibleChapterPickerContent
        versionId={versionId}
        defaultBook={defaultBook || book || undefined}
        onSelectChapter={(bookId, chapterId) => {
          setBook(bookId);
          setChapter(chapterId);
          setIsPopoverOpen(false);
        }}
        background={background}
      />
    </PopoverContent>
  );
}

export const BibleChapterPicker = Object.assign({}, { Root, Trigger, Content });
