/**
 * @vitest-environment jsdom
 */
// We stub ResizeObserver for jsdom (used by Radix/@floating-ui). The stub methods are intentionally no-ops.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import type { BibleBook, BibleVersion } from '@youversion/platform-core';
import type { HookOverrides } from '@youversion/platform-react-hooks';
import { HookOverrideProvider } from '@/test/hook-overrides';
import {
  BIBLE_READER_SPACING,
  BibleReader,
  changeBibleReaderLineSpacing,
  clampBibleReaderFontSize,
  createBibleThemeSettingsContentHandlers,
  nextBibleReaderFontSizeDown,
  nextBibleReaderFontSizeUp,
  type BibleThemeSettingsSnapshot,
} from './bible-reader';
import {
  INTER_FONT,
  SOURCE_SERIF_FONT,
  UNTITLED_SERIF_FONT,
  type FontFamily,
} from '@/lib/verse-html-utils';

import { installResizeObserverStub } from '@/test/dom-stubs';

installResizeObserverStub();

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
  };
}

function renderWithOverrides(ui: ReactElement) {
  return render(<HookOverrideProvider overrides={defaultOverrides()}>{ui}</HookOverrideProvider>);
}

function overridesRecordingVersionLanguage() {
  const requestedLanguages: string[] = [];
  const overrides = {
    ...defaultOverrides(),
    useVersions: (languageRanges?: string | string[]) => {
      if (languageRanges !== undefined && !Array.isArray(languageRanges)) {
        requestedLanguages.push(languageRanges);
      }
      return {
        versions: { data: [], next_page_token: null },
        loading: false,
        error: null,
        refetch: () => undefined,
      };
    },
  } satisfies HookOverrides;
  return {
    requestedLanguages,
    overrides,
  };
}

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
  id: 3034,
  localized_abbreviation: 'BSB',
  abbreviation: 'BSB',
  title: 'Berean Standard Bible',
  localized_title: 'Berean Standard Bible',
  language_tag: 'en',
  books: ['JHN'],
  youversion_deep_link: 'https://bible.com/versions/3034',
};

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

  it('cycles line spacing DEFAULT -> LG -> SM -> DEFAULT', () => {
    expect(changeBibleReaderLineSpacing(BIBLE_READER_SPACING.DEFAULT)).toBe(
      BIBLE_READER_SPACING.LG,
    );
    expect(changeBibleReaderLineSpacing(BIBLE_READER_SPACING.LG)).toBe(BIBLE_READER_SPACING.SM);
    expect(changeBibleReaderLineSpacing(BIBLE_READER_SPACING.SM)).toBe(
      BIBLE_READER_SPACING.DEFAULT,
    );
    // Any unknown value falls back to DEFAULT
    expect(changeBibleReaderLineSpacing(99)).toBe(BIBLE_READER_SPACING.DEFAULT);
  });
});

describe('createBibleThemeSettingsContentHandlers', () => {
  it('updates font size, family, and line spacing via host-owned setters', () => {
    let fontSize = 16;
    let fontFamily: FontFamily = UNTITLED_SERIF_FONT;
    let lineSpacing: number = BIBLE_READER_SPACING.DEFAULT;
    const setFontSize = vi.fn((n: number) => {
      fontSize = n;
    });
    const setFontFamily = vi.fn((f: FontFamily) => {
      fontFamily = f;
    });
    const setLineSpacing = vi.fn((n: number) => {
      lineSpacing = n;
      return n;
    });

    const handlers = createBibleThemeSettingsContentHandlers({
      getFontSize: () => fontSize,
      getFontFamily: () => fontFamily,
      setFontSize,
      setFontFamily,
      getLineSpacing: () => lineSpacing,
      setLineSpacing,
    });

    handlers.onFontIncreased();
    expect(setFontSize).toHaveBeenCalledWith(18);

    handlers.onFontDecreased();
    expect(setFontSize).toHaveBeenLastCalledWith(16);

    handlers.onFontSelected(INTER_FONT);
    expect(setFontFamily).toHaveBeenCalledWith(INTER_FONT);

    handlers.onFontSelected(UNTITLED_SERIF_FONT);
    expect(setFontFamily).toHaveBeenLastCalledWith(UNTITLED_SERIF_FONT);

    // Cycles DEFAULT -> LG -> SM -> DEFAULT
    handlers.onChangeLineSpacing();
    expect(setLineSpacing).toHaveBeenLastCalledWith(BIBLE_READER_SPACING.LG);
    handlers.onChangeLineSpacing();
    expect(setLineSpacing).toHaveBeenLastCalledWith(BIBLE_READER_SPACING.SM);
    handlers.onChangeLineSpacing();
    expect(setLineSpacing).toHaveBeenLastCalledWith(BIBLE_READER_SPACING.DEFAULT);
  });
});

