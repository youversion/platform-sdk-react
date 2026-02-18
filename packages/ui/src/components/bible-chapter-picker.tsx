import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { useBooks, useTheme } from '@youversion/platform-react-hooks';
import { type BibleBook } from '@youversion/platform-core';
import { InfoIcon } from './icons/info';
import { SearchIcon } from './icons/search';
import { Button } from './ui/button';
import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from './ui/popover';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import { InputGroup, InputGroupInput, InputGroupAddon } from './ui/input-group';

type BibleChapterPickerContextType = {
  book: string;
  chapter: string;
  setBook: (book: string) => void;
  setChapter: (chapter: string) => void;
  versionId: number;
  background: 'light' | 'dark';
  scrollToCurrentBook: () => void;
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
  children?: ReactNode;
};

function Root({
  book: controlledBook,
  defaultBook = '',
  onBookChange,
  chapter: controlledChapter,
  defaultChapter = '',
  onChapterChange,
  versionId,
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

  const providerTheme = useTheme();
  const theme = background || providerTheme;

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBook, setExpandedBook] = useState<string | null>(book || null);

  const { books } = useBooks(versionId);

  const filteredBooks = useMemo(() => {
    if (!books?.data) return null;
    if (searchQuery.trim() === '') return books.data;
    return books.data.filter((book) =>
      book.title?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [books?.data, searchQuery]);

  const bookElementsRef = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollToCurrentBook = () => {
    if (book) {
      setExpandedBook(book);
      setTimeout(() => {
        bookElementsRef.current[book]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 200);
    }
  };

  // When an accordion is expanded, scroll that book into view
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

  const handleChapterButtonClick = (bookId: string, passageId: string) => {
    const chapterId = passageId.split('.').pop() || '';
    if (chapterId && bookId) {
      setBook(bookId);
      setChapter(chapterId);
      setSearchQuery('');
    }
  };

  return (
    <Popover>
      <BibleChapterPickerContext.Provider
        value={{
          book,
          chapter,
          setBook,
          setChapter,
          versionId,
          background: theme,
          scrollToCurrentBook,
        }}
      >
        {children}

        {/* data-yv-sdk for styles is needed because the popover gets rendered outside of the providers scope **/}
        <PopoverContent sideOffset={16} heading="Books" theme={theme} side="top">
          <Accordion
            className="yv:relative yv:overflow-y-auto yv:bg-background yv:px-6"
            type="single"
            collapsible
            defaultValue={defaultBook || book || 'GEN'}
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
                          <PopoverClose asChild key={`${bookItem.id}-${bookItem.intro.passage_id}`}>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="yv:aspect-square yv:w-full yv:h-full yv:flex yv:items-center yv:justify-center yv:rounded-[4px]"
                              onClick={() =>
                                handleChapterButtonClick(
                                  bookItem.id,
                                  bookItem.intro?.passage_id || '',
                                )
                              }
                            >
                              <InfoIcon />
                            </Button>
                          </PopoverClose>
                        ) : null}
                        {bookItem.chapters.map((chapterRef) => {
                          const chapterId = chapterRef.passage_id.split('.').pop() || '';
                          return (
                            <PopoverClose asChild key={`${bookItem.id}-${chapterRef.passage_id}`}>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="yv:aspect-square yv:w-full yv:h-full yv:flex yv:items-center yv:justify-center yv:rounded-[4px]"
                                onClick={() =>
                                  handleChapterButtonClick(bookItem.id, chapterRef.passage_id)
                                }
                              >
                                {chapterId}
                              </Button>
                            </PopoverClose>
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
        </PopoverContent>
      </BibleChapterPickerContext.Provider>
    </Popover>
  );
}

export type TriggerProps = Omit<React.ComponentProps<typeof PopoverTrigger>, 'children'> & {
  children?:
    | React.ReactNode
    | ((props: {
        book: string;
        /** Raw chapter ID as passed to the Root component (e.g. "GEN.1", "GEN.INTRO"). */
        chapter: string;
        /** Display label for the current chapter (e.g. "1", "Intro"). */
        chapterLabel: string;
        currentBook: BibleBook | undefined;
        loading: boolean;
      }) => React.ReactNode);
};

function Trigger({ asChild = true, children, ...props }: TriggerProps) {
  const { book, chapter, background, versionId, scrollToCurrentBook } =
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

  return (
    <PopoverTrigger
      data-yv-sdk
      data-yv-theme={theme}
      asChild={asChild}
      onClick={scrollToCurrentBook}
      {...props}
    >
      {content}
    </PopoverTrigger>
  );
}

export const BibleChapterPicker = Object.assign({}, { Root, Trigger });
