/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import type { BibleBook, BiblePassage, BibleVersion } from '@youversion/platform-core';
import type {
  BibleSearchPhase,
  BibleSearchResult,
  HookOverrides,
  UseBibleSearchResult,
  UsePassageProps,
} from '@youversion/platform-react-hooks';
import { HookOverrideProvider } from '@/test/hook-overrides';
import { installResizeObserverStub } from '@/test/dom-stubs';
import { BibleReader } from './bible-reader';
import { BibleReaderSearch } from './bible-reader-search';

installResizeObserverStub();

const john316: BibleSearchResult = {
  id: 'JHN.3.16',
  book: 'JHN',
  chapter: '3',
  verses: [16],
};

const mockBooks: BibleBook[] = [
  {
    id: 'JHN',
    title: 'John',
    full_title: 'The Gospel According to John',
    canon: 'new_testament',
    abbreviation: 'John',
    chapters: [
      { id: '1', title: '1', passage_id: 'JHN.1' },
      { id: '3', title: '3', passage_id: 'JHN.3' },
    ],
  },
];

const mockVersion: BibleVersion = {
  id: 111,
  localized_abbreviation: 'NIV',
  abbreviation: 'NIV',
  title: 'New International Version',
  localized_title: 'New International Version',
  language_tag: 'en',
  books: ['JHN'],
  youversion_deep_link: 'https://bible.com/versions/111',
};

const mockPassage: BiblePassage = {
  id: 'JHN.3.16',
  content: 'For God so loved the world',
  reference: 'John 3:16 NIV',
};

const idleActions = {
  setQuery: () => undefined,
  submit: () => undefined,
  selectSuggestion: () => undefined,
  loadMore: () => undefined,
  retry: () => undefined,
};

function searchOf(phase: BibleSearchPhase, query = ''): UseBibleSearchResult {
  return { query, phase, ...idleActions };
}