describe('BibleReader theme settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('opens the default Reader Settings popover and updates font settings', async () => {
    const user = userEvent.setup();

    renderWithOverrides(
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

    await user.click(screen.getByRole('button', { name: /untitled/i }));
    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe(
        UNTITLED_SERIF_FONT,
      );
    });
  });

  it('migrates the legacy Source Serif preference to Untitled Serif on hydrate', async () => {
    const user = userEvent.setup();

    localStorage.setItem('youversion-platform:reader:font-family', SOURCE_SERIF_FONT);

    renderWithOverrides(
      <BibleReader.Root defaultVersionId={3034} defaultBook="JHN" defaultChapter="1">
        <BibleReader.Toolbar />
      </BibleReader.Root>,
    );

    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe(
        UNTITLED_SERIF_FONT,
      );
    });

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByText('Reader Settings')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /untitled/i }).className).toContain('yv:bg-primary');
  });

  it('leaves a non-legacy stored font family untouched on hydrate', async () => {
    localStorage.setItem('youversion-platform:reader:font-family', INTER_FONT);

    renderWithOverrides(
      <BibleReader.Root defaultVersionId={3034} defaultBook="JHN" defaultChapter="1">
        <BibleReader.Toolbar />
      </BibleReader.Root>,
    );

    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe(INTER_FONT);
    });
  });

  it('cycles line spacing and resizes the line-spacing button icon gap on click', async () => {
    const user = userEvent.setup();

    renderWithOverrides(
      <BibleReader.Root defaultVersionId={3034} defaultBook="JHN" defaultChapter="1">
        <BibleReader.Toolbar />
      </BibleReader.Root>,
    );

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByText('Reader Settings')).toBeInTheDocument();

    // The icon's gap container is the only <div> inside the line-spacing button.
    const gapClasses = () =>
      (screen.getByTestId('line-spacing').querySelector('div')?.className ?? '').split(/\s+/);

    // Starts at DEFAULT spacing (1.7) -> medium gap.
    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:line-spacing')).toBe('1.7');
    });
    expect(gapClasses()).toContain('yv:gap-1.5');

    // DEFAULT -> LG (2.0) -> widest gap.
    await user.click(screen.getByTestId('line-spacing'));
    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:line-spacing')).toBe('2');
    });
    expect(gapClasses()).toContain('yv:gap-2');

    // LG -> SM (1.45) -> tightest gap.
    await user.click(screen.getByTestId('line-spacing'));
    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:line-spacing')).toBe('1.45');
    });
    expect(gapClasses()).toContain('yv:gap-1');

    // SM -> DEFAULT (1.7) -> back to medium gap.
    await user.click(screen.getByTestId('line-spacing'));
    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:line-spacing')).toBe('1.7');
    });
    expect(gapClasses()).toContain('yv:gap-1.5');
  });

  it('calls onOpenBibleThemeSettings with a serializable snapshot and skips popover content', async () => {
    const user = userEvent.setup();
    const onOpenBibleThemeSettings = vi.fn<(snapshot: BibleThemeSettingsSnapshot) => void>();

    renderWithOverrides(
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

    const snapshot = onOpenBibleThemeSettings.mock.calls[0]![0];
    expect(snapshot).toEqual({
      fontSize: 18,
      fontFamily: INTER_FONT,
      lineSpacing: BIBLE_READER_SPACING.DEFAULT,
      minFontSize: 12,
      maxFontSize: 20,
    });
  });

  it('applies font updates via controlled props using snapshot and exported font math', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn<(snapshot: BibleThemeSettingsSnapshot) => void>();

    function ControlledHost() {
      const [fontSize, setFontSize] = useState(16);
      const [fontFamily, setFontFamily] = useState<FontFamily>(UNTITLED_SERIF_FONT);

      return (
        <>
          <button
            type="button"
            onClick={() => {
              const snap = onOpen.mock.calls[0]?.[0];
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

    renderWithOverrides(<ControlledHost />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(onOpen).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'simulate-native-apply' }));
    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:font-size')).toBeNull();
      expect(localStorage.getItem('youversion-platform:reader:font-family')).toBeNull();
    });

    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const nextSnap = onOpen.mock.calls[1]![0];
    expect(nextSnap.fontSize).toBe(14);
    expect(nextSnap.fontFamily).toBe(INTER_FONT);
  });
});

describe('BibleReader Toolbar - onChapterPickerPress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onChapterPickerPress from Root when chapter nav button is clicked and hides popover', async () => {
    const user = userEvent.setup();
    const onChapterPickerPress = vi.fn();

    renderWithOverrides(
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

describe('BibleReader version picker language', () => {
  it('seeds the version picker with defaultLanguageId instead of the browser language', () => {
    const { overrides, requestedLanguages } = overridesRecordingVersionLanguage();

    render(
      <HookOverrideProvider overrides={overrides}>
        <BibleReader.Root
          defaultVersionId={3034}
          defaultBook="JHN"
          defaultChapter="1"
          defaultLanguageId="es"
        >
          <BibleReader.Toolbar />
        </BibleReader.Root>
      </HookOverrideProvider>,
    );

    expect(requestedLanguages.includes('es')).toBe(true);
  });

  it('uses a controlled languageId for the version picker', () => {
    const { overrides, requestedLanguages } = overridesRecordingVersionLanguage();

    render(
      <HookOverrideProvider overrides={overrides}>
        <BibleReader.Root
          defaultVersionId={3034}
          defaultBook="JHN"
          defaultChapter="1"
          languageId="ko"
        >
          <BibleReader.Toolbar />
        </BibleReader.Root>
      </HookOverrideProvider>,
    );

    expect(requestedLanguages.includes('ko')).toBe(true);
  });
});
