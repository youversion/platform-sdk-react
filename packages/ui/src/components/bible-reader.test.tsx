/**
 * @vitest-environment jsdom
 */
// We stub ResizeObserver for jsdom (used by Radix/@floating-ui). The stub methods are intentionally no-ops.
/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { BibleBook, BiblePassage, BibleVersion, Language } from '@youversion/platform-core';
import {
  useBooks,
  useFilteredVersions,
  useLanguage,
  useLanguages,
  usePassage,
  useTheme,
  useVersion,
  useVersions,
} from '@youversion/platform-react-hooks';
import {
  BibleReader,
  clampBibleReaderFontSize,
  createBibleThemeSettingsContentHandlers,
  nextBibleReaderFontSizeDown,
  nextBibleReaderFontSizeUp,
  type BibleThemeSettingsSnapshot,
} from './bible-reader';
import { INTER_FONT, SOURCE_SERIF_FONT, type FontFamily } from '@/lib/verse-html-utils';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

vi.mock('@youversion/platform-react-hooks', async () => {
  const actual = await vi.importActual('@youversion/platform-react-hooks');
  return {
    ...actual,
    useBooks: vi.fn(),
    useFilteredVersions: vi.fn(),
    useLanguage: vi.fn(),
    useLanguages: vi.fn(),
    useTheme: vi.fn(),
    useVersion: vi.fn(),
    useVersions: vi.fn(),
    usePassage: vi.fn(),
  };
});

const mockPassageChapter1: BiblePassage = {
  id: 'JHN.1',
  content: '<p class="yv-p">Chapter one opening words</p>',
  reference: 'John 1',
};

const mockPassageChapter2: BiblePassage = {
  id: 'JHN.2',
  content: '<p class="yv-p">Chapter two opening words</p>',
  reference: 'John 2',
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
      { id: '2', title: '2', passage_id: 'JHN.2' },
    ],
  },
];

const mockVersion = {
  id: 3034,
  localized_abbreviation: 'BSB',
  abbreviation: 'BSB',
  title: 'Berean Standard Bible',
  language_tag: 'en',
} as BibleVersion;

function setupDefaultMocks() {
  localStorage.clear();
  vi.mocked(usePassage).mockReturnValue({
    passage: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
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
}

describe('BibleReader font helpers', () => {
  it('clamps font size to reader bounds', () => {
    expect(clampBibleReaderFontSize(8)).toBe(12);
    expect(clampBibleReaderFontSize(30)).toBe(20);
    expect(clampBibleReaderFontSize(16)).toBe(16);
  });

  it('steps up and down with clamping at bounds', () => {
    expect(nextBibleReaderFontSizeUp(16)).toBe(18);
    expect(nextBibleReaderFontSizeUp(20)).toBe(20);
    expect(nextBibleReaderFontSizeDown(18)).toBe(16);
    expect(nextBibleReaderFontSizeDown(12)).toBe(12);
  });
});

describe('createBibleThemeSettingsContentHandlers', () => {
  it('updates font size and family via host-owned setters', () => {
    let fontSize = 16;
    let fontFamily: FontFamily = SOURCE_SERIF_FONT;
    const setFontSize = vi.fn((n: number) => {
      fontSize = n;
    });
    const setFontFamily = vi.fn((f: FontFamily) => {
      fontFamily = f;
    });

    const handlers = createBibleThemeSettingsContentHandlers({
      getFontSize: () => fontSize,
      getFontFamily: () => fontFamily,
      setFontSize,
      setFontFamily,
    });

    handlers.onFontIncreased();
    expect(setFontSize).toHaveBeenCalledWith(18);

    handlers.onFontDecreased();
    expect(setFontSize).toHaveBeenLastCalledWith(16);

    handlers.onFontSelected(INTER_FONT);
    expect(setFontFamily).toHaveBeenCalledWith(INTER_FONT);
  });
});

describe('BibleReader theme settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('opens the default Reader Settings popover and updates font settings', async () => {
    const user = userEvent.setup();

    render(
      <BibleReader.Root defaultVersionId={3034} defaultBook="JHN" defaultChapter="1">
        <BibleReader.Toolbar />
      </BibleReader.Root>,
    );

    await user.click(screen.getByRole('button', { name: 'Settings' }));

    expect(await screen.findByText('Reader Settings')).toBeInTheDocument();

    await user.click(screen.getByTestId('increase-font-size'));
    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:font-size')).toBe('18');
    });

    await user.click(screen.getByRole('button', { name: /inter/i }));
    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe(INTER_FONT);
    });
  });

  it('calls onOpenBibleThemeSettings with a serializable snapshot and skips popover content', async () => {
    const user = userEvent.setup();
    const onOpenBibleThemeSettings = vi.fn();

    render(
      <BibleReader.Root
        defaultVersionId={3034}
        defaultBook="JHN"
        defaultChapter="1"
        fontSize={18}
        fontFamily={INTER_FONT}
      >
        <BibleReader.Toolbar onOpenBibleThemeSettings={onOpenBibleThemeSettings} />
      </BibleReader.Root>,
    );

    await user.click(screen.getByRole('button', { name: 'Settings' }));

    expect(onOpenBibleThemeSettings).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Reader Settings')).not.toBeInTheDocument();

    const snapshot = onOpenBibleThemeSettings.mock.calls[0]![0] as BibleThemeSettingsSnapshot;
    expect(snapshot).toEqual({
      fontSize: 18,
      fontFamily: INTER_FONT,
      minFontSize: 12,
      maxFontSize: 20,
    });
  });

  it('applies font updates via controlled props using snapshot and exported font math', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();

    function ControlledHost() {
      const [fontSize, setFontSize] = useState(16);
      const [fontFamily, setFontFamily] = useState<FontFamily>(SOURCE_SERIF_FONT);

      return (
        <>
          <button
            type="button"
            onClick={() => {
              const snap = onOpen.mock.calls[0]?.[0] as BibleThemeSettingsSnapshot | undefined;
              if (snap) {
                setFontSize(nextBibleReaderFontSizeDown(snap.fontSize));
                setFontFamily(INTER_FONT);
              }
            }}
          >
            simulate-native-apply
          </button>
          <BibleReader.Root
            defaultVersionId={3034}
            defaultBook="JHN"
            defaultChapter="1"
            fontSize={fontSize}
            fontFamily={fontFamily}
            onFontSizeChange={setFontSize}
            onFontFamilyChange={setFontFamily}
          >
            <BibleReader.Toolbar onOpenBibleThemeSettings={onOpen} />
          </BibleReader.Root>
        </>
      );
    }

    render(<ControlledHost />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpen).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'simulate-native-apply' }));
    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:font-size')).toBeNull();
      expect(localStorage.getItem('youversion-platform:reader:font-family')).toBeNull();
    });

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const nextSnap = onOpen.mock.calls[1]![0] as BibleThemeSettingsSnapshot;
    expect(nextSnap.fontSize).toBe(14);
    expect(nextSnap.fontFamily).toBe(INTER_FONT);
  });
});

