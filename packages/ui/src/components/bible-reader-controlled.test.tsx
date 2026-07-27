/**
 * @vitest-environment jsdom
 */
// Controlled-mode (YPE-3705) tests for BibleReader highlights: pure projection
// from the `highlights` prop, provable inertness (no highlight network or
// localStorage traffic), intent events, and mode latching.
// We stub ResizeObserver for jsdom (used by Radix/@floating-ui). The stub methods are intentionally no-ops.
/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type {
  BibleBook,
  BiblePassage,
  BibleVersion,
  Highlight,
  Language,
} from '@youversion/platform-core';
import {
  useBooks,
  useFilteredVersions,
  useHighlights,
  useLanguage,
  useLanguages,
  useOrganizations,
  usePassage,
  useTheme,
  useVersion,
  useVersions,
} from '@youversion/platform-react-hooks';
import { BibleReader, type BibleReaderRootProps } from './bible-reader';
import { HIGHLIGHT_COLORS } from './verse-action-popover';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

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

vi.mock('@youversion/platform-react-hooks', async () => {
  const actual = await vi.importActual('@youversion/platform-react-hooks');
  return {
    ...actual,
    useBooks: vi.fn(),
    useFilteredVersions: vi.fn(),
    useHighlights: vi.fn(),
    useLanguage: vi.fn(),
    useLanguages: vi.fn(),
    useOrganizations: vi.fn(),
    usePassage: vi.fn(),
    useTheme: vi.fn(),
    useVersion: vi.fn(),
    useVersions: vi.fn(),
  };
});

const YELLOW = HIGHLIGHT_COLORS[0]; // fffe00
const GREEN = HIGHLIGHT_COLORS[1]; // 5dff79

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

const mockVersion = {
  id: 111,
  localized_abbreviation: 'NIV',
  abbreviation: 'NIV',
  title: 'New International Version',
  language_tag: 'en',
} as BibleVersion;

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

