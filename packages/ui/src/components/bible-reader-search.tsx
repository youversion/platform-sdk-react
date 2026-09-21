'use client';

import i18n from '@/i18n';
import { buildVerseReference } from '@/lib/verse-share';
import { useRecentSearches } from '@/lib/use-recent-searches';
import { cn } from '@/lib/utils';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import type { BibleBook } from '@youversion/platform-core';
import {
  useBibleSearch,
  usePassage,
  type BibleSearchResult,
  type UseBibleSearchResult,
} from '@youversion/platform-react-hooks';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type RefCallback,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useBibleReaderContext } from './bible-reader';
import { SearchIcon } from './icons/search';
import { XIcon } from './icons/x';
import { LoaderIcon } from './icons/loader';
import { FlameIcon } from './icons/flame';
import { ClockBackIcon } from './icons/clock-back';
import { ChevronBackwardIcon } from './icons/chevron-backward';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group';

export type BibleReaderSearchProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Serializable snapshot for host-owned search, including Expo DOM callbacks. */
export type BibleReaderSearchPressData = {
  versionId: number;
  book: string;
  chapter: string;
};

type SearchQueryItem = Readonly<{ text: string }>;

type PassageText =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly value: string }
  | { readonly status: 'unavailable' };

/**
 * Trigger, popover, suggestion list, result list, and navigation on select.
 * Must render inside `BibleReader.Root`.
 *
 * Zero required props. Optional open control is for a host-owned trigger.
 * Fresh session on open comes from unmounting popover content on close.
 */
