/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import type { BibleBook, BiblePassage, BibleVersion } from '@youversion/platform-core';
import type {
  BibleSearchPhase,
  BibleSearchResult,
  HookOverrides,
  UseBibleSearchResult,
} from '@youversion/platform-react-hooks';
import { HookOverrideProvider } from '@/test/hook-overrides';
import { installResizeObserverStub } from '@/test/dom-stubs';
import { RECENT_SEARCHES_KEY } from '@/lib/use-recent-searches';
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
  it('maps testament controls to book metadata and returns to discovery with one X action', async () => {
    const observed = vi.fn();
    const overrides = baseOverrides(searchOf({ kind: 'empty' }));
    overrides.useBooks = () => ({
      books: {
        data: [
          ...mockBooks,
          { ...mockBooks[0]!, id: 'GEN', title: 'Genesis', canon: 'old_testament' },
          { ...mockBooks[0]!, id: 'TOB', title: 'Tobit', canon: 'deuterocanon' },
        ],
        next_page_token: null,
      },
      loading: false,
      error: null,
      refetch: () => undefined,
    });
    overrides.useBibleSearch = function useSearchFixture(props) {
      const [query, setQuery] = useState('love');
      observed(props.bookIds);
      return {
        ...searchOf(
          query
            ? { kind: 'results', verses: [john316], nextPage: 'none' }
            : { kind: 'trending', queries: [], loading: false },
        ),
        query,
        setQuery,
      };
    };
    const user = userEvent.setup();
    render(
      <HookOverrideProvider overrides={overrides}>
        <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
          <BibleReaderSearch defaultOpen />
        </BibleReader.Root>
      </HookOverrideProvider>,
    );
    const filters = screen.getByRole('button', { name: 'Filters' });
    expect(filters).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'Filter by testament' })).not.toBeInTheDocument();
    const disclosure = document.getElementById(filters.getAttribute('aria-controls')!)!
      .parentElement!.parentElement!;
    expect(disclosure).toHaveAttribute('inert');
    filters.focus();
    await user.keyboard('{Enter}');
    expect(filters).toHaveAttribute('aria-expanded', 'true');
    expect(disclosure).not.toHaveAttribute('inert');
    expect(disclosure).toHaveClass('yv:transition-none');
    expect(filters).toHaveAttribute(
      'aria-controls',
      screen.getByRole('group', { name: 'Filter by testament' }).id,
    );
    expect(screen.getByRole('button', { name: 'Both' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Close search' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Old Testament' }));
    expect(observed).toHaveBeenLastCalledWith(['GEN']);
    await user.click(screen.getByRole('button', { name: 'New Testament' }));
    expect(observed).toHaveBeenLastCalledWith(['JHN']);
    await user.click(filters);
    expect(filters).toHaveAttribute('aria-expanded', 'false');
    expect(disclosure).toHaveAttribute('inert');
    expect(disclosure).not.toHaveClass('yv:transition-none');
    expect(filters).toHaveClass('yv:bg-foreground', 'yv:text-background');
    expect(filters).toHaveAccessibleName('Filters');
    expect(filters).toHaveAccessibleDescription('New Testament');
    expect(observed).toHaveBeenLastCalledWith(['JHN']);
    expect(screen.queryByRole('button', { name: 'New Testament' })).not.toBeInTheDocument();
    await user.click(filters);
    expect(filters).not.toHaveClass('yv:bg-foreground');
    expect(filters).toHaveClass('yv:bg-muted');
    expect(filters.querySelector('svg')).not.toHaveClass('yv:rotate-180');
    expect(screen.getByRole('button', { name: 'New Testament' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Both' }));
    expect(observed).toHaveBeenLastCalledWith(undefined);
    await user.click(filters);
    expect(filters).not.toHaveClass('yv:bg-foreground');
    expect(filters).not.toHaveClass('yv:bg-muted');
    await user.click(filters);
    await user.click(screen.getByRole('button', { name: 'New Testament' }));
    await user.click(screen.getByRole('button', { name: 'Back to search' }));
    expect(observed).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Trending Searches' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close search' })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox'), 'hope');
    expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('button', { name: 'Both' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('lists trending queries as keyboard-operable buttons', () => {
    renderSearch(
      searchOf({
        kind: 'trending',
        queries: [{ text: 'love' }, { text: 'hope' }],
        loading: false,
      }),
    );

    const trending = within(screen.getByRole('region', { name: 'Trending Searches' }));
    expect(trending.getByRole('button', { name: 'love' })).toBeInTheDocument();
    expect(trending.getByRole('button', { name: 'hope' })).toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Back to search' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close search' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search the Bible' })).not.toHaveAttribute(
      'maxlength',
    );
  });

  it('provides a visible keyboard-operable close action', async () => {
    const user = userEvent.setup();
    renderSearch(searchOf({ kind: 'trending', queries: [], loading: false }));

    const close = screen.getByRole('button', { name: 'Close search' });
    close.focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists suggestions as buttons', () => {
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

    expect(screen.getByRole('button', { name: 'love of God' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('shows a status spinner while searching', () => {
    renderSearch(searchOf({ kind: 'searching' }, 'love'));

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
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

  it('reveals previews together and retains earlier results while the next batch loads or fails', () => {
    const second = { ...john316, id: 'JHN.3.17', verses: [17] };
    const third = { ...john316, id: 'JHN.3.18', verses: [18] };
    function fixture(
      verses: [BibleSearchResult, ...BibleSearchResult[]],
      pending: string[],
      failed: string[] = [],
    ) {
      const overrides = baseOverrides(searchOf({ kind: 'results', verses, nextPage: 'none' }));
      overrides.usePassage = ({ usfm }) => ({
        passage:
          pending.includes(usfm) || failed.includes(usfm)
            ? null
            : {
                ...mockPassage,
                id: usfm,
                reference: usfm,
                content: `Preview ${usfm}`,
              },
        loading: pending.includes(usfm),
        error: failed.includes(usfm) ? new Error('preview failed') : null,
        refetch: () => undefined,
      });
      return (
        <HookOverrideProvider overrides={overrides}>
          <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
            <BibleReaderSearch defaultOpen />
          </BibleReader.Root>
        </HookOverrideProvider>
      );
    }
    const view = render(fixture([john316, second], [second.id]));
    expect(screen.getAllByRole('status', { name: 'Loading' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Preview/ })).not.toBeInTheDocument();
    view.rerender(fixture([john316, second], []));
    expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Preview/ })).toHaveLength(2);
    view.rerender(fixture([john316, second, third], [third.id]));
    expect(screen.getAllByRole('status', { name: 'Loading' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Preview/ })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /3:18/ })).not.toBeInTheDocument();
    view.rerender(fixture([john316, second, third], [], [third.id]));
    expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /John 3:18/ })).toBeEnabled();
  });

  it('shows only the first three trending queries and the latest three recents', () => {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['peace', 'joy', 'faith', 'older']));
    const view = renderSearch(
      searchOf({
        kind: 'trending',
        loading: false,
        queries: ['love', 'hope', 'grace', 'fourth'].map((text) => ({ text })),
      }),
    );
    const trending = within(screen.getByRole('region', { name: 'Trending Searches' }));
    const recent = within(screen.getByRole('region', { name: 'Recent Searches' }));
    expect(trending.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'love',
      'hope',
      'grace',
    ]);
    expect(recent.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'peace',
      'joy',
      'faith',
    ]);
    view.unmount();
    localStorage.removeItem(RECENT_SEARCHES_KEY);
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
    expect(screen.getByRole('status')).toHaveTextContent(
      "We're sorry, there are no Bible results for this search.",
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
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

  it('records submissions, not typing or IME confirmation, and reopens with history and input focus', async () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    const submit = vi.fn();
    const selectSuggestion = vi.fn();
    function useSearchFixture(): UseBibleSearchResult {
      const [query, setQuery] = useState('');
      return {
        ...searchOf({ kind: 'trending', queries: [{ text: 'hope' }], loading: false }),
        query,
        setQuery,
        submit,
        selectSuggestion: (text) => {
          selectSuggestion(text);
          setQuery(text);
        },
      };
    }
    const overrides = baseOverrides(searchOf({ kind: 'trending', queries: [], loading: false }));
    overrides.useBibleSearch = useSearchFixture;
    const user = userEvent.setup();
    const view = render(
      <HookOverrideProvider overrides={overrides}>
        <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
          <BibleReaderSearch />
        </BibleReader.Root>
      </HookOverrideProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Search the Bible' }));
    const input = screen.getByRole('textbox');
    expect(input).toHaveFocus();
    await user.type(input, '  Love  ');
    expect(localStorage.getItem(RECENT_SEARCHES_KEY)).toBeNull();
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(submit).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(submit).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY)!)).toEqual(['Love']);
    await user.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'hope' }));
    expect(selectSuggestion).toHaveBeenCalledWith('hope');
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Search the Bible' })).toHaveFocus(),
    );
    await user.keyboard('{Enter}');
    expect(screen.getByRole('textbox')).toHaveValue('');
    const recents = within(screen.getByRole('region', { name: 'Recent Searches' }));
    expect(recents.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'hope',
      'Love',
    ]);
    expect(recents.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    await user.click(recents.getByRole('button', { name: 'Love' }));
    expect(selectSuggestion).toHaveBeenLastCalledWith('Love');
    view.unmount();
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  });

  it('keeps recent queries usable when trending fails and retries discovery independently', async () => {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['peace']));
    const retry = vi.fn();
    const selectSuggestion = vi.fn();
    const view = renderSearch({
      ...searchOf({ kind: 'trending', queries: [], loading: false, error: new Error('offline') }),
      retry,
      selectSuggestion,
    });
    const user = userEvent.setup();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'peace' }));
    expect(selectSuggestion).toHaveBeenCalledWith('peace');
    view.unmount();
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  });

  it('retains results and query during pagination failure, including selectable failed previews', async () => {
    const retry = vi.fn();
    const overrides = baseOverrides({
      ...searchOf({ kind: 'results', verses: [john316], nextPage: 'failed' }, 'love'),
      retry,
    });
    overrides.usePassage = () => ({
      passage: null,
      loading: false,
      error: new Error('preview'),
      refetch: () => undefined,
    });
    render(
      <HookOverrideProvider overrides={overrides}>
        <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
          <BibleReaderSearch defaultOpen />
        </BibleReader.Root>
      </HookOverrideProvider>,
    );
    const user = userEvent.setup();
    expect(screen.getByRole('textbox')).toHaveValue('love');
    const result = screen.getByRole('button', { name: /john 3:16/i });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(result).toBeEnabled();
    await user.click(result);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
  it('passes serializable reader context to an async override without opening built-in search', async () => {
    const onSearchPress = vi.fn(async () => undefined);
    const user = userEvent.setup();
    render(
      <HookOverrideProvider
        overrides={baseOverrides(searchOf({ kind: 'trending', queries: [], loading: false }))}
      >
        <BibleReader.Root
          defaultVersionId={111}
          defaultBook="JHN"
          defaultChapter="3"
          onSearchPress={onSearchPress}
        >
          <BibleReader.Toolbar />
        </BibleReader.Root>
      </HookOverrideProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Search the Bible' }));
    expect(onSearchPress).toHaveBeenCalledExactlyOnceWith({
      versionId: 111,
      book: 'JHN',
      chapter: '3',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

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