function setupDefaultMocks() {
  vi.mocked(useTheme).mockReturnValue('light');
  vi.mocked(useBooks).mockReturnValue({
    books: { data: [...mockBooks], next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useVersion).mockReturnValue({
    version: mockVersion,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(usePassage).mockReturnValue({
    passage: mockPassage,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  // Self-contained path is inert in these tests (controlled mode owns the
  // surface). Keep useHighlights stubbed so Content can mount without a
  // YouVersionProvider.
  vi.mocked(useHighlights).mockReturnValue({
    highlights: { data: [], next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
    createHighlight: vi.fn(),
    deleteHighlight: vi.fn(),
  });
  vi.mocked(useLanguages).mockReturnValue({
    languages: { data: [] as Language[], next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useLanguage).mockReturnValue({
    language: { id: 'en', language: 'English', display_names: { en: 'English' } } as Language,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useVersions).mockReturnValue({
    versions: { data: [], next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(useFilteredVersions).mockReturnValue([]);
  vi.mocked(useOrganizations).mockReturnValue({ organizations: new Map() });
}

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

function renderReader(props: Partial<BibleReaderRootProps> = {}) {
  return render(readerJsx(props));
}

function getVerseEl(container: HTMLElement, verse: number): HTMLElement {
  const els = container.querySelectorAll<HTMLElement>(`.yv-v[v="${verse}"]`);
  const el = els[els.length - 1];
  if (!el) throw new Error(`Verse ${verse} not rendered`);
  return el;
}

function selectVerse(container: HTMLElement, verse: number) {
  fireEvent.click(getVerseEl(container, verse));
}

/**
 * Color the reader paints for a highlight fill. These tests run in light mode
 * (theme mocked to 'light'), where the fill is full opacity (Swift parity);
 * jsdom serializes a fully opaque color to `rgb(...)`.
 */
function fillFor(hex: string): string {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
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

const selection = (verses: number[]) => ({
  versionId: 111,
  book: 'JHN',
  chapter: '1',
  verses,
  passageIds: verses.map((verse) => `JHN.1.${verse}`),
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setupDefaultMocks();
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

  it('ignores entries with colors outside the built-in swatches (no un-removable paint)', () => {
    const highlights: Highlight[] = [
      { version_id: 111, passage_id: 'JHN.1.1', color: 'abcdef' },
      { version_id: 111, passage_id: 'JHN.1.2', color: YELLOW },
    ];
    const { container } = renderReader({ highlights });

    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');
    expect(getVerseEl(container, 2).style.backgroundColor).toBe(fillFor(YELLOW));
  });

  it('re-projects when the highlights prop changes (host round-trip)', () => {
    const { container, rerender } = renderReader({ highlights: [] });
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');

    rerender(
      readerJsx({ highlights: [{ version_id: 111, passage_id: 'JHN.1.1', color: YELLOW }] }),
    );
    expect(getVerseEl(container, 1).style.backgroundColor).toBe(fillFor(YELLOW));
  });
});

describe('BibleReader controlled mode - provable inertness', () => {
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

      const highlightKey = (key: unknown) => String(key).includes('highlights');
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
  });

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
    expect(onHighlightApply).toHaveBeenCalledWith({ ...selection([1, 3]), color: YELLOW });

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
      rerender(readerJsx({ highlights: next, onHighlightRemove }));
    const { container, rerender } = renderReader({ highlights, onHighlightRemove });

    selectVerse(container, 1);
    selectVerse(container, 2);
    selectVerse(container, 3);
    // Two active colors -> two clear circles, ordered yellow then green.
    await waitFor(() => expect(getClearButtons()).toHaveLength(2));

    fireEvent.click(getClearButtons()[0]!);
    expect(onHighlightRemove).toHaveBeenCalledTimes(1);
    expect(onHighlightRemove).toHaveBeenLastCalledWith({ ...selection([1]), color: YELLOW });

    // Green still showing on a selected verse -> popover stays open (AC 8a).
    expect(screen.getByRole('dialog')).toBeTruthy();

    // Host round-trips the removal; the reader re-projects (verse 1 unpaints,
    // one clear circle remains).
    rerenderWith([{ version_id: 111, passage_id: 'JHN.1.2', color: GREEN }]);
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');
    await waitFor(() => expect(getClearButtons()).toHaveLength(1));

    fireEvent.click(getClearButtons()[0]!);
    expect(onHighlightRemove).toHaveBeenCalledTimes(2);
    expect(onHighlightRemove).toHaveBeenLastCalledWith({ ...selection([2]), color: GREEN });

    // Last active color removed -> popover dismisses (AC 8).
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('ignores onHighlightApply / onHighlightRemove in self-contained mode', async () => {
    const onHighlightApply = vi.fn();
    const onHighlightRemove = vi.fn();
    const { container } = renderReader({ onHighlightApply, onHighlightRemove });

    selectVerse(container, 1);
    // Self-contained with no `enableHighlights` opt-in and no auth provider
    // mounted: the color row is hidden entirely (`highlightsEnabled` from
    // PR-288). Copy/Share still open the popover. Controlled intent callbacks
    // must never fire.
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

    rerender(readerJsx());

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('latched at first mount'));
    // Transient undefined renders as "no highlights" — still controlled.
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');
    expect(getVerseEl(container, 2).style.backgroundColor).toBe('');
  });

  it('stays self-contained when highlights appears after mount: warns and ignores the prop', () => {
    const { container, rerender } = renderReader();
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');

    rerender(
      readerJsx({ highlights: [{ version_id: 111, passage_id: 'JHN.1.1', color: YELLOW }] }),
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('latched at first mount'));
    expect(getVerseEl(container, 1).style.backgroundColor).toBe('');
  });

  it('treats [] as controlled while undefined means self-contained', () => {
    const controlled = renderReader({ highlights: [] });
    expect(getVerseEl(controlled.container, 1).style.backgroundColor).toBe('');
    controlled.unmount();

    // Self-contained with no `enableHighlights` opt-in and no auth provider:
    // also empty, but the mode is latched (a later highlights prop would be
    // ignored — covered above).
    const selfContained = renderReader();
    expect(getVerseEl(selfContained.container, 1).style.backgroundColor).toBe('');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