export function BibleReaderSearch({
  open: openProp,
  defaultOpen,
  onOpenChange,
}: BibleReaderSearchProps): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const { background, onSearchPress, versionId, book, chapter } = useBibleReaderContext();
  const history = useRecentSearches();
  const navigating = useRef(false);
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });

  if (onSearchPress) {
    return (
      <Button
        size="sm"
        variant="secondary"
        aria-label={t('bibleSearchAriaLabel', 'Search the Bible')}
        onClick={() => {
          void onSearchPress({ versionId, book, chapter });
        }}
      >
        <SearchIcon className="yv:text-foreground" />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="secondary"
          aria-label={t('bibleSearchAriaLabel', 'Search the Bible')}
          onClick={() => {
            navigating.current = false;
          }}
        >
          <SearchIcon className="yv:text-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        theme={background}
        showHeader={false}
        side="top"
        sideOffset={16}
        aria-label={t('bibleSearchAriaLabel', 'Search the Bible')}
        className="yv:flex yv:h-[min(32rem,var(--radix-popover-content-available-height))] yv:max-h-[calc(100dvh-2rem)] yv:w-sm yv:flex-col yv:gap-0 yv:p-4 yv:motion-reduce:data-[state=open]:animate-none yv:motion-reduce:data-[state=closed]:animate-none"
        onCloseAutoFocus={(event) => {
          if (navigating.current) event.preventDefault();
          navigating.current = false;
        }}
      >
        <SearchPanel
          {...history}
          onClose={() => setOpen(false)}
          onNavigate={() => {
            navigating.current = true;
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function SearchPanel({
  onClose,
  onNavigate,
  recentSearches,
  rememberSearch,
}: {
  onClose: () => void;
  onNavigate: () => void;
  recentSearches: readonly string[];
  rememberSearch: (query: string) => void;
}): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const { versionId, navigation, booksData, booksLoading } = useBibleReaderContext();
  const [testament, setTestament] = useState<'both' | 'old_testament' | 'new_testament'>('both');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [animateFilters, setAnimateFilters] = useState(false);
  const filtersId = useId();
  const testamentOptions = [
    ['old_testament', t('oldTestamentHeading', 'Old Testament')],
    ['new_testament', t('newTestamentHeading', 'New Testament')],
    ['both', t('bibleSearchBothTestaments', 'Both')],
  ] as const;
  const search = useBibleSearch({
    versionId,
    bookIds:
      testament === 'both'
        ? undefined
        : booksData.filter((book) => book.canon === testament).map((book) => book.id),
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasQuery = search.query !== '';
  const showingResults = !['trending', 'suggesting'].includes(search.phase.kind);
  const resetSearch = (): void => {
    search.setQuery('');
    setTestament('both');
    setFiltersOpen(false);
    inputRef.current?.focus();
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const onPick = (text: string): void => {
    rememberSearch(text);
    search.selectSuggestion(text);
    inputRef.current?.focus();
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const onSelectVerse = (verse: BibleSearchResult): void => {
    onNavigate();
    navigation.focusReference({ versionId, passageId: verse.id });
  };

  return (
    <div className="yv:flex yv:min-h-0 yv:flex-1 yv:flex-col yv:gap-6">
      <div className="yv:flex yv:shrink-0 yv:items-center yv:gap-3">
        {showingResults ? (
          <Button
            variant="ghost"
            size="icon"
            className="yv:size-9 yv:rounded-full yv:transition-none"
            aria-label={t('bibleSearchBackAriaLabel', 'Back to search')}
            onClick={resetSearch}
          >
            <ChevronBackwardIcon className="yv:size-5" />
          </Button>
        ) : null}
        <InputGroup className="yv:h-12 yv:rounded-full yv:border-transparent yv:bg-muted yv:shadow-none yv:transition-none">
          <InputGroupAddon align="inline-start">
            <SearchIcon className="yv:size-5 yv:text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            ref={inputRef}
            className="yv:text-base yv:md:text-base"
            type="text"
            enterKeyHint="search"
            value={search.query}
            autoFocus
            placeholder={t('searchPlaceholder')}
            aria-label={t('bibleSearchAriaLabel', 'Search the Bible')}
            onChange={(event) => search.setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                rememberSearch(search.query);
                search.submit();
                if (scrollRef.current) scrollRef.current.scrollTop = 0;
              }
            }}
          />
          {search.query !== '' ? (
            <InputGroupAddon align="inline-end">
              <Button
                size="icon"
                variant="ghost"
                className="yv:size-9 yv:rounded-full yv:transition-none"
                aria-label={t('bibleSearchClearAriaLabel', 'Clear search')}
                onClick={resetSearch}
              >
                <XIcon className="yv:size-4" />
              </Button>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
        {!hasQuery ? (
          <Button
            variant="ghost"
            size="icon"
            className="yv:size-9 yv:rounded-full yv:text-muted-foreground yv:transition-none"
            aria-label={t('bibleSearchCloseAriaLabel', 'Close search')}
            onClick={onClose}
          >
            <XIcon className="yv:size-5" />
          </Button>
        ) : null}
      </div>
      {showingResults ? (
        <div className="yv:flex yv:shrink-0 yv:flex-col">
          <div className="yv:flex yv:items-center yv:justify-between yv:gap-3">
            <h3 className="yv:text-xl yv:font-bold">{t('bibleSearchBibleHeading', 'Bible')}</h3>
            <Button
              variant={filtersOpen ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'yv:rounded-full yv:font-normal yv:transition-none',
                !filtersOpen &&
                  testament !== 'both' &&
                  'yv:bg-foreground yv:text-background yv:hover:bg-foreground yv:hover:text-background yv:dark:hover:bg-foreground',
              )}
              aria-expanded={filtersOpen}
              aria-controls={filtersId}
              aria-label={t('filters', 'Filters')}
              aria-describedby={testament === 'both' ? undefined : `${filtersId}-selection`}
              onClick={(event) => {
                setAnimateFilters(event.detail !== 0);
                setFiltersOpen((previous) => !previous);
              }}
            >
              {t('filters', 'Filters')}
              {testament !== 'both' ? (
                <span id={`${filtersId}-selection`} className="yv:sr-only">
                  {testamentOptions.find(([value]) => value === testament)?.[1]}
                </span>
              ) : null}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="yv:size-5"
              >
                <path d="M3 6h18M7 12h10M11 18h2" />
              </svg>
            </Button>
          </div>
          <div
            className={cn(
              'yv:grid yv:-mx-1 yv:transition-[grid-template-rows,opacity] yv:duration-200 yv:ease-[cubic-bezier(0.23,1,0.32,1)] yv:motion-reduce:transition-opacity',
              filtersOpen ? 'yv:grid-rows-[1fr] yv:opacity-100' : 'yv:grid-rows-[0fr] yv:opacity-0',
              !animateFilters && 'yv:transition-none yv:motion-reduce:transition-none',
            )}
            inert={!filtersOpen}
            aria-hidden={!filtersOpen}
          >
            <div className="yv:min-h-0 yv:overflow-hidden">
              <div
                id={filtersId}
                role="group"
                aria-label={t('bibleSearchTestamentFilter', 'Filter by testament')}
                className="yv:flex yv:flex-wrap yv:gap-2 yv:px-1 yv:pt-3 yv:pb-1"
              >
                {testamentOptions.map(([value, label]) => (
                  <Button
                    key={value}
                    variant="outline"
                    size="sm"
                    aria-pressed={testament === value}
                    disabled={value !== 'both' && (booksLoading || booksData.length === 0)}
                    className="yv:h-8 yv:rounded-full yv:px-3 yv:font-normal yv:shadow-none yv:transition-none yv:aria-pressed:bg-foreground yv:aria-pressed:text-background yv:aria-pressed:hover:bg-foreground yv:aria-pressed:hover:text-background yv:dark:aria-pressed:bg-foreground yv:dark:aria-pressed:hover:bg-foreground"
                    onClick={() => {
                      setTestament(value);
                      if (scrollRef.current) scrollRef.current.scrollTop = 0;
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <div
        ref={scrollRef}
        className="yv:min-h-0 yv:flex-1 yv:overflow-y-auto yv:overscroll-contain yv:px-3 yv:-mx-3 yv:py-1 yv:-my-1"
      >
        <SearchPhaseBody
          search={search}
          recentSearches={recentSearches}
          onPick={onPick}
          versionId={versionId}
          booksData={booksData}
          onSelectVerse={onSelectVerse}
        />
      </div>
    </div>
  );
}

function SearchPhaseBody({
  search,
  recentSearches,
  onPick,
  versionId,
  booksData,
  onSelectVerse,
}: {
  search: UseBibleSearchResult;
  recentSearches: readonly string[];
  onPick: (text: string) => void;
  versionId: number;
  booksData: readonly BibleBook[];
  onSelectVerse: (verse: BibleSearchResult) => void;
}): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const phase = search.phase;

  switch (phase.kind) {
    case 'trending':
      return (
        <div className="yv:flex yv:flex-col yv:gap-8">
          <QueryList
            heading={t('bibleSearchTrendingHeading', 'Trending Searches')}
            icon="trending"
            items={phase.queries.slice(0, 3)}
            busy={phase.loading}
            error={phase.error}
            onRetry={search.retry}
            onPick={onPick}
          />
          {recentSearches.length > 0 ? (
            <QueryList
              heading={t('bibleSearchRecentHeading', 'Recent Searches')}
              icon="recent"
              items={recentSearches.slice(0, 3).map((text) => ({ text }))}
              busy={false}
              onPick={onPick}
            />
          ) : null}
        </div>
      );
    case 'suggesting':
      return (
        <QueryList
          heading={t('bibleSearchSuggestionsHeading', 'Suggestions')}
          items={phase.queries}
          busy={phase.loading}
          error={phase.error}
          onRetry={search.retry}
          onPick={onPick}
        />
      );
    case 'searching':
      return (
        <div className="yv:flex yv:justify-center yv:py-8">
          <LoaderIcon className="yv:size-5 yv:motion-safe:animate-spin yv:text-muted-foreground" />
        </div>
      );
    case 'results':
      return (
        <VerseResults
          key={versionId}
          verses={phase.verses}
          nextPage={phase.nextPage}
          versionId={versionId}
          booksData={booksData}
          onLoadMore={search.loadMore}
          onRetry={search.retry}
          onSelect={onSelectVerse}
        />
      );
    case 'empty':
      return (
        <p role="status" className="yv:py-8 yv:text-center yv:text-sm yv:text-muted-foreground">
          {t('noBibleSearchResults')}
        </p>
      );
    case 'failed':
      return (
        <div role="alert" className="yv:flex yv:flex-col yv:gap-2">
          <p className="yv:text-sm yv:text-muted-foreground">
            {t('bibleSearchFailure', "We couldn't complete this search. Try again.")}
          </p>
          <Button variant="secondary" onClick={search.retry}>
            {t('bibleSearchRetry', 'Try again')}
          </Button>
        </div>
      );
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function QueryList({
  heading,
  icon,
  items,
  busy,
  error,
  onRetry,
  onPick,
}: {
  heading: string;
  icon?: 'trending' | 'recent';
  items: readonly SearchQueryItem[];
  busy: boolean;
  error?: Error;
  onRetry?: () => void;
  onPick: (text: string) => void;
}): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const headingId = useId();
  const Icon = icon === 'trending' ? FlameIcon : icon === 'recent' ? ClockBackIcon : SearchIcon;
  return (
    <section aria-labelledby={headingId} className="yv:flex yv:flex-col yv:gap-2">
      <h3 id={headingId} className="yv:text-base yv:font-bold">
        {heading}
      </h3>
      {busy ? (
        <div className="yv:flex yv:justify-center yv:py-4">
          <LoaderIcon className="yv:size-5 yv:motion-safe:animate-spin yv:text-muted-foreground" />
        </div>
      ) : error ? (
        <div role="alert" className="yv:flex yv:flex-col yv:items-start yv:gap-3 yv:py-2">
          <p className="yv:text-sm yv:text-muted-foreground">
            {t(
              'bibleSearchQueriesFailure',
              "We couldn't load search suggestions. You can still search by typing a query.",
            )}
          </p>
          <Button variant="secondary" onClick={onRetry}>
            {t('bibleSearchRetry', 'Try again')}
          </Button>
        </div>
      ) : (
        <ul className="yv:flex yv:flex-col">
          {items.map((item) => (
            <li key={item.text}>
              <button
                type="button"
                className="yv:group yv:flex yv:min-h-12 yv:w-[calc(100%+1rem)] yv:-mx-2 yv:px-2 yv:cursor-pointer yv:items-center yv:gap-3 yv:rounded-lg yv:py-2 yv:text-start yv:text-base yv:hover:bg-muted yv:focus-visible:outline-2 yv:focus-visible:outline-ring yv:active:bg-muted"
                onClick={() => onPick(item.text)}
              >
                <span
                  className="yv:flex yv:size-8 yv:shrink-0 yv:items-center yv:justify-center yv:rounded-full yv:bg-muted yv:group-hover:bg-border yv:group-focus-visible:bg-border"
                  aria-hidden="true"
                >
                  <Icon className="yv:size-6" />
                </span>
                <span className="yv:min-w-0 yv:break-words">{item.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function VerseResults({
  verses,
  nextPage,
  versionId,
  booksData,
  onLoadMore,
  onRetry,
  onSelect,
}: {
  verses: readonly [BibleSearchResult, ...BibleSearchResult[]];
  nextPage: 'none' | 'available' | 'loading' | 'failed';
  versionId: number;
  booksData: readonly BibleBook[];
  onLoadMore: () => void;
  onRetry: () => void;
  onSelect: (verse: BibleSearchResult) => void;
}): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const requested = useRef(false);
  const [settled, setSettled] = useState<ReadonlySet<string>>(() => new Set());
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set());
  const onSettled = useCallback((id: string) => {
    setSettled((previous) => (previous.has(id) ? previous : new Set([...previous, id])));
  }, []);
  const previewsLoading = verses.some((verse) => !settled.has(verse.id));
  const hasVisibleResults = verses.some((verse) => revealed.has(verse.id));
  useEffect(() => {
    if (!previewsLoading) setRevealed(new Set(verses.map((verse) => verse.id)));
  }, [previewsLoading, verses]);
  useEffect(() => {
    if (nextPage !== 'available') requested.current = false;
  }, [nextPage]);
  const loadMoreWhenNearEnd = useCallback(() => {
    if (nextPage !== 'available' || requested.current) return;
    requested.current = true;
    onLoadMore();
  }, [nextPage, onLoadMore]);
  const paginationTriggerRef = useIntersectionCallback(loadMoreWhenNearEnd);
  const paginationTriggerIndex = Math.max(0, verses.length - 5);

  return (
    <div className="yv:flex yv:min-h-0 yv:flex-col yv:gap-2">
      <ul className={cn('yv:flex yv:flex-col', !hasVisibleResults && 'yv:hidden')}>
        {verses.map((verse, index) => (
          <li
            key={verse.id}
            hidden={!revealed.has(verse.id)}
            className="yv:transition-[opacity,transform] yv:duration-150 yv:ease-[cubic-bezier(0.23,1,0.32,1)] yv:starting:opacity-0 yv:motion-safe:starting:[transform:translateY(4px)] yv:motion-reduce:duration-100"
            ref={
              !previewsLoading && index >= paginationTriggerIndex ? paginationTriggerRef : undefined
            }
          >
            <SearchVerseRow
              verse={verse}
              versionId={versionId}
              bookName={booksData.find((book) => book.id === verse.book)?.title}
              onSettled={onSettled}
              onSelect={() => onSelect(verse)}
            />
          </li>
        ))}
      </ul>
      {nextPage === 'available' && !previewsLoading ? (
        <Button variant="secondary" onClick={loadMoreWhenNearEnd}>
          {t('bibleSearchLoadMore', 'Load more')}
        </Button>
      ) : null}
      {nextPage === 'loading' || previewsLoading ? (
        <div className="yv:flex yv:justify-center yv:py-8">
          <LoaderIcon className="yv:size-5 yv:motion-safe:animate-spin yv:text-muted-foreground" />
        </div>
      ) : null}
      {nextPage === 'failed' ? (
        <div role="alert" className="yv:flex yv:flex-col yv:gap-2">
          <p className="yv:text-sm yv:text-muted-foreground">
            {t('bibleSearchFailure', "We couldn't complete this search. Try again.")}
          </p>
          <Button variant="secondary" onClick={onRetry}>
            {t('bibleSearchRetry', 'Try again')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function verseRowLabel(verse: BibleSearchResult, bookName: string | undefined): string {
  if (bookName === undefined) return verse.id;
  if (verse.verses.length === 0) {
    return `${bookName} ${verse.chapter}`;
  }
  return buildVerseReference({
    bookName,
    chapter: verse.chapter,
    verses: [...verse.verses],
    versionAbbreviation: '',
  });
}

function SearchVerseRow({
  verse,
  versionId,
  bookName,
  onSettled,
  onSelect,
}: {
  verse: BibleSearchResult;
  versionId: number;
  bookName: string | undefined;
  onSettled: (id: string) => void;
  onSelect: () => void;
}): ReactElement {
  const { passage, loading, error } = usePassage({
    versionId,
    usfm: verse.id,
    format: 'text',
    include_headings: false,
    include_notes: false,
    options: { keepPreviousData: false },
  });
  useEffect(() => {
    if (!loading) onSettled(verse.id);
  }, [loading, onSettled, verse.id]);

  const text: PassageText = loading
    ? { status: 'loading' }
    : error !== null || passage === null
      ? { status: 'unavailable' }
      : { status: 'ready', value: passage.content };

  const label = verseRowLabel(verse, bookName);

  return (
    <button
      type="button"
      className="yv:flex yv:w-[calc(100%+1rem)] yv:-mx-2 yv:px-2 yv:cursor-pointer yv:flex-col yv:gap-2 yv:rounded-[4px] yv:py-3 yv:text-start yv:hover:bg-muted yv:focus-visible:outline-2 yv:focus-visible:outline-ring yv:active:bg-muted"
      onClick={onSelect}
    >
      <span className="yv:text-base yv:font-semibold" dir="auto">
        {label}
      </span>
      {text.status === 'ready' ? (
        <span className="yv:flex yv:w-full yv:gap-3">
          <span
            aria-hidden="true"
            className="yv:w-[3px] yv:shrink-0 yv:self-stretch yv:rounded-full yv:bg-border"
          />
          <span
            className="yv:line-clamp-3 yv:min-w-0 yv:font-serif yv:text-lg yv:leading-7"
            dir="auto"
          >
            {verse.verses[0] !== undefined ? (
              <span
                aria-hidden="true"
                className="yv:me-1 yv:align-super yv:font-sans yv:text-xs yv:text-muted-foreground"
              >
                {verse.verses[0]}
              </span>
            ) : null}
            {text.value.trim()}
          </span>
        </span>
      ) : null}
    </button>
  );
}

const PREFETCH_ROOT_MARGIN = '200px 0px';

function useIntersectionCallback(onIntersect: () => void): RefCallback<Element> {
  return useCallback<RefCallback<Element>>(
    (element) => {
      if (element === null || globalThis.IntersectionObserver === undefined) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) onIntersect();
        },
        { rootMargin: PREFETCH_ROOT_MARGIN },
      );
      observer.observe(element);
      return () => observer.disconnect();
    },
    [onIntersect],
  );
}
