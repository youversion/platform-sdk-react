'use client';

import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { useBooks, useTheme } from '@youversion/platform-react-hooks';
import { type BibleBook } from '@youversion/platform-core';
import { InfoIcon } from './icons/info';
import { SearchIcon } from './icons/search';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import { InputGroup, InputGroupInput, InputGroupAddon } from './ui/input-group';

export interface BibleChapterPickerPressData {
  book: string;
  chapter: string;
  versionId: number;
}

export type BibleChapterPickerSelectData = BibleChapterPickerPressData;

export type BibleChapterPickerContentProps = {
  onRequestClose?: () => void;
  onSelect?: (data: BibleChapterPickerSelectData) => void;
};

type BibleChapterPickerContextType = {
  book: string;
  chapter: string;
  setBook: (book: string) => void;
  setChapter: (chapter: string) => void;
  versionId: number;
  background: 'light' | 'dark';
  scrollToCurrentBook: () => void;
  defaultBook: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  expandedBook: string | null;
  setExpandedBook: (bookId: string | null) => void;
  filteredBooks: BibleBook[] | null;
  registerBookElement: (bookId: string, node: HTMLDivElement | null) => void;
  onChapterPickerPress?: (data: BibleChapterPickerPressData) => void;
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
  onChapterPickerPress?: (data: BibleChapterPickerPressData) => void;
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
  onChapterPickerPress,
  children,
}: RootProps) {
  const { t } = useTranslation(undefined, { i18n });
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

  const [isPopoverOpenRaw, setIsPopoverOpenRaw] = useState(false);
  const isPopoverOpen = onChapterPickerPress ? false : isPopoverOpenRaw;
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

  const registerBookElement = (bookId: string, node: HTMLDivElement | null) => {
    if (node) {
      bookElementsRef.current[bookId] = node;
    } else {
      delete bookElementsRef.current[bookId];
    }
  };

  const scrollToCurrentBook = () => {
    if (book) {
      setExpandedBook(book);
      setTimeout(() => {
        const element = bookElementsRef.current[book];
        if (element && typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }, 200);
    }
  };

  // When an accordion is expanded, scroll that book into view
  useEffect(() => {
    if (!expandedBook) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        const element = bookElementsRef.current[expandedBook];
        if (element && typeof element.scrollIntoView === 'function') {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      }
    }, 200);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [expandedBook]);

  const setIsPopoverOpen = (open: boolean) => {
    if (onChapterPickerPress) return;
    setIsPopoverOpenRaw(open);
    if (!open) {
      setSearchQuery('');
    }
  };

  const contextValue: BibleChapterPickerContextType = {
    book,
    chapter,
    setBook,
    setChapter,
    versionId,
    background: theme,
    scrollToCurrentBook,
    defaultBook,
    searchQuery,
    setSearchQuery,
    expandedBook,
    setExpandedBook,
    filteredBooks,
    registerBookElement,
    onChapterPickerPress,
  };

  return onChapterPickerPress ? (
    <BibleChapterPickerContext.Provider value={contextValue}>
      {children}
    </BibleChapterPickerContext.Provider>
  ) : (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <BibleChapterPickerContext.Provider value={contextValue}>
        {children}

        {/* data-yv-sdk for styles is needed because the popover gets rendered outside of the providers scope **/}
        <PopoverContent sideOffset={16} heading={t('booksHeading')} theme={theme} side="top">
          <Content onRequestClose={() => setIsPopoverOpen(false)} />
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
        /** Raw chapter ID as passed to the Root component (e.g. "1", "INTRO"). */
        chapter: string;
        /** Display label for the current chapter (e.g. "1", "Intro"). */
        chapterLabel: string;
        currentBook: BibleBook | undefined;
        loading: boolean;
      }) => React.ReactNode);
};

