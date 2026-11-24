/**
 * @vitest-environment jsdom
 */
// Controlled-mode (YPE-3705) tests for BibleReader highlights: pure projection
// from the `highlights` prop, provable inertness (no highlight network or
// localStorage traffic), intent events, and mode latching.
// We stub ResizeObserver for jsdom (used by Radix/@floating-ui). The stub methods are intentionally no-ops.
/* eslint-disable @typescript-eslint/no-empty-function */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  onTestFinished,
  type Mock,
  type MockInstance,
} from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  DataExchangeClient,
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
  type BibleBook,
  type BiblePassage,
  type BibleVersion,
  type Highlight,
} from '@youversion/platform-core';
import { YouVersionAuthContext, type HookOverrides } from '@youversion/platform-react-hooks';
import { HookOverrideProvider } from '@/test/hook-overrides';
import {
  BibleReader,
  type BibleReaderRootProps,
  type BibleReaderShareData,
  type BibleReaderVerseSelection,
} from './bible-reader';
import type { HighlightedVerses } from '@/lib/highlight-colors';
import { HIGHLIGHT_COLORS } from './verse-action-popover';
import { buildVerseReference, buildVerseShareText, joinVerseTexts } from '@/lib/verse-share';
import { ReuseShadowBoundary } from '@/lib/shadow-isolation';
import en from '@/i18n/locales/en.json';

import { HIGHLIGHTS_LIVE, setHighlightsLive } from '@/lib/feature-flags';
import { peekPendingHighlights } from '@/lib/pending-highlight';
import { fillFor, mockUserInfo } from '@/test/highlights-test-utils';
import { installResizeObserverStub } from '@/test/dom-stubs';
import { BibleReaderNavigation } from './bible-reader-navigation';

installResizeObserverStub();

// jsdom under this Node version refuses localStorage for opaque origins
// (`SecurityError`). Theme-settings hydration in Root reads it on mount, so
// provide an in-memory stub for the suite.
const memoryStore = new Map<string, string>();
const localStorageMock: Storage = {
  get length() {
    return memoryStore.size;
  },
  clear: () => memoryStore.clear(),
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => {
    memoryStore.set(key, String(value));
  },
  removeItem: (key) => {
    memoryStore.delete(key);
  },
  key: (index) => [...memoryStore.keys()][index] ?? null,
};
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
  writable: true,
});

// jsdom does not implement Element#scrollTo (BibleReader.Content scrolls to
// top on chapter change).
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