function baseOverrides(search: UseBibleSearchResult): HookOverrides {
  return {
    useBooks: () => ({
      books: { data: [...mockBooks], next_page_token: null },
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
    useVersion: () => ({
      version: mockVersion,
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
    usePassage: () => ({
      passage: mockPassage,
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
    useLanguages: () => ({
      languages: { data: [], next_page_token: null },
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
    useLanguage: () => ({
      language: { id: 'en', language: 'English', display_names: { en: 'English' } },
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
    useVersions: () => ({
      versions: { data: [], next_page_token: null },
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
    useFilteredVersions: () => [],
    useOrganizations: () => ({ organizations: new Map() }),
    useBibleSearch: () => search,
  };
}

function renderSearch(search: UseBibleSearchResult, extra?: ReactElement) {
  return render(
    <HookOverrideProvider overrides={baseOverrides(search)}>
      <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
        <BibleReaderSearch defaultOpen />
        {extra}
      </BibleReader.Root>
    </HookOverrideProvider>,
  );
}

function installControlledIntersectionObserver() {
  const original = globalThis.IntersectionObserver;
  const observed = new Map<Element, IntersectionObserverCallback>();
  globalThis.IntersectionObserver = class implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '200px 0px';
    readonly scrollMargin = '0px';
    readonly thresholds = [0];
    disconnect(): void {}
    observe(target: Element): void {
      observed.set(target, this.callback);
    }
    unobserve(target: Element): void {
      observed.delete(target);
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
    constructor(private readonly callback: IntersectionObserverCallback) {}
  };
  return {
    intersect(target: Element) {
      const callback = observed.get(target);
      if (!callback) throw new Error('element is not observed');
      callback(
        // SAFETY: the callback only reads isIntersecting; target identifies the controlled row.
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        // SAFETY: neither visibility callback reads the observer argument.
        {} as IntersectionObserver,
      );
    },
    restore() {
      globalThis.IntersectionObserver = original;
    },
  };
}

describe('BibleReaderSearch', () => {
  it('lists trending queries as options', () => {
    renderSearch(
      searchOf({
        kind: 'trending',
        queries: [{ text: 'love' }, { text: 'hope' }],
        loading: false,
      }),
    );

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'love' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'hope' })).toBeInTheDocument();
  });

  it('uses a text input and one custom clear control when the query is non-empty', () => {
    renderSearch(
      searchOf(
        {
          kind: 'suggesting',
          queries: [{ text: 'love of God' }],
          loading: false,
          debouncing: false,
        },
        'love',
      ),
    );

    expect(screen.getByRole('textbox', { name: 'Search the Bible' })).toHaveAttribute(
      'type',
      'text',
    );
    expect(screen.getAllByRole('button', { name: 'Clear search' })).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Search the Bible' })).not.toHaveAttribute(
      'maxlength',
    );
  });

  it('provides a visible keyboard-operable close action', async () => {
    const user = userEvent.setup();
    renderSearch(searchOf({ kind: 'trending', queries: [], loading: false }));

    const close = screen.getByRole('button', { name: 'Close' });
    close.focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists suggestions as options', () => {
    renderSearch(
      searchOf(
        {
          kind: 'suggesting',
          queries: [{ text: 'love of God' }],
          loading: false,
          debouncing: false,
        },
        'love',
      ),
    );

    expect(screen.getByRole('option', { name: 'love of God' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('shows a status spinner while searching', () => {
    renderSearch(searchOf({ kind: 'searching' }, 'love'));

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders verse rows and load more when results are available', async () => {
    const loadMore = vi.fn();
    const search: UseBibleSearchResult = {
      ...searchOf({
        kind: 'results',
        verses: [john316],
        nextPage: 'available',
      }),
      loadMore,
    };
    const user = userEvent.setup();
    renderSearch(search);

    expect(screen.getByRole('button', { name: /john 3:16/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('enriches only near-visible rows while keeping references selectable', () => {
    const observer = installControlledIntersectionObserver();
    const passageCalls: UsePassageProps[] = [];
    const overrides = baseOverrides(
      searchOf({ kind: 'results', verses: [john316], nextPage: 'none' }),
    );
    overrides.usePassage = (props) => {
      passageCalls.push(props);
      return { passage: mockPassage, loading: false, error: null, refetch: () => undefined };
    };

    render(
      <HookOverrideProvider overrides={overrides}>
        <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
          <BibleReaderSearch defaultOpen />
        </BibleReader.Root>
      </HookOverrideProvider>,
    );

    const row = screen.getByRole('button', { name: /john 3:16/i });
    expect(passageCalls.at(-1)?.options?.enabled).toBe(false);
    expect(row).toBeEnabled();
    act(() => observer.intersect(row));
    expect(passageCalls.at(-1)?.options?.enabled).toBe(true);
    observer.restore();
  });

  it('auto-loads near the final five rows once and stops when pagination is exhausted', () => {
    const observer = installControlledIntersectionObserver();
    const loadMore = vi.fn();
    const generatedVerses = Array.from({ length: 8 }, (_, index) => ({
      ...john316,
      id: `JHN.3.${index + 1}`,
      verses: [index + 1],
    }));
    const verses: [BibleSearchResult, ...BibleSearchResult[]] = [
      generatedVerses[0]!,
      ...generatedVerses.slice(1),
    ];
    const search = {
      ...searchOf({ kind: 'results' as const, verses, nextPage: 'available' as const }),
      loadMore,
    };
    const view = renderSearch(search);
    const rows = screen.getAllByRole('button', { name: /john 3:/i });

    // Jumping to the bottom must work even if the fifth-last row was skipped.
    act(() => observer.intersect(rows[7]!.closest('li')!));
    act(() => observer.intersect(rows[3]!.closest('li')!));
    expect(loadMore).toHaveBeenCalledTimes(1);

    const next = (nextPage: 'available' | 'loading' | 'none') =>
      view.rerender(
        <HookOverrideProvider
          overrides={baseOverrides({
            ...search,
            phase: { kind: 'results', verses, nextPage },
          })}
        >
          <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
            <BibleReaderSearch defaultOpen />
          </BibleReader.Root>
        </HookOverrideProvider>,
      );
    next('loading');
    act(() => observer.intersect(rows[3]!.closest('li')!));
    expect(loadMore).toHaveBeenCalledTimes(1);
    // A duplicate-only page can retain the same rows but advance the token.
    next('available');
    act(() => observer.intersect(rows[3]!.closest('li')!));
    expect(loadMore).toHaveBeenCalledTimes(2);
    next('none');
    act(() => observer.intersect(rows[3]!.closest('li')!));
    expect(loadMore).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    observer.restore();
  });

  it('keeps the dialog open with no list when the verse search is empty', () => {
    renderSearch(searchOf({ kind: 'empty' }, 'xyzzy'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /john 3:16/i })).not.toBeInTheDocument();
  });

  it('retries a failed verse search', async () => {
    const retry = vi.fn();
    const search: UseBibleSearchResult = {
      ...searchOf({ kind: 'failed', error: new Error('network') }, 'love'),
      retry,
    };
    const user = userEvent.setup();
    renderSearch(search);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('navigates to the selected verse and closes the dialog', async () => {
    function Harness() {
      const [book, setBook] = useState('JHN');
      const [chapter, setChapter] = useState('1');
      return (
        <HookOverrideProvider
          overrides={baseOverrides(
            searchOf({
              kind: 'results',
              verses: [john316],
              nextPage: 'none',
            }),
          )}
        >
          <BibleReader.Root
            versionId={111}
            book={book}
            chapter={chapter}
            onBookChange={setBook}
            onChapterChange={setChapter}
          >
            <BibleReaderSearch defaultOpen />
            <p data-testid="location">{`${book}.${chapter}`}</p>
          </BibleReader.Root>
        </HookOverrideProvider>
      );
    }

    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByTestId('location')).toHaveTextContent('JHN.1');
    await user.click(screen.getByRole('button', { name: /john 3:16/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('JHN.3');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('BibleReader.Toolbar search control', () => {
  it('omits the search trigger when search is none', () => {
    render(
      <HookOverrideProvider
        overrides={baseOverrides(searchOf({ kind: 'trending', queries: [], loading: false }))}
      >
        <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
          <BibleReader.Toolbar search="none" />
        </BibleReader.Root>
      </HookOverrideProvider>,
    );

    expect(screen.queryByRole('button', { name: 'Search the Bible' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });
});