describe('BibleReader Toolbar - onChapterPickerPress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('calls onChapterPickerPress from Root when chapter nav button is clicked and hides popover', async () => {
    const user = userEvent.setup();
    const onChapterPickerPress = vi.fn();

    render(
      <BibleReader.Root
        defaultVersionId={3034}
        defaultBook="JHN"
        defaultChapter="1"
        onChapterPickerPress={onChapterPickerPress}
      >
        <BibleReader.Toolbar />
      </BibleReader.Root>,
    );

    const chapterButton = screen.getByRole('button', { name: 'Change Bible book and chapter' });
    await user.click(chapterButton);

    expect(onChapterPickerPress).toHaveBeenCalledTimes(1);
    expect(onChapterPickerPress).toHaveBeenCalledWith({
      book: 'JHN',
      chapter: '1',
      versionId: 3034,
    });

    expect(screen.queryByPlaceholderText('Search')).not.toBeInTheDocument();
  });
});

describe('BibleReader Content - chapter loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  function renderContent(chapter: string) {
    return render(
      <BibleReader.Root defaultVersionId={3034} defaultBook="JHN" defaultChapter={chapter}>
        <BibleReader.Content />
      </BibleReader.Root>,
    );
  }

  it('shows a spinner on initial load when passage is null', () => {
    vi.mocked(usePassage).mockReturnValue({
      passage: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderContent('1');

    expect(screen.getByRole('status', { name: /loading passage/i })).toBeInTheDocument();
    expect(screen.queryByText('Chapter one opening words')).not.toBeInTheDocument();
  });

  it('shows a spinner instead of stale text during chapter change', () => {
    vi.mocked(usePassage).mockReturnValue({
      passage: mockPassageChapter1,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderContent('2');

    expect(screen.getByRole('status', { name: /loading passage/i })).toBeInTheDocument();
    expect(screen.queryByText('Chapter one opening words')).not.toBeInTheDocument();
    expect(screen.queryByText('Chapter two opening words')).not.toBeInTheDocument();
  });

  it('renders passage text when the loaded passage matches the requested chapter', async () => {
    vi.mocked(usePassage).mockReturnValue({
      passage: mockPassageChapter2,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderContent('2');

    await waitFor(() => {
      expect(screen.getByText('Chapter two opening words')).toBeInTheDocument();
    });
    expect(screen.queryByRole('status', { name: /loading passage/i })).not.toBeInTheDocument();
  });

  it('shows chapter unavailable message without passage content or spinner', () => {
    vi.mocked(usePassage).mockReturnValue({
      passage: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderContent('99');

    expect(screen.getByText(/this chapter is not available in this version/i)).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: /loading passage/i })).not.toBeInTheDocument();
    expect(usePassage).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { enabled: false },
      }),
    );
  });
});