function defaultOverrides(): HookOverrides {
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
    useHighlights: () => ({
      highlights: { data: [], next_page_token: null },
      loading: false,
      error: null,
      refetch: () => undefined,
      createHighlight: () =>
        Promise.resolve({
          version_id: 111,
          passage_id: 'JHN.3.16',
          color: 'ffec5b',
        }),
      deleteHighlight: () => Promise.resolve(),
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
    useBibleSearch: () => ({
      query: '',
      phase: { kind: 'trending', queries: [], loading: false },
      setQuery: () => undefined,
      submit: () => undefined,
      selectSuggestion: () => undefined,
      loadMore: () => undefined,
      retry: () => undefined,
    }),
  };
}

const YELLOW = HIGHLIGHT_COLORS[0];
const GREEN = HIGHLIGHT_COLORS[1];

const mockBooks: BibleBook[] = [
  {
    id: 'JHN',
    title: 'John',
    full_title: 'The Gospel According to John',
    canon: 'new_testament',
    abbreviation: 'John',
    chapters: [
      { id: '1', title: '1', passage_id: 'JHN.1' },
      { id: '2', title: '2', passage_id: 'JHN.2' },
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

// Same shape as the real passages API mock data: `.yv-v` markers that the
// Bible HTML transformer expands into per-verse wrappers.
const mockPassage: BiblePassage = {
  id: 'JHN.1',
  content:
    '<div><div class="p">' +
    '<span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>In the beginning was the Word. ' +
    '<span class="yv-v" v="2"></span><span class="yv-vlbl">2</span>He was with God in the beginning. ' +
    '<span class="yv-v" v="3"></span><span class="yv-vlbl">3</span>Through him all things were made.' +
    '</div></div>',
  reference: 'John 1',
};

// Toolbar is mounted alongside Content so the adversarial surface (chapter /
// version pickers, settings) is present in every test.
function readerJsx(props: Partial<BibleReaderRootProps> = {}) {
  return (
    <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1" {...props}>
      <BibleReader.Content />
      <BibleReader.Toolbar />
    </BibleReader.Root>
  );
}

function wrapReader(
  props: Partial<BibleReaderRootProps> = {},
  overrides: HookOverrides = defaultOverrides(),
) {
  return (
    <HookOverrideProvider overrides={overrides}>
      <ReuseShadowBoundary>{readerJsx(props)}</ReuseShadowBoundary>
    </HookOverrideProvider>
  );
}

function renderReader(props: Partial<BibleReaderRootProps> = {}, overrides?: HookOverrides) {
  return render(wrapReader(props, overrides));
}

it('keeps reader-owned scripture in the reader tree without a standalone shadow boundary', async () => {
  const { container } = render(
    <HookOverrideProvider overrides={defaultOverrides()}>
      <ReuseShadowBoundary>
        <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
          <BibleReader.Content />
        </BibleReader.Root>
      </ReuseShadowBoundary>
    </HookOverrideProvider>,
  );

  const renderer = await waitFor(() => {
    const candidate = container.querySelector<HTMLElement>('[data-slot="yv-bible-renderer"]');
    if (!candidate) throw new Error('reader-owned scripture not rendered in the reader tree');
    return candidate;
  });

  expect(renderer.getRootNode()).toBe(document);
});

it.each([
  {
    state: 'copyright and promotional content are populated',
    copyright: 'Copyright attribution',
    promotionalContent: 'Promotional attribution',
    expected: 'Copyright attribution',
  },
  {
    state: 'copyright is blank',
    copyright: '  \n ',
    promotionalContent: '<strong>Promotional attribution</strong>',
    expected: '<strong>Promotional attribution</strong>',
  },
])(
  'renders the selected version attribution when $state',
  ({ copyright, promotionalContent, expected }) => {
    const { container } = renderReader(
      {},
      {
        ...defaultOverrides(),
        useVersion: () => ({
          version: {
            ...mockVersion,
            copyright,
            promotional_content: promotionalContent,
          },
          loading: false,
          error: null,
          refetch: () => undefined,
        }),
      },
    );

    expect(screen.getByText(expected)).toBeInTheDocument();
    expect(container.querySelector('footer strong')).toBeNull();
  },
);

it('renders no attribution footer when both fields are absent', () => {
  const { container } = renderReader();

  expect(container.querySelector('footer')).toBeNull();
});

function getVerseEl(container: HTMLElement, verse: number): HTMLElement {
  const els = container.querySelectorAll<HTMLElement>(`.yv-v[v="${verse}"]`);
  const el = els[els.length - 1];
  if (!el) throw new Error(`Verse ${verse} not rendered`);
  return el;
}

function selectVerse(container: HTMLElement, verse: number) {
  fireEvent.click(getVerseEl(container, verse));
}

function getApplyButtons() {
  return screen
    .getAllByRole('button')
    .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));
}

function getClearButtons() {
  return screen
    .getAllByRole('button')
    .filter((btn) => btn.getAttribute('aria-label')?.includes('Clear'));
}

/** Clean verse text the reader extracts from `mockPassage` for each verse. */
const VERSE_TEXT: HighlightedVerses = {
  1: 'In the beginning was the Word.',
  2: 'He was with God in the beginning.',
  3: 'Through him all things were made.',
};

/**
 * The `shareData` the reader now attaches to every non-empty selection.
 * Composed with the same `verse-share` helpers the popover's Copy / Share have
 * always used (they have their own unit tests) — what this pins is *which*
 * verses and *which* text end up on the selection payload.
 */
const shareDataFor = (verses: number[]): BibleReaderShareData | null => {
  if (verses.length === 0) return null;
  const sorted = [...verses].sort((a, b) => a - b);
  const textByVerse = Object.fromEntries(sorted.map((verse) => [verse, VERSE_TEXT[verse] ?? '']));
  const shared = { bookName: 'John', chapter: '1', versionAbbreviation: 'NIV' };
  return {
    text: buildVerseShareText({ verses: sorted, textByVerse, ...shared }),
    reference: buildVerseReference({ verses: sorted, ...shared }),
    verseText: joinVerseTexts(sorted, textByVerse),
    verses: sorted,
    book: 'JHN',
    chapter: '1',
    versionId: 111,
  };
};

/** The `onVerseSelect` payload. */
const selection = (verses: number[]) => ({
  ...intent(verses),
  reference:
    verses.length === 0
      ? ''
      : buildVerseReference({
          bookName: 'John',
          chapter: '1',
          verses: [...verses].sort((a, b) => a - b),
          versionAbbreviation: '',
        }),
  shareData: shareDataFor(verses),
});

/**
 * The `onHighlightApply` / `onHighlightRemove` payload — deliberately without
 * `reference` / `shareData`: an intent addresses the data layer.
 */
const intent = (verses: number[]) => ({
  versionId: 111,
  book: 'JHN',
  chapter: '1',
  verses,
  passageIds: verses.map((verse) => `JHN.1.${verse}`),
});

type VerseSelectMock = Mock<(selection: BibleReaderVerseSelection) => void>;
type CopyMock = Mock<(data: BibleReaderShareData) => void>;

const verseSelectSpy = (): VerseSelectMock =>
  vi.fn<(selection: BibleReaderVerseSelection) => void>();

function lastSelection(mock: VerseSelectMock): BibleReaderVerseSelection {
  const payload = mock.mock.lastCall?.[0];
  if (!payload) throw new Error('onVerseSelect was never called');
  return payload;
}

function lastShareData(mock: VerseSelectMock): BibleReaderShareData {
  const { shareData } = lastSelection(mock);
  if (!shareData) throw new Error('selection carried no shareData');
  return shareData;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('BibleReader controlled mode - pure projection', () => {
  it('paints verses from the highlights prop, expanding range USFMs', () => {
    const highlights: Highlight[] = [
      { version_id: 111, passage_id: 'JHN.1.1', color: YELLOW },
      { version_id: 111, passage_id: 'JHN.1.2-3', color: GREEN },
    ];
    const { container } = renderReader({ highlights });

    expect(getVerseEl(container, 1).style.backgroundColor).toBe(fillFor(YELLOW));
    expect(getVerseEl(container, 2).style.backgroundColor).toBe(fillFor(GREEN));
    expect(getVerseEl(container, 3).style.backgroundColor).toBe(fillFor(GREEN));
  });

  it('ignores entries for other versions and chapters', () => {
    const highlights: Highlight[] = [
      { version_id: 222, passage_id: 'JHN.1.1', color: YELLOW },
      { version_id: 111, passage_id: 'JHN.2.2', color: YELLOW },
      { version_id: 111, passage_id: 'GEN.1.3', color: YELLOW },
    ];
    const { container } = renderReader({ highlights });

    for (const verse of [1, 2, 3]) {
      expect(getVerseEl(container, verse).style.backgroundColor).toBe('');
    }
  });

  it('paints valid non-palette colors and drops invalid hex', () => {
    const highlights: Highlight[] = [
      { version_id: 111, passage_id: 'JHN.1.1', color: 'abcdef' },
      { version_id: 111, passage_id: 'JHN.1.2', color: 'gggggg' },
      { version_id: 111, passage_id: 'JHN.1.3', color: YELLOW },
    ];
    const { container } = renderReader({ highlights });

    expect(getVerseEl(container, 1).style.backgroundColor).toBe(fillFor('abcdef'));
    expect(getVerseEl(container, 2).style.backgroundColor).toBe('');
    expect(getVerseEl(container, 3).style.backgroundColor).toBe(fillFor(YELLOW));
  });

  it('re-projects when the highlights prop changes (host round-trip)', () => {
    const { container, rerender } = renderReader({ highlights: [] });
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');

    rerender(
      wrapReader({ highlights: [{ version_id: 111, passage_id: 'JHN.1.1', color: YELLOW }] }),
    );
    expect(getVerseEl(container, 1).style.backgroundColor).toBe(fillFor(YELLOW));
  });
});

describe('BibleReader controlled mode - provable inertness', () => {
  // The two rendered selection workflows can exceed Vitest's default 5s timeout
  // when the unit and Storybook projects contend on a loaded CI runner.
  it('never touches the network or localStorage for highlights, even across select/apply/clear', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    try {
      const { container } = renderReader({
        highlights: [{ version_id: 111, passage_id: 'JHN.1.2', color: GREEN }],
        onHighlightApply: vi.fn(),
        onHighlightRemove: vi.fn(),
      });

      // Apply a color to verse 1.
      selectVerse(container, 1);
      await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
      fireEvent.click(getApplyButtons()[0]!);

      // Clear the highlight showing on verse 2.
      selectVerse(container, 2);
      await waitFor(() => expect(getClearButtons()).toHaveLength(1));
      fireEvent.click(getClearButtons()[0]!);

      const highlightKey = (key: string) => key.includes('highlights');
      expect(getItemSpy.mock.calls.some(([key]) => highlightKey(key))).toBe(false);
      expect(setItemSpy.mock.calls.some(([key]) => highlightKey(key))).toBe(false);
      expect(fetchSpy.mock.calls.some(([input]) => String(input).includes('/v1/highlights'))).toBe(
        false,
      );
    } finally {
      vi.unstubAllGlobals();
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    }
  }, 20_000);

  it('color taps paint nothing (no optimistic echo)', async () => {
    const { container } = renderReader({ highlights: [], onHighlightApply: vi.fn() });

    selectVerse(container, 1);
    await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
    fireEvent.click(getApplyButtons()[0]!);

    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');
  });
});

describe('BibleReader controlled mode - events', () => {
  it('emits onVerseSelect on every selection change, [] on clear', () => {
    const onVerseSelect = vi.fn();
    const { container } = renderReader({ highlights: [], onVerseSelect });

    selectVerse(container, 2);
    expect(onVerseSelect).toHaveBeenLastCalledWith(selection([2]));

    selectVerse(container, 1);
    expect(onVerseSelect).toHaveBeenLastCalledWith(selection([1, 2]));

    selectVerse(container, 2);
    expect(onVerseSelect).toHaveBeenLastCalledWith(selection([1]));

    selectVerse(container, 1);
    expect(onVerseSelect).toHaveBeenLastCalledWith(selection([]));
    expect(onVerseSelect).toHaveBeenCalledTimes(4);
  });

  it('emits onVerseSelect([]) when a color tap clears the selection', async () => {
    const onVerseSelect = vi.fn();
    const { container } = renderReader({
      highlights: [],
      onVerseSelect,
      onHighlightApply: vi.fn(),
    });

    selectVerse(container, 1);
    await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
    onVerseSelect.mockClear();

    fireEvent.click(getApplyButtons()[0]!);
    expect(onVerseSelect).toHaveBeenCalledTimes(1);
    expect(onVerseSelect).toHaveBeenCalledWith(selection([]));
  });

  it('emits onVerseSelect([]) when navigation clears the selection', async () => {
    const onVerseSelect = vi.fn();
    const { container } = renderReader({ highlights: [], onVerseSelect });

    selectVerse(container, 1);
    onVerseSelect.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /next chapter/i }));

    await waitFor(() => expect(onVerseSelect).toHaveBeenCalledTimes(1));
    // Payload carries the new location and an empty selection.
    expect(onVerseSelect).toHaveBeenCalledWith({
      versionId: 111,
      book: 'JHN',
      chapter: '2',
      verses: [],
      passageIds: [],
      reference: '',
      shareData: null,
    });
  });

  it('emits onVerseSelect in self-contained mode too', () => {
    const onVerseSelect = vi.fn();
    const { container } = renderReader({ onVerseSelect });

    selectVerse(container, 3);
    expect(onVerseSelect).toHaveBeenCalledWith(selection([3]));
  });

  it('emits onHighlightApply with the exact intent payload and clears the selection', async () => {
    const onHighlightApply = vi.fn();
    const { container } = renderReader({ highlights: [], onHighlightApply });

    selectVerse(container, 1);
    selectVerse(container, 3);
    await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
    fireEvent.click(getApplyButtons()[0]!);

    expect(onHighlightApply).toHaveBeenCalledTimes(1);
    expect(onHighlightApply).toHaveBeenCalledWith({ ...intent([1, 3]), color: YELLOW });

    // Selection cleared per existing popover behavior.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(false);
  });

  it('emits onHighlightRemove scoped to the selected verses showing that color', async () => {
    const onHighlightRemove = vi.fn();
    const highlights: Highlight[] = [
      { version_id: 111, passage_id: 'JHN.1.1', color: YELLOW },
      { version_id: 111, passage_id: 'JHN.1.2', color: GREEN },
    ];
    const rerenderWith = (next: Highlight[]) =>
      rerender(wrapReader({ highlights: next, onHighlightRemove }));
    const { container, rerender } = renderReader({ highlights, onHighlightRemove });

    selectVerse(container, 1);
    selectVerse(container, 2);
    selectVerse(container, 3);
    // Two active colors -> two clear circles, ordered yellow then green.
    await waitFor(() => expect(getClearButtons()).toHaveLength(2));

    fireEvent.click(getClearButtons()[0]!);
    expect(onHighlightRemove).toHaveBeenCalledTimes(1);
    expect(onHighlightRemove).toHaveBeenLastCalledWith({ ...intent([1]), color: YELLOW });

    // Green still showing on a selected verse -> popover stays open (AC 8a).
    expect(screen.getByRole('dialog')).toBeTruthy();

    // Host round-trips the removal; the reader re-projects (verse 1 unpaints,
    // one clear circle remains).
    rerenderWith([{ version_id: 111, passage_id: 'JHN.1.2', color: GREEN }]);
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');
    await waitFor(() => expect(getClearButtons()).toHaveLength(1));

    fireEvent.click(getClearButtons()[0]!);
    expect(onHighlightRemove).toHaveBeenCalledTimes(2);
    expect(onHighlightRemove).toHaveBeenLastCalledWith({ ...intent([2]), color: GREEN });

    // Last active color removed -> popover dismisses (AC 8).
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  }, 20_000);

  it('ignores onHighlightApply / onHighlightRemove in self-contained mode', async () => {
    const onHighlightApply = vi.fn();
    const onHighlightRemove = vi.fn();
    const { container } = renderReader({ onHighlightApply, onHighlightRemove });

    selectVerse(container, 1);
    // Self-contained with HIGHLIGHTS_LIVE off: the color row is hidden entirely
    // (`highlightsEnabled` from PR-288). Copy/Share still open the popover.
    // Controlled intent callbacks must never fire.
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(getApplyButtons()).toHaveLength(0);
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');
    expect(onHighlightApply).not.toHaveBeenCalled();
    expect(onHighlightRemove).not.toHaveBeenCalled();
  });
});

