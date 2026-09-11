'use client';

import i18n from '@/i18n';
import { buildVerseReference } from '@/lib/verse-share';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import type { BibleBook } from '@youversion/platform-core';
import {
  useBibleSearch,
  usePassage,
  useVersion,
  type BibleSearchResult,
  type UseBibleSearchResult,
} from '@youversion/platform-react-hooks';
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useBibleReaderContext } from './bible-reader';
import { SearchIcon } from './icons/search';
import { XIcon } from './icons/x';
import { LoaderIcon } from './icons/loader';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group';

const SEARCH_INPUT_MAX_LENGTH = 100;

export type BibleReaderSearchProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type SearchQueryItem = Readonly<{ text: string }>;

type PassageText =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly value: string }
  | { readonly status: 'unavailable' };

/**
 * Trigger, dialog, suggestion list, result list, and navigation on select.
 * Must render inside `BibleReader.Root`.
 *
 * Zero required props. Optional open control is for a host-owned trigger.
 * Fresh session on open comes from unmounting dialog content on close.
 */
export function BibleReaderSearch({
  open: openProp,
  defaultOpen,
  onOpenChange,
}: BibleReaderSearchProps): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const { background } = useBibleReaderContext();
  const [open, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        aria-label={t('bibleSearchAriaLabel')}
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="yv:text-foreground" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        {open ? (
          <DialogContent
            theme={background}
            className="yv:flex yv:max-h-[min(36rem,80vh)] yv:w-[calc(100vw-2rem)] yv:max-w-md yv:flex-col yv:gap-4 yv:p-4"
          >
            <DialogTitle className="yv:text-base yv:font-semibold">
              {t('bibleSearchDialogTitle')}
            </DialogTitle>
            <DialogDescription className="yv:sr-only">
              {t('bibleSearchPlaceholder')}
            </DialogDescription>
            <SearchPanel onClose={() => setOpen(false)} />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}

function SearchPanel({ onClose }: { onClose: () => void }): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const { versionId, navigateToVerse, booksData } = useBibleReaderContext();
  const { version } = useVersion(versionId);
  const search = useBibleSearch({ versionId });

  const onSelectVerse = (verse: BibleSearchResult): void => {
    onClose();
    navigateToVerse({ book: verse.book, chapter: verse.chapter, verses: verse.verses });
  };

  return (
    <div className="yv:flex yv:min-h-0 yv:flex-col yv:gap-3">
      <InputGroup className="yv:bg-background yv:shadow-none yv:border-border">
        <InputGroupAddon align="inline-start">
          <SearchIcon className="yv:size-5 yv:text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          type="text"
          enterKeyHint="search"
          value={search.query}
          maxLength={SEARCH_INPUT_MAX_LENGTH}
          autoFocus
          placeholder={t('bibleSearchPlaceholder')}
          aria-label={t('bibleSearchAriaLabel')}
          onChange={(event) => search.setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              search.submit();
            }
          }}
        />
        {search.query !== '' ? (
          <InputGroupAddon align="inline-end">
            <Button
              size="icon"
              variant="ghost"
              className="yv:size-7"
              aria-label={t('bibleSearchClearAriaLabel')}
              onClick={() => search.setQuery('')}
            >
              <XIcon className="yv:size-4" />
            </Button>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      <SearchPhaseBody
        search={search}
        versionId={versionId}
        booksData={booksData}
        versionAbbreviation={version?.localized_abbreviation ?? ''}
        onSelectVerse={onSelectVerse}
      />
    </div>
  );
}

function SearchPhaseBody({
  search,
  versionId,
  booksData,
  versionAbbreviation,
  onSelectVerse,
}: {
  search: UseBibleSearchResult;
  versionId: number;
  booksData: readonly BibleBook[];
  versionAbbreviation: string;
  onSelectVerse: (verse: BibleSearchResult) => void;
}): ReactElement {
  const { t } = useTranslation(undefined, { i18n });
  const phase = search.phase;

  switch (phase.kind) {
    case 'trending':
      return (
        <QueryList
          heading={t('bibleSearchTrendingHeading')}
          items={phase.queries}
          busy={phase.loading}
          onPick={search.selectSuggestion}
        />
      );
    case 'suggesting':
      return (
        <QueryList
          heading={t('bibleSearchSuggestionsHeading')}
          items={phase.queries}
          busy={phase.loading}
          onPick={search.selectSuggestion}
        />
      );
    case 'searching':
      return (
        <div className="yv:flex yv:justify-center yv:py-8">
          <LoaderIcon className="yv:size-5 yv:animate-spin yv:text-muted-foreground" />
        </div>
      );
    case 'results':
      return (
        <VerseResults
          verses={phase.verses}
          nextPage={phase.nextPage}
          versionId={versionId}
          booksData={booksData}
          versionAbbreviation={versionAbbreviation}
          onLoadMore={search.loadMore}
          onRetry={search.retry}
          onSelect={onSelectVerse}
        />
      );
    case 'empty':
      return (
        <p className="yv:text-sm yv:text-muted-foreground">{t('bibleSearchNoVerseResults')}</p>
      );
    case 'failed':
      return (
        <div className="yv:flex yv:flex-col yv:gap-2">
          <p className="yv:text-sm yv:text-muted-foreground">{t('bibleSearchFailure')}</p>
          <Button variant="secondary" onClick={search.retry}>
            {t('bibleSearchRetry')}
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
  items,
  busy,
  onPick,
}: {
  heading: string;
  items: readonly SearchQueryItem[];
  busy: boolean;
  onPick: (text: string) => void;
}): ReactElement {
  return (
    <div className="yv:flex yv:min-h-0 yv:flex-col yv:gap-2">
      <p className="yv:text-xs yv:font-medium yv:uppercase yv:tracking-wide yv:text-muted-foreground">
        {heading}
      </p>
      {busy ? (
        <div className="yv:flex yv:justify-center yv:py-4">
          <LoaderIcon className="yv:size-5 yv:animate-spin yv:text-muted-foreground" />
        </div>
      ) : (
        <ul role="listbox" className="yv:flex yv:min-h-0 yv:flex-col yv:overflow-y-auto">
          {items.map((item) => (
            <li key={item.text} role="option" aria-selected="false">
              <button
                type="button"
                className="yv:w-full yv:rounded-md yv:px-2 yv:py-2 yv:text-start yv:text-sm yv:hover:bg-muted"
                onClick={() => onPick(item.text)}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VerseResults({
  verses,
  nextPage,
  versionId,
  booksData,
  versionAbbreviation,
  onLoadMore,
  onRetry,
  onSelect,
}: {
  verses: readonly [BibleSearchResult, ...BibleSearchResult[]];
  nextPage: 'none' | 'available' | 'loading' | 'failed';
  versionId: number;
  booksData: readonly BibleBook[];
  versionAbbreviation: string;
  onLoadMore: () => void;
  onRetry: () => void;
  onSelect: (verse: BibleSearchResult) => void;
}): ReactElement {
  const { t } = useTranslation(undefined, { i18n });

  return (
    <div className="yv:flex yv:min-h-0 yv:flex-col yv:gap-2">
      <ul className="yv:flex yv:min-h-0 yv:flex-col yv:gap-1 yv:overflow-y-auto">
        {verses.map((verse) => (
          <li key={verse.id}>
            <SearchVerseRow
              verse={verse}
              versionId={versionId}
              bookName={booksData.find((book) => book.id === verse.book)?.title ?? verse.book}
              versionAbbreviation={versionAbbreviation}
              onSelect={() => onSelect(verse)}
            />
          </li>
        ))}
      </ul>
      {nextPage === 'available' ? (
        <Button variant="secondary" onClick={onLoadMore}>
          {t('bibleSearchLoadMore')}
        </Button>
      ) : null}
      {nextPage === 'loading' ? (
        <div className="yv:flex yv:justify-center yv:py-2">
          <LoaderIcon className="yv:size-5 yv:animate-spin yv:text-muted-foreground" />
        </div>
      ) : null}
      {nextPage === 'failed' ? (
        <Button variant="secondary" onClick={onRetry}>
          {t('bibleSearchRetry')}
        </Button>
      ) : null}
    </div>
  );
}

function verseRowLabel(
  verse: BibleSearchResult,
  bookName: string,
  versionAbbreviation: string,
  passageReference: string | null,
): string {
  if (passageReference !== null) {
    return passageReference;
  }
  if (verse.verses.length === 0) {
    return [bookName, verse.chapter, versionAbbreviation].filter(Boolean).join(' ');
  }
  return buildVerseReference({
    bookName,
    chapter: verse.chapter,
    verses: [...verse.verses],
    versionAbbreviation,
  });
}

function SearchVerseRow({
  verse,
  versionId,
  bookName,
  versionAbbreviation,
  onSelect,
}: {
  verse: BibleSearchResult;
  versionId: number;
  bookName: string;
  versionAbbreviation: string;
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

  const text: PassageText = loading
    ? { status: 'loading' }
    : error !== null || passage === null
      ? { status: 'unavailable' }
      : { status: 'ready', value: passage.content };

  const label = verseRowLabel(
    verse,
    bookName,
    versionAbbreviation,
    text.status === 'ready' && passage !== null ? passage.reference : null,
  );

  return (
    <button
      type="button"
      className="yv:flex yv:w-full yv:flex-col yv:gap-1 yv:rounded-md yv:px-2 yv:py-2 yv:text-start yv:hover:bg-muted"
      onClick={onSelect}
    >
      <span className="yv:text-xs yv:font-medium yv:text-muted-foreground">{label}</span>
      {text.status === 'loading' ? (
        <span className="yv:h-4 yv:w-full yv:animate-pulse yv:rounded yv:bg-muted" />
      ) : text.status === 'ready' ? (
        <span className="yv:line-clamp-2 yv:text-sm">{text.value}</span>
      ) : null}
    </button>
  );
}