function Trigger({ asChild = true, children, ...props }: TriggerProps) {
  const { t } = useTranslation(undefined, { i18n });
  const { book, chapter, background, versionId, scrollToCurrentBook, onChapterPickerPress } =
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
    ? t('loadingEllipsis')
    : `${currentBook?.title || t('selectChapter')}${chapterLabel ? ` ${chapterLabel}` : ''}`;

  const content =
    typeof children === 'function'
      ? children({ book, chapter, chapterLabel, currentBook, loading })
      : children || <Button variant="secondary">{buttonText}</Button>;

  const handlePress = (event: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event);
    scrollToCurrentBook();
    if (onChapterPickerPress) {
      onChapterPickerPress({ book, chapter, versionId });
    }
  };

  if (onChapterPickerPress) {
    if (asChild && isValidElement<Record<string, unknown>>(content)) {
      return cloneElement(content, {
        'data-yv-sdk': true,
        'data-yv-theme': theme,
        ...props,
        onClick: handlePress,
      });
    }

    return (
      <button type="button" data-yv-sdk data-yv-theme={theme} {...props} onClick={handlePress}>
        {content}
      </button>
    );
  }

  const handleOpenPopover = (event: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(event);
    scrollToCurrentBook();
  };

  return (
    <PopoverTrigger
      data-yv-sdk
      data-yv-theme={theme}
      asChild={asChild}
      {...props}
      onClick={handleOpenPopover}
    >
      {content}
    </PopoverTrigger>
  );
}

function Content({ onRequestClose, onSelect }: BibleChapterPickerContentProps) {
  const { t } = useTranslation(undefined, { i18n });
  const {
    book,
    defaultBook,
    filteredBooks,
    expandedBook,
    setExpandedBook,
    searchQuery,
    setSearchQuery,
    registerBookElement,
    setBook,
    setChapter,
    versionId,
  } = useBibleChapterPickerContext();

  const handleChapterButtonClick = (bookId: string, passageId: string) => {
    const chapterId = passageId.split('.').pop() || '';
    if (chapterId && bookId) {
      setBook(bookId);
      setChapter(chapterId);
      setSearchQuery('');
      onSelect?.({ book: bookId, chapter: chapterId, versionId });
      onRequestClose?.();
    }
  };

  return (
    <>
      <Accordion
        className="yv:relative yv:overflow-y-auto yv:bg-background yv:px-6"
        type="single"
        collapsible
        defaultValue={defaultBook || book || 'GEN'}
        value={expandedBook ?? undefined}
        onValueChange={(value) => setExpandedBook(value || null)}
      >
        {filteredBooks && filteredBooks.length > 0 ? (
          filteredBooks.map((bookItem) => (
            <AccordionItem
              className="yv:border-b yv:border-border"
              key={bookItem.id}
              value={bookItem.id}
              id={bookItem.id}
              ref={(node) => registerBookElement(bookItem.id, node)}
            >
              <AccordionTrigger className="yv:rounded-none yv:text-base yv:font-normal yv:leading-normal yv:text-foreground yv:data-[state=open]:font-bold">
                {bookItem.title}
              </AccordionTrigger>
              <AccordionContent>
                {bookItem.chapters && bookItem.chapters.length > 0 ? (
                  <div className="yv:grid yv:grid-cols-5 yv:gap-2">
                    {bookItem.intro?.id && bookItem.intro?.passage_id ? (
                      <Button
                        key={`${bookItem.id}-${bookItem.intro.passage_id}`}
                        variant="secondary"
                        size="icon"
                        data-testid="intro-chapter-button"
                        className="yv:aspect-square yv:w-full yv:h-full yv:flex yv:items-center yv:justify-center yv:rounded-[4px]"
                        onClick={() =>
                          handleChapterButtonClick(bookItem.id, bookItem.intro?.passage_id || '')
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
                          className="yv:aspect-square yv:w-full yv:h-full yv:flex yv:items-center yv:justify-center yv:rounded-[4px] yv:text-base yv:font-bold yv:leading-none yv:text-foreground"
                          onClick={() =>
                            handleChapterButtonClick(bookItem.id, chapterRef.passage_id)
                          }
                        >
                          {chapterId}
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="yv:w-full yv:flex yv:items-center yv:justify-center yv:py-4 yv:text-muted-foreground yv:text-sm">
                    {t('noChaptersAvailable')}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))
        ) : (
          <div className="yv:w-full yv:h-full yv:flex yv:items-center yv:justify-center yv:py-4 yv:text-center yv:text-balance yv:text-muted-foreground yv:text-sm">
            {t('noBibleSearchResults')}
          </div>
        )}
      </Accordion>

      <section className="yv:bg-muted yv:border-s yv:border-muted yv:p-4 yv:w-full">
        <InputGroup className="yv:rounded-3xl yv:bg-background yv:shadow-none yv:border-border">
          <InputGroupInput
            tabIndex={1}
            type="text"
            placeholder={t('searchPlaceholder')}
            className="yv:text-base yv:leading-normal"
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

export const BibleChapterPicker = Object.assign({}, { Root, Trigger, Content });