describe('BibleReader controlled mode - latching', () => {
  let warnSpy: MockInstance;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('stays controlled when highlights flips to undefined: warns and renders no highlights', () => {
    const { container, rerender } = renderReader({
      highlights: [{ version_id: 111, passage_id: 'JHN.1.2', color: GREEN }],
    });
    expect(getVerseEl(container, 2).style.backgroundColor).toBe(fillFor(GREEN));

    rerender(wrapReader());

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('latched at first mount'));
    // Transient undefined renders as "no highlights" — still controlled.
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');
    expect(getVerseEl(container, 2).style.backgroundColor).toBe('');
  });

  it('stays self-contained when highlights appears after mount: warns and ignores the prop', () => {
    const { container, rerender } = renderReader();
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');

    rerender(
      wrapReader({ highlights: [{ version_id: 111, passage_id: 'JHN.1.1', color: YELLOW }] }),
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('latched at first mount'));
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');
  });

  it('treats [] as controlled while undefined means self-contained', () => {
    const controlled = renderReader({ highlights: [] });
    expect(getVerseEl(controlled.container, 1).style.backgroundColor).toBe('');
    controlled.unmount();

    // Self-contained with HIGHLIGHTS_LIVE off: also empty, but the mode is
    // latched (a later highlights prop would be ignored — covered above).
    const selfContained = renderReader();
    expect(getVerseEl(selfContained.container, 1).style.backgroundColor).toBe('');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ── Host-owned verse actions ────────────────────────────────────────────────
// `verseActions` + `clearSelectionSignal` let a host (RN Expo DOM, YPE-2894)
// render its own verse-action UI. Every case below has a sibling asserting the
// default is unchanged — every existing consumer is on the default.

describe('BibleReader verseActions', () => {
  it('renders the popover by default (unchanged behavior)', async () => {
    const { container } = renderReader({ highlights: [] });

    selectVerse(container, 1);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(getApplyButtons().length).toBeGreaterThan(0);
  });

  it('renders the popover for an explicit verseActions="popover"', async () => {
    const { container } = renderReader({ highlights: [], verseActions: 'popover' });

    selectVerse(container, 1);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
  });

  it('renders no verse-action UI with verseActions="none", while selection still works', () => {
    const onVerseSelect = verseSelectSpy();
    const { container } = renderReader({
      highlights: [{ version_id: 111, passage_id: 'JHN.1.2', color: GREEN }],
      verseActions: 'none',
      onVerseSelect,
    });

    selectVerse(container, 1);

    // Nothing renders over the passage.
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getApplyButtons()).toHaveLength(0);
    expect(getClearButtons()).toHaveLength(0);

    // The verse is still selected in the text, highlights still project from
    // the prop, and the host still hears about it.
    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(true);
    expect(getVerseEl(container, 2).style.backgroundColor).toBe(fillFor(GREEN));
    expect(onVerseSelect).toHaveBeenCalledWith(selection([1]));

    // And it stays absent as the selection grows.
    selectVerse(container, 3);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onVerseSelect).toHaveBeenLastCalledWith(selection([1, 3]));
  });

  it('emits no highlight intents with verseActions="none" (the host drives the highlights prop)', async () => {
    const highlights = [{ version_id: 111, passage_id: 'JHN.1.2', color: GREEN }];

    // Control arm. Selecting a verse never emits an intent on its own — a
    // swatch has to be clicked — so prove the popover arm fires both callbacks
    // first. Without this the negative assertions below would pass in either
    // mode and lock nothing.
    const popoverApply = vi.fn();
    const popoverRemove = vi.fn();
    const popover = renderReader({
      highlights,
      onHighlightApply: popoverApply,
      onHighlightRemove: popoverRemove,
    });

    selectVerse(popover.container, 1);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.click(getApplyButtons()[0]!);
    expect(popoverApply).toHaveBeenCalledTimes(1);

    // Applying clears the selection; re-select the green verse to reach Clear.
    selectVerse(popover.container, 2);
    await waitFor(() => expect(getClearButtons().length).toBeGreaterThan(0));
    fireEvent.click(getClearButtons()[0]!);
    expect(popoverRemove).toHaveBeenCalledTimes(1);

    popover.unmount();

    // Treatment arm: identical props and script, `verseActions="none"`. The
    // popover is the only trigger for an intent, so there is nothing to click
    // and neither callback can fire. A host in this mode paints by updating
    // `highlights` — the docs on `verseActions` say so, this holds them honest.
    const noneApply = vi.fn();
    const noneRemove = vi.fn();
    const { container } = renderReader({
      highlights,
      verseActions: 'none',
      onHighlightApply: noneApply,
      onHighlightRemove: noneRemove,
    });

    selectVerse(container, 1);
    selectVerse(container, 2);

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(getApplyButtons()).toHaveLength(0);
    expect(getClearButtons()).toHaveLength(0);
    expect(noneApply).not.toHaveBeenCalled();
    expect(noneRemove).not.toHaveBeenCalled();
  });
});

describe('BibleReader selection payload - reference and shareData', () => {
  it('carries the localized reference without the version abbreviation', () => {
    const onVerseSelect = verseSelectSpy();
    const { container } = renderReader({ highlights: [], onVerseSelect });

    selectVerse(container, 1);
    selectVerse(container, 2);

    // Label: book title, no version. Copied text: version retained. The two
    // are deliberately different.
    expect(lastSelection(onVerseSelect).reference).toBe('John 1:1-2');
    expect(lastShareData(onVerseSelect).reference).toBe('John 1:1-2 NIV');
  });

  it('falls back to the USFM book code until useBooks resolves', () => {
    const onVerseSelect = verseSelectSpy();
    const { container } = renderReader(
      { highlights: [], onVerseSelect },
      {
        ...defaultOverrides(),
        useBooks: () => ({
          books: null,
          loading: true,
          error: null,
          refetch: () => undefined,
        }),
      },
    );

    selectVerse(container, 3);

    expect(lastSelection(onVerseSelect).reference).toBe('JHN 1:3');
    expect(lastShareData(onVerseSelect).reference).toBe('JHN 1:3 NIV');
  });

  it('re-emits the live selection when the book title resolves after it was made', async () => {
    const onVerseSelect = verseSelectSpy();
    const props = { highlights: [], onVerseSelect, verseActions: 'none' as const };
    const { container, rerender } = renderReader(props, {
      ...defaultOverrides(),
      useBooks: () => ({
        books: null,
        loading: true,
        error: null,
        refetch: () => undefined,
      }),
    });

    selectVerse(container, 3);
    expect(lastSelection(onVerseSelect).reference).toBe('JHN 1:3');

    // useBooks resolves while verse 3 is still selected.
    rerender(wrapReader(props));

    await waitFor(() => expect(lastSelection(onVerseSelect).reference).toBe('John 1:3'));
    // The refreshed payload is otherwise the same selection, shareData included.
    expect(onVerseSelect).toHaveBeenLastCalledWith(selection([3]));
    expect(getVerseEl(container, 3).classList.contains('yv-v-selected')).toBe(true);
  });

  it('re-emits the live selection when the version abbreviation resolves after it was made', async () => {
    const onVerseSelect = verseSelectSpy();
    const props = { highlights: [], onVerseSelect, verseActions: 'none' as const };
    const { container, rerender } = renderReader(props, {
      ...defaultOverrides(),
      useVersion: () => ({
        version: null,
        loading: true,
        error: null,
        refetch: () => undefined,
      }),
    });

    selectVerse(container, 1);
    // No version yet: the copy/share reference carries no abbreviation.
    expect(lastShareData(onVerseSelect).reference).toBe('John 1:1');

    rerender(wrapReader(props));

    await waitFor(() => expect(lastShareData(onVerseSelect).reference).toBe('John 1:1 NIV'));
    expect(onVerseSelect).toHaveBeenLastCalledWith(selection([1]));
  });

  it('does not re-emit when metadata resolves with no selection live', async () => {
    const onVerseSelect = verseSelectSpy();
    const props = { highlights: [], onVerseSelect };
    const { rerender } = renderReader(props, {
      ...defaultOverrides(),
      useBooks: () => ({
        books: null,
        loading: true,
        error: null,
        refetch: () => undefined,
      }),
    });

    rerender(wrapReader(props));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onVerseSelect).not.toHaveBeenCalled();
  });

  it('does not re-emit on a re-render once the metadata is settled (default path unchanged)', async () => {
    const onVerseSelect = verseSelectSpy();
    const props = { highlights: [], onVerseSelect };
    const { container, rerender } = renderReader(props);

    selectVerse(container, 2);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(onVerseSelect).toHaveBeenCalledTimes(1);

    rerender(wrapReader(props));

    expect(onVerseSelect).toHaveBeenCalledTimes(1);
    expect(onVerseSelect).toHaveBeenLastCalledWith(selection([2]));
  });

  it('carries shareData matching what onCopy produces for the same selection', async () => {
    const onVerseSelect = verseSelectSpy();
    const onCopy: CopyMock = vi.fn<(data: BibleReaderShareData) => void>();
    const { container } = renderReader({ highlights: [], onVerseSelect, onCopy });

    selectVerse(container, 1);
    selectVerse(container, 3);
    const selectionShareData = lastShareData(onVerseSelect);

    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /copy/i }));

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy.mock.lastCall?.[0]).toEqual(selectionShareData);
    // Non-contiguous selection: gap joined with ' ... ', reference collapsed.
    expect(selectionShareData.reference).toBe('John 1:1,3 NIV');
    expect(selectionShareData.verseText).toBe(
      'In the beginning was the Word. ... Through him all things were made.',
    );
  });

  it('reports reference "" and shareData null on clear', () => {
    const onVerseSelect = verseSelectSpy();
    const { container } = renderReader({ highlights: [], onVerseSelect });

    selectVerse(container, 1);
    selectVerse(container, 1);

    expect(onVerseSelect).toHaveBeenLastCalledWith(selection([]));
    const payload = lastSelection(onVerseSelect);
    expect(payload.reference).toBe('');
    expect(payload.shareData).toBeNull();
  });
});

describe('BibleReader clearSelectionSignal', () => {
  it('clears the selection when the signal changes and emits verses: []', async () => {
    const onVerseSelect = vi.fn();
    const props = { highlights: [], onVerseSelect, verseActions: 'none' as const };
    const { container, rerender } = renderReader({ ...props, clearSelectionSignal: 0 });

    selectVerse(container, 1);
    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(true);
    onVerseSelect.mockClear();

    rerender(wrapReader({ ...props, clearSelectionSignal: 1 }));

    await waitFor(() =>
      expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(false),
    );
    expect(onVerseSelect).toHaveBeenCalledTimes(1);
    expect(onVerseSelect).toHaveBeenCalledWith(selection([]));
  });

  it('also closes the built-in popover', async () => {
    const props = { highlights: [] };
    const { container, rerender } = renderReader({ ...props, clearSelectionSignal: 3 });

    selectVerse(container, 2);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());

    rerender(wrapReader({ ...props, clearSelectionSignal: 4 }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('does not clear on mount', () => {
    const onVerseSelect = vi.fn();
    renderReader({ highlights: [], onVerseSelect, clearSelectionSignal: 7 });

    expect(onVerseSelect).not.toHaveBeenCalled();
  });

  it('does not clear when the signal is unchanged across a re-render', () => {
    const onVerseSelect = vi.fn();
    const props = { highlights: [], onVerseSelect, clearSelectionSignal: 2 };
    const { container, rerender } = renderReader(props);

    selectVerse(container, 1);
    onVerseSelect.mockClear();

    rerender(wrapReader(props));

    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(true);
    expect(onVerseSelect).not.toHaveBeenCalled();
  });

  it('is inert when the host never passes it', () => {
    const onVerseSelect = vi.fn();
    const props = { highlights: [], onVerseSelect };
    const { container, rerender } = renderReader(props);

    selectVerse(container, 1);
    onVerseSelect.mockClear();
    rerender(wrapReader(props));

    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(true);
    expect(onVerseSelect).not.toHaveBeenCalled();
  });
});

function renderReaderWithHighlightAuth(
  userInfo: typeof mockUserInfo | null,
  props: Partial<BibleReaderRootProps> = {},
) {
  const createHighlight = vi.fn().mockResolvedValue({
    version_id: 111,
    passage_id: 'JHN.1.1',
    color: 'ffec5b',
  });
  const overrides = defaultOverrides();
  const useHighlights = overrides.useHighlights;
  if (!useHighlights) {
    throw new Error('defaultOverrides must provide useHighlights');
  }
  overrides.useHighlights = () => ({
    ...useHighlights({ version_id: 111, passage_id: 'JHN.1' }),
    createHighlight,
  });
  return {
    createHighlight,
    ...render(
      <YouVersionAuthContext.Provider
        value={{
          userInfo,
          setUserInfo: vi.fn(),
          isLoading: false,
          error: null,
        }}
      >
        {wrapReader(props, overrides)}
      </YouVersionAuthContext.Provider>,
    ),
  };
}

function expectVerseMenuAbsent() {
  expect(screen.queryByRole('button', { name: /^copy$/i, hidden: true })).toBeNull();
}

it('keeps Copy and the verse selection after No Thanks on highlight sign-in', async () => {
  setHighlightsLive(true);
  try {
    const { container, createHighlight } = renderReaderWithHighlightAuth(null);

    selectVerse(container, 1);
    await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
    fireEvent.click(getApplyButtons()[0]!);
    await screen.findByRole('button', { name: /no thanks/i });
    expectVerseMenuAbsent();
    fireEvent.click(screen.getByRole('button', { name: /no thanks/i }));

    expect(screen.queryByRole('button', { name: /no thanks/i })).toBeNull();
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeTruthy();
    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(true);
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');
    expect(createHighlight).not.toHaveBeenCalled();
    expect(peekPendingHighlights()).toEqual([]);
  } finally {
    setHighlightsLive(HIGHLIGHTS_LIVE);
    sessionStorage.clear();
  }
});

it('keeps Copy and the verse selection after Escape on highlight sign-in', async () => {
  setHighlightsLive(true);
  try {
    const { container, createHighlight } = renderReaderWithHighlightAuth(null);

    selectVerse(container, 1);
    await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
    fireEvent.click(getApplyButtons()[0]!);
    await screen.findByRole('button', { name: /no thanks/i });
    expectVerseMenuAbsent();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('button', { name: /no thanks/i })).toBeNull());
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeTruthy();
    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(true);
    expect(createHighlight).not.toHaveBeenCalled();
    expect(peekPendingHighlights()).toEqual([]);
  } finally {
    setHighlightsLive(HIGHLIGHTS_LIVE);
    sessionStorage.clear();
  }
});

it('keeps Copy and the verse selection after Cancel on highlight permission', async () => {
  setHighlightsLive(true);
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1', name: 'Test User' });
  YouVersionPlatformConfiguration.saveGrantedPermissions([]);
  try {
    const { container, createHighlight } = renderReaderWithHighlightAuth(mockUserInfo);

    selectVerse(container, 1);
    await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
    fireEvent.click(getApplyButtons()[0]!);
    await screen.findByRole('button', { name: /^cancel$/i });
    expectVerseMenuAbsent();
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(screen.queryByRole('button', { name: /^cancel$/i })).toBeNull();
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeTruthy();
    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(true);
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');
    expect(createHighlight).not.toHaveBeenCalled();
    expect(peekPendingHighlights()).toEqual([]);
  } finally {
    setHighlightsLive(HIGHLIGHTS_LIVE);
    sessionStorage.clear();
    localStorage.clear();
  }
});

it('clears the verse menu while highlight sign-in is still starting', async () => {
  setHighlightsLive(true);
  const signIn = vi
    .spyOn(YouVersionAPIUsers, 'signIn')
    .mockImplementation(() => new Promise(() => undefined));
  try {
    const { container, createHighlight } = renderReaderWithHighlightAuth(null);

    selectVerse(container, 1);
    await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
    fireEvent.click(getApplyButtons()[0]!);
    fireEvent.click(await screen.findByRole('button', { name: /yes please/i }));

    expect(signIn).toHaveBeenCalledTimes(1);
    expectVerseMenuAbsent();
    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(true);
    expect(createHighlight).not.toHaveBeenCalled();
    expect(peekPendingHighlights()).toHaveLength(1);
  } finally {
    signIn.mockRestore();
    setHighlightsLive(HIGHLIGHTS_LIVE);
    sessionStorage.clear();
  }
});

it('brings the verse menu back when highlight sign-in fails to start', async () => {
  setHighlightsLive(true);
  const signIn = vi
    .spyOn(YouVersionAPIUsers, 'signIn')
    .mockRejectedValue(new Error('sign-in failed'));
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    const { container, createHighlight } = renderReaderWithHighlightAuth(null);

    selectVerse(container, 1);
    await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
    fireEvent.click(getApplyButtons()[0]!);
    fireEvent.click(await screen.findByRole('button', { name: /yes please/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /^copy$/i })).toBeTruthy());
    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(true);
    expect(createHighlight).not.toHaveBeenCalled();
    expect(peekPendingHighlights()).toEqual([]);
    expect(errorLog).toHaveBeenCalled();
  } finally {
    errorLog.mockRestore();
    signIn.mockRestore();
    setHighlightsLive(HIGHLIGHTS_LIVE);
    sessionStorage.clear();
  }
});

it('clears the verse menu while the highlight permission grant is still starting', async () => {
  setHighlightsLive(true);
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1', name: 'Test User' });
  YouVersionPlatformConfiguration.saveGrantedPermissions([]);
  const updateToken = vi
    .spyOn(DataExchangeClient.prototype, 'updateToken')
    .mockImplementation(() => new Promise(() => undefined));
  try {
    const { container, createHighlight } = renderReaderWithHighlightAuth(mockUserInfo);

    selectVerse(container, 1);
    await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
    fireEvent.click(getApplyButtons()[0]!);
    fireEvent.click(await screen.findByRole('button', { name: /^continue$/i }));

    expect(updateToken).toHaveBeenCalledTimes(1);
    expectVerseMenuAbsent();
    fireEvent.pointerDown(getVerseEl(container, 1));
    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(true);
    expect(createHighlight).not.toHaveBeenCalled();
    expect(peekPendingHighlights()).toHaveLength(1);
  } finally {
    updateToken.mockRestore();
    setHighlightsLive(HIGHLIGHTS_LIVE);
    sessionStorage.clear();
    localStorage.clear();
  }
});

it('classifies pending-highlight pointers in the reader document realm', async () => {
  setHighlightsLive(true);
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1', name: 'Test User' });
  YouVersionPlatformConfiguration.saveGrantedPermissions([]);
  const updateToken = vi
    .spyOn(DataExchangeClient.prototype, 'updateToken')
    .mockImplementation(() => new Promise(() => undefined));
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  const iframeDocument = iframe.contentDocument;
  if (!iframeDocument) throw new Error('same-origin iframe document not available');
  // SAFETY: A same-origin iframe exposes its realm's Element constructor on its Window.
  const iframeWindow = iframe.contentWindow as (Window & { Element: typeof Element }) | null;
  if (!iframeWindow) throw new Error('same-origin iframe window not available');
  const onVerseSelect = vi.fn();

  try {
    const view = renderReaderWithHighlightAuth(mockUserInfo, { onVerseSelect });

    selectVerse(view.container, 1);
    expect(onVerseSelect).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
    fireEvent.click(getApplyButtons()[0]!);

    iframeDocument.body.append(view.container);
    const topRealmVerse = getVerseEl(view.container, 1);
    const iframeVerse = iframeDocument.importNode(topRealmVerse, true);
    topRealmVerse.replaceWith(iframeVerse);
    onVerseSelect.mockClear();
    fireEvent.click(await screen.findByRole('button', { name: /^continue$/i }));

    expect(updateToken).toHaveBeenCalledTimes(1);
    expectVerseMenuAbsent();
    expect(iframeVerse).toBeInstanceOf(iframeWindow.Element);
    expect(iframeVerse).not.toBeInstanceOf(Element);

    fireEvent.pointerDown(iframeVerse);
    expect(onVerseSelect).not.toHaveBeenCalled();
    expect(view.createHighlight).not.toHaveBeenCalled();
    expect(peekPendingHighlights()).toHaveLength(1);

    fireEvent.pointerDown(iframeDocument.body);
    expect(onVerseSelect).toHaveBeenCalledTimes(1);
    expect(onVerseSelect).toHaveBeenCalledWith(selection([]));
  } finally {
    iframe.remove();
    updateToken.mockRestore();
    setHighlightsLive(HIGHLIGHTS_LIVE);
    sessionStorage.clear();
    localStorage.clear();
  }
});

it('does not restore the verse menu after an outside click if the permission grant fails', async () => {
  setHighlightsLive(true);
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1', name: 'Test User' });
  YouVersionPlatformConfiguration.saveGrantedPermissions([]);
  let rejectToken: (error: Error) => void = () => undefined;
  const updateToken = vi.spyOn(DataExchangeClient.prototype, 'updateToken').mockImplementation(
    () =>
      new Promise((_resolve, reject) => {
        rejectToken = reject;
      }),
  );
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    const { container, createHighlight } = renderReaderWithHighlightAuth(mockUserInfo);

    selectVerse(container, 1);
    await waitFor(() => expect(getApplyButtons().length).toBeGreaterThan(0));
    fireEvent.click(getApplyButtons()[0]!);
    fireEvent.click(await screen.findByRole('button', { name: /^continue$/i }));
    expect(updateToken).toHaveBeenCalledTimes(1);
    expectVerseMenuAbsent();

    fireEvent.pointerDown(screen.getByRole('heading', { name: /john/i }));
    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(false);
    expectVerseMenuAbsent();

    rejectToken(new Error('token failed'));
    await waitFor(() => expect(errorLog).toHaveBeenCalled());
    expect(getVerseEl(container, 1).classList.contains('yv-v-selected')).toBe(false);
    expectVerseMenuAbsent();
    expect(createHighlight).not.toHaveBeenCalled();
  } finally {
    errorLog.mockRestore();
    updateToken.mockRestore();
    setHighlightsLive(HIGHLIGHTS_LIVE);
    sessionStorage.clear();
    localStorage.clear();
  }
});

it('selects and anchors iframe verses and resets highlight fills and label colors', async ({
  onTestFinished,
}) => {
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  onTestFinished(() => iframe.remove());
  const iframeDocument = iframe.contentDocument;
  if (!iframeDocument) throw new Error('same-origin iframe document not available');
  Object.defineProperty(Object.getPrototypeOf(iframeDocument.createElement('main')), 'scrollTo', {
    value: vi.fn(),
    configurable: true,
  });
  const mount = iframeDocument.createElement('div');
  iframeDocument.body.append(mount);
  const onVerseSelect = verseSelectSpy();
  const view = render(
    wrapReader({
      highlights: [{ version_id: 111, passage_id: 'JHN.1.1', color: YELLOW }],
      onVerseSelect,
    }),
    { container: mount, baseElement: iframeDocument.body },
  );
  onTestFinished(() => view.unmount());
  const verse = getVerseEl(mount, 1);
  const label = verse.querySelector<HTMLElement>('.yv-vlbl');
  if (!label) throw new Error('verse number label not rendered');
  expect(verse.ownerDocument).toBe(iframeDocument);
  expect(verse).not.toBeInstanceOf(HTMLElement);
  expect(label.ownerDocument).toBe(iframeDocument);
  expect(label).not.toBeInstanceOf(HTMLElement);
  expect(verse.style.backgroundColor).toBe(fillFor(YELLOW));
  expect(label.style.color).toBe('inherit');
  vi.spyOn(verse, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 240, 24));

  fireEvent.click(verse);

  expect(lastSelection(onVerseSelect).verses).toEqual([1]);
  expect(verse).toHaveClass('yv-v-selected');
  await waitFor(() => {
    const popover = document.querySelector<HTMLElement>('[data-radix-popper-content-wrapper]');
    expect(popover?.style.getPropertyValue('--radix-popper-anchor-width')).toBe('240px');
  });

  view.rerender(wrapReader({ highlights: [], onVerseSelect }));

  const unhighlightedVerse = getVerseEl(mount, 1);
  const unhighlightedLabel = unhighlightedVerse.querySelector<HTMLElement>('.yv-vlbl');
  if (!unhighlightedLabel)
    throw new Error('verse number label not rendered after highlight removal');
  expect(unhighlightedVerse.style.backgroundColor).toBe('');
  expect(unhighlightedLabel.style.color).toBe('');
});

function renderIframeReader(
  props: Partial<BibleReaderRootProps> = {},
  overrides = defaultOverrides(),
) {
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  const iframeDocument = iframe.contentDocument;
  if (!iframeDocument) throw new Error('same-origin iframe document unavailable');
  Object.defineProperty(Object.getPrototypeOf(iframeDocument.createElement('main')), 'scrollTo', {
    value: vi.fn(),
    configurable: true,
  });
  const mount = iframeDocument.createElement('div');
  iframeDocument.body.append(mount);
  const view = render(wrapReader({ highlights: [], ...props }, overrides), {
    container: mount,
    baseElement: iframeDocument.body,
  });
  onTestFinished(() => {
    view.unmount();
    iframe.remove();
  });
  expect(getVerseEl(mount, 1).ownerDocument).toBe(iframeDocument);
  expect(getVerseEl(mount, 1)).not.toBeInstanceOf(HTMLElement);
  return { ...view, mount, iframeDocument };
}

it('matches top-document selection and Copy payloads in an iframe and clears on a second verse tap', async () => {
  const topSelections = verseSelectSpy();
  const topView = renderReader({ highlights: [], onVerseSelect: topSelections });
  selectVerse(topView.container, 1);
  selectVerse(topView.container, 3);
  const expected = lastSelection(topSelections);
  expect(expected).toEqual(selection([1, 3]));
  expect(expected.shareData?.verseText).toBe(
    'In the beginning was the Word. ... Through him all things were made.',
  );
  topView.unmount();

  const iframeSelections = verseSelectSpy();
  const onCopy = vi.fn<(data: BibleReaderShareData) => void>();
  const view = renderIframeReader({ onVerseSelect: iframeSelections, onCopy });
  selectVerse(view.mount, 1);
  selectVerse(view.mount, 3);
  expect.soft(lastSelection(iframeSelections)).toEqual(expected);

  fireEvent.click(await screen.findByRole('button', { name: /^copy$/i }));
  expect.soft(onCopy).toHaveBeenCalledExactlyOnceWith(expected.shareData);

  const verse = getVerseEl(view.mount, 1);
  fireEvent.click(verse);
  expect(verse).toHaveClass('yv-v-selected');
  fireEvent.click(verse);
  expect(lastSelection(iframeSelections)).toEqual(selection([]));
  expect(verse).not.toHaveClass('yv-v-selected');
  expect(screen.queryByRole('button', { name: /^copy$/i })).toBeNull();
});

it('paints and focuses the requested iframe verse until user input', async () => {
  const navigation = new BibleReaderNavigation();
  const onVerseSelect = verseSelectSpy();
  const view = renderIframeReader({ navigation, onVerseSelect });
  const verse = getVerseEl(view.mount, 1);
  const renderer = view.mount.querySelector<HTMLElement>('[data-slot="yv-bible-renderer"]');
  if (!renderer) throw new Error('reader renderer unavailable');

  act(() => navigation.focusReference({ versionId: 111, passageId: 'JHN.1.1' }, false));

  await waitFor(() => expect(renderer).toHaveAttribute('data-yv-verse-focus'));
  expect.soft(verse).toHaveClass('yv-v-focused');
  expect.soft(view.iframeDocument.activeElement === verse).toBe(true);
  expect(onVerseSelect).not.toHaveBeenCalled();

  fireEvent.pointerDown(verse);
  expect(renderer).not.toHaveAttribute('data-yv-verse-focus');
  expect(verse).not.toHaveClass('yv-v-focused');
});

it('extracts iframe footnote verse HTML without verse labels or note text', async () => {
  const onFootnotePress = vi.fn<NonNullable<BibleReaderRootProps['onFootnotePress']>>();
  const overrides: HookOverrides = {
    ...defaultOverrides(),
    usePassage: () => ({
      passage: {
        ...mockPassage,
        content: mockPassage.content.replace(
          'In the beginning was the Word.',
          'In the beginning was the Word.<span class="yv-n f"><span class="fr">1:1 </span><span class="ft">A note.</span></span>',
        ),
      },
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
  };
  const view = renderIframeReader({ onFootnotePress }, overrides);
  const footnote = await waitFor(() => {
    const button = view.mount.querySelector<HTMLButtonElement>('[data-verse-footnote="1"] button');
    if (!button) throw new Error('iframe footnote button unavailable');
    return button;
  });

  fireEvent.click(footnote);

  expect(onFootnotePress).toHaveBeenCalledTimes(1);
  const payload = onFootnotePress.mock.lastCall?.[0];
  expect(payload?.verseHtml).toContain('In the beginning was the Word.');
  expect(payload?.verseHtml).toContain('<sup');
  expect(payload?.verseHtml).not.toContain('yv-vlbl');
  expect(payload?.verseHtml).not.toContain('A note.');
});

it('uses the iframe motion preference and viewport for scrolling and focus cleanup', async () => {
  const navigation = new BibleReaderNavigation();
  const view = renderIframeReader({ navigation });
  const ownerWindow = view.iframeDocument.defaultView;
  if (!ownerWindow) throw new Error('iframe window unavailable');
  const matchMedia = vi.fn(() => ({ matches: true }));
  Object.defineProperty(ownerWindow, 'matchMedia', { value: matchMedia, configurable: true });
  const verse = getVerseEl(view.mount, 1);
  const scrollVerse = vi.fn();
  verse.scrollIntoView = scrollVerse;
  const renderer = view.mount.querySelector<HTMLElement>('[data-slot="yv-bible-renderer"]');
  if (!renderer) throw new Error('reader renderer unavailable');
  const scrollContainer = vi.fn();
  renderer.scrollIntoView = scrollContainer;

  act(() => navigation.focusReference({ versionId: 111, passageId: 'JHN.1.1' }));

  await waitFor(() => expect(renderer).toHaveAttribute('data-yv-verse-focus'));
  expect.soft(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  expect.soft(scrollVerse).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
  expect.soft(scrollContainer).not.toHaveBeenCalled();
  expect.soft(verse).toHaveClass('yv-v-focused');
  expect.soft(view.iframeDocument.activeElement === verse).toBe(true);

  fireEvent.wheel(view.iframeDocument.documentElement);

  expect(renderer).not.toHaveAttribute('data-yv-verse-focus');
  expect(verse).not.toHaveClass('yv-v-focused');
});

it('clears failed clipboard feedback on navigation after closing the verse menu', async ({
  onTestFinished,
}) => {
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });
  const writes: string[] = [];
  const writeText = (text: string): Promise<void> => {
    writes.push(text);
    return Promise.reject(new DOMException('Clipboard permission denied', 'NotAllowedError'));
  };
  vi.stubGlobal('navigator', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    clipboard: { writeText },
    share: undefined,
  });
  const onVerseSelect = verseSelectSpy();
  const { container, rerender } = renderReader({ highlights: [], onVerseSelect, chapter: '1' });

  for (const action of ['Copy', 'Share']) {
    selectVerse(container, 1);
    expect(getVerseEl(container, 1)).toHaveClass('yv-v-selected');
    const actionButton = await screen.findByRole('button', {
      name: new RegExp(`^${action}$`, 'i'),
    });
    const previousWrites = writes.length;
    onVerseSelect.mockClear();

    fireEvent.click(actionButton);

    expect(writes).toHaveLength(previousWrites + 1);
    expect(writes.at(-1)).toBe('“In the beginning was the Word.”\n\nJohn 1:1 NIV');
    expect(lastSelection(onVerseSelect)).toEqual(selection([]));
    expect(getVerseEl(container, 1)).not.toHaveClass('yv-v-selected');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(en.unableToShare));
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toBeVisible();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^copy$/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /^share$/i })).toBeNull();
    });

    rerender(wrapReader({ highlights: [], onVerseSelect, chapter: '2' }));
    await waitFor(() => expect(screen.getByRole('status')).toBeEmptyDOMElement());
    rerender(wrapReader({ highlights: [], onVerseSelect, chapter: '1' }));
  }
});

it.each(['navigation', 'newer success', 'newer failure'])(
  'ignores an old clipboard result after %s',
  async (scenario) => {
    onTestFinished(() => {
      vi.unstubAllGlobals();
    });
    const writes: { resolve: () => void; reject: (error: Error) => void }[] = [];
    const writeText = () =>
      new Promise<void>((resolve, reject) => {
        writes.push({ resolve, reject });
      });
    vi.stubGlobal('navigator', {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      clipboard: { writeText },
      share: undefined,
    });
    const { container, rerender } = renderReader({ highlights: [], chapter: '1' });
    selectVerse(container, 1);
    fireEvent.click(await screen.findByRole('button', { name: /^copy$/i }));
    expect(writes).toHaveLength(1);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    if (scenario === 'navigation') {
      rerender(wrapReader({ highlights: [], chapter: '2' }));
    } else {
      selectVerse(container, 1);
      fireEvent.click(await screen.findByRole('button', { name: /^share$/i }));
      expect(writes).toHaveLength(2);
      await act(async () => {
        if (scenario === 'newer failure') writes[1]!.reject(new Error('Permission denied'));
        else writes[1]!.resolve();
      });
    }
    if (scenario === 'newer failure') {
      expect(screen.getByRole('status')).toHaveTextContent(en.unableToShare);
    } else {
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    }

    await act(async () => {
      if (scenario === 'newer failure') writes[0]!.resolve();
      else writes[0]!.reject(new Error('Permission denied'));
    });
    if (scenario === 'newer failure') {
      expect(screen.getByRole('status')).toHaveTextContent(en.unableToShare);
    } else {
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    }
  },
);

it('keeps native Share cancellation retryable and falls back to copying other failures', async ({
  onTestFinished,
}) => {
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });
  let shareError: DOMException | null = new DOMException('Cancelled', 'AbortError');
  const share = vi.fn(async () => {
    if (shareError) throw shareError;
  });
  const writes: string[] = [];
  const writeText = (text: string): Promise<void> => {
    writes.push(text);
    return Promise.resolve();
  };
  const browser = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    clipboard: { writeText },
    share,
  };
  vi.stubGlobal('navigator', browser);
  const { container } = renderReader({ highlights: [] });
  selectVerse(container, 1);
  fireEvent.click(await screen.findByRole('button', { name: /^share$/i }));
  await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
  expect(writes).toHaveLength(0);
  expect(getVerseEl(container, 1)).toHaveClass('yv-v-selected');
  expect(screen.getByRole('button', { name: /^share$/i })).toBeVisible();
  expect(screen.getByRole('status')).toBeEmptyDOMElement();

  shareError = new DOMException('Not permitted', 'NotAllowedError');
  fireEvent.click(screen.getByRole('button', { name: /^share$/i }));
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0]).toBe('“In the beginning was the Word.”\n\nJohn 1:1 NIV');
  await waitFor(() => expectVerseMenuAbsent());
  expect(getVerseEl(container, 1)).not.toHaveClass('yv-v-selected');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();

  vi.stubGlobal('navigator', { ...browser, clipboard: undefined });
  selectVerse(container, 1);
  fireEvent.click(await screen.findByRole('button', { name: /^share$/i }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(en.unableToShare));
  expectVerseMenuAbsent();
  expect(getVerseEl(container, 1)).not.toHaveClass('yv-v-selected');

  shareError = null;
  selectVerse(container, 1);
  fireEvent.click(await screen.findByRole('button', { name: /^share$/i }));
  await waitFor(() => expectVerseMenuAbsent());
  expect(getVerseEl(container, 1)).not.toHaveClass('yv-v-selected');
  expect(screen.getByRole('status')).toBeEmptyDOMElement();
  expect(writes).toHaveLength(1);
});
it.each([
  'original selection',
  'new selection',
  'reselected same verse',
  'new passage',
  'new passage without selection',
])('native Share completion only clears its original selection: %s', async (scenario) => {
  onTestFinished(() => {
    vi.unstubAllGlobals();
  });
  let finishShare: () => void = () => {
    throw new Error('Share promise not initialized');
  };
  const pendingShare = new Promise<void>((resolve) => {
    finishShare = resolve;
  });
  const share = vi.fn(() => pendingShare);
  vi.stubGlobal('navigator', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    share,
  });
  const onVerseSelect = verseSelectSpy();
  const overrides: HookOverrides = {
    ...defaultOverrides(),
    usePassage: ({ usfm }) => ({
      passage: {
        ...mockPassage,
        id: usfm,
        reference: usfm,
        content:
          usfm === 'JHN.2'
            ? mockPassage.content.replace('In the beginning was the Word.', 'The second chapter.')
            : mockPassage.content,
      },
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
  };
  const reader = (chapter: string) =>
    wrapReader({ highlights: [], chapter, onVerseSelect }, overrides);
  const view = render(reader('1'));
  selectVerse(view.container, 1);
  fireEvent.click(await screen.findByRole('button', { name: /^share$/i }));
  expect(share).toHaveBeenCalledExactlyOnceWith({
    text: '“In the beginning was the Word.”\n\nJohn 1:1 NIV',
  });
  expect(getVerseEl(view.container, 1)).toHaveClass('yv-v-selected');

  if (scenario === 'new passage' || scenario === 'new passage without selection') {
    view.rerender(reader('2'));
    expect(getVerseEl(view.container, 1)).not.toHaveClass('yv-v-selected');
    if (scenario === 'new passage') {
      selectVerse(view.container, 2);
      expect(lastSelection(onVerseSelect)).toMatchObject({ chapter: '2', verses: [2] });
    }
  } else if (scenario === 'new selection') {
    selectVerse(view.container, 1);
    selectVerse(view.container, 2);
    expect(lastSelection(onVerseSelect)).toMatchObject({ chapter: '1', verses: [2] });
  } else if (scenario === 'reselected same verse') {
    selectVerse(view.container, 1);
    selectVerse(view.container, 1);
    expect(lastSelection(onVerseSelect)).toMatchObject({ chapter: '1', verses: [1] });
  }
  onVerseSelect.mockClear();

  await act(async () => {
    finishShare();
    await pendingShare;
  });

  if (scenario === 'original selection') {
    expect(lastSelection(onVerseSelect)).toEqual(selection([]));
    expect(getVerseEl(view.container, 1)).not.toHaveClass('yv-v-selected');
    expect(screen.queryByRole('button', { name: /^share$/i })).toBeNull();
  } else if (scenario === 'new passage without selection') {
    expect(onVerseSelect).not.toHaveBeenCalled();
    expect(getVerseEl(view.container, 1)).not.toHaveClass('yv-v-selected');
    expect(screen.queryByRole('button', { name: /^share$/i })).toBeNull();
  } else {
    expect.soft(onVerseSelect).not.toHaveBeenCalled();
    const selectedVerse = scenario === 'reselected same verse' ? 1 : 2;
    expect.soft(getVerseEl(view.container, selectedVerse)).toHaveClass('yv-v-selected');
    expect.soft(screen.queryByRole('button', { name: /^share$/i })).not.toBeNull();
  }
});
