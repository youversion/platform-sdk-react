/**
 * @vitest-environment jsdom
 */
// We stub ResizeObserver for jsdom (used by Radix/@floating-ui). The stub methods are intentionally no-ops.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import type { BibleBook, BibleVersion } from '@youversion/platform-core';
import { YouVersionContext, type HookOverrides } from '@youversion/platform-react-hooks';
import { HookOverrideProvider } from '@/test/hook-overrides';
import { InterfaceDirectionProvider } from '@/lib/direction';
import { ReuseShadowBoundary } from '@/lib/shadow-isolation';
import { ShadowRootHost } from '@/lib/shadow-root-host';
import {
  BIBLE_READER_SPACING,
  BibleReader,
  BibleThemeSettingsContent,
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

function renderWithOverrides(ui: ReactElement) {
  return render(
    <HookOverrideProvider overrides={defaultOverrides()}>
      <ReuseShadowBoundary>{ui}</ReuseShadowBoundary>
    </HookOverrideProvider>,
  );
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

describe('BibleThemeSettingsContent public boundary', () => {
  it('owns one empty SSR host and reuses it during hydration', async () => {
    const element = (
      <BibleThemeSettingsContent
        theme="light"
        fontSize={16}
        fontFamily={INTER_FONT}
        lineSpacing={BIBLE_READER_SPACING.DEFAULT}
        onFontSelected={vi.fn()}
        onFontIncreased={vi.fn()}
        onFontDecreased={vi.fn()}
        onChangeLineSpacing={vi.fn()}
      />
    );
    const serverMarkup = renderToString(element);

    expect(serverMarkup).toBe('<div data-yv-shadow-host="true"></div>');

    const container = document.createElement('div');
    container.innerHTML = serverMarkup;
    document.body.append(container);
    const serverHost = container.firstElementChild;
    const recoverableErrors: unknown[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let root: Root | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(container, element, {
          onRecoverableError: (error) => recoverableErrors.push(error),
        });
      });

      const host = await waitFor(() => {
        const candidate = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
        if (!candidate?.shadowRoot?.querySelector('[data-testid="line-spacing"]')) {
          throw new Error('settings controls not mounted inside an open shadow root');
        }
        return candidate;
      });

      expect(container.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(1);
      expect(host).toBe(serverHost);
      expect(host.childNodes).toHaveLength(0);
      expect(host.shadowRoot?.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(0);
      expect(recoverableErrors).toEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      if (root) await act(async () => root?.unmount());
      consoleError.mockRestore();
      container.remove();
    }
  });

  it('preserves standalone callbacks, limits, selected font, theme, direction, and controls', async () => {
    const user = userEvent.setup();
    const onFontIncreased = vi.fn();
    const onFontDecreased = vi.fn();
    const onFontSelected = vi.fn<(fontFamily: FontFamily) => void>();
    const onChangeLineSpacing = vi.fn();

    function StandaloneSettings({
      direction,
      fontSize = 12,
      fontFamily = UNTITLED_SERIF_FONT,
      theme = 'light',
      providerTheme = 'dark',
    }: {
      direction: 'ltr' | 'rtl';
      fontSize?: number;
      fontFamily?: FontFamily;
      theme?: 'light' | 'dark';
      providerTheme?: 'light' | 'dark';
    }) {
      return (
        <YouVersionContext.Provider value={{ appKey: 'test', theme: providerTheme }}>
          <InterfaceDirectionProvider direction={direction}>
            <BibleThemeSettingsContent
              theme={theme}
              fontSize={fontSize}
              fontFamily={fontFamily}
              lineSpacing={BIBLE_READER_SPACING.DEFAULT}
              onFontIncreased={onFontIncreased}
              onFontDecreased={onFontDecreased}
              onFontSelected={onFontSelected}
              onChangeLineSpacing={onChangeLineSpacing}
            />
          </InterfaceDirectionProvider>
        </YouVersionContext.Provider>
      );
    }

    const view = render(<StandaloneSettings direction="rtl" />);
    const host = await waitFor(() => {
      const candidate = view.container.querySelector<HTMLElement>('[data-yv-shadow-host]');
      if (!candidate?.shadowRoot?.querySelector('[data-testid="line-spacing"]')) {
        throw new Error('standalone settings not mounted');
      }
      return candidate;
    });
    const root = host.shadowRoot!;
    const shadowScope = root.querySelector<HTMLElement>('[data-yv-shadow-content-wrapper]')!;
    const settings = within(shadowScope);
    const body = settings.getByTestId('line-spacing').closest<HTMLElement>('[data-yv-sdk]');
    const wrapper = root.querySelector('[data-yv-shadow-content-wrapper]');
    const decrease = settings.getByRole('button', { name: 'Decrease font size' });
    const increase = settings.getByRole('button', { name: 'Increase font size' });
    const lineSpacing = settings.getByRole('button', { name: 'Change line spacing' });
    const inter = settings.getByRole('button', { name: /Inter/ });
    const serif = settings.getByRole('button', { name: /Untitled Serif/ });

    expect(settings.getAllByRole('button')).toHaveLength(5);
    expect(wrapper).toHaveAttribute('data-yv-theme', 'light');
    expect(body).toHaveAttribute('data-yv-theme', 'light');
    expect(body).toHaveAttribute('dir', 'rtl');
    expect(decrease).toBeDisabled();
    expect(serif.className).toContain('yv:bg-primary');
    expect(inter.className).not.toContain('yv:bg-primary');

    await user.click(decrease);
    expect(onFontDecreased).not.toHaveBeenCalled();
    await user.click(increase);
    expect(onFontIncreased).toHaveBeenCalledTimes(1);
    await user.click(inter);
    expect(onFontSelected).toHaveBeenCalledWith(INTER_FONT);
    await user.click(lineSpacing);
    expect(onChangeLineSpacing).toHaveBeenCalledTimes(1);

    view.rerender(
      <StandaloneSettings
        direction="ltr"
        fontSize={20}
        fontFamily={INTER_FONT}
        theme="dark"
        providerTheme="light"
      />,
    );
    expect(body).toHaveAttribute('dir', 'ltr');
    expect(wrapper).toHaveAttribute('data-yv-theme', 'dark');
    expect(body).toHaveAttribute('data-yv-theme', 'dark');
    expect(inter.className).toContain('yv:bg-primary');
    expect(serif.className).not.toContain('yv:bg-primary');
    expect(increase).toBeDisabled();
    const increaseCallCountAtMaximum = onFontIncreased.mock.calls.length;
    await user.click(increase);
    expect(onFontIncreased).toHaveBeenCalledTimes(increaseCallCountAtMaximum);
    await user.click(decrease);
    expect(onFontDecreased).toHaveBeenCalledTimes(1);
  });
});

it('reuses a future reader boundary without nesting a settings host', async () => {
  localStorage.clear();
  const user = userEvent.setup();
  const reader = (
    <HookOverrideProvider overrides={defaultOverrides()}>
      <BibleReader.Root defaultVersionId={3034} defaultBook="JHN" defaultChapter="1">
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </HookOverrideProvider>
  );
  const outerView = render(
    <ShadowRootHost portalStrategy="local-inline">
      <ReuseShadowBoundary>{reader}</ReuseShadowBoundary>
    </ShadowRootHost>,
  );
  const outerHost = await waitFor(() => {
    const candidate = outerView.container.querySelector<HTMLElement>('[data-yv-shadow-host]');
    if (!candidate?.shadowRoot?.querySelector('button[aria-label="Settings"]')) {
      throw new Error('reader not mounted in the simulated boundary');
    }
    return candidate;
  });
  const outerRoot = outerHost.shadowRoot!;
  const outerScope = outerRoot.querySelector<HTMLElement>('[data-yv-shadow-content-wrapper]')!;

  await user.click(within(outerScope).getByRole('button', { name: 'Settings' }));
  const settingsControl = await waitFor(() => {
    const candidate = outerRoot.querySelector<HTMLElement>('[data-testid="line-spacing"]');
    if (!candidate) throw new Error('reader settings not rendered in the outer root');
    return candidate;
  });
  expect(outerView.container.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(1);
  expect(outerRoot.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(0);
  expect(settingsControl.getRootNode()).toBe(outerRoot);
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

it('keeps chapter targets canonical while semantic icons follow RTL interface direction', async () => {
  const user = userEvent.setup();
  const onChapterChange = vi.fn();

  renderWithOverrides(
    <InterfaceDirectionProvider direction="rtl">
      <BibleReader.Root
        defaultVersionId={3034}
        defaultBook="JHN"
        defaultChapter="1"
        onChapterChange={onChapterChange}
      >
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </InterfaceDirectionProvider>,
  );

  const chapterButton = screen.getByRole('button', { name: 'Change Bible book and chapter' });
  const labels = chapterButton.querySelectorAll('bdi[dir="auto"]');
  expect(labels).toHaveLength(2);
  expect(labels[1]).toHaveTextContent('1');

  await user.click(screen.getByRole('button', { name: 'Next chapter' }));

  expect(onChapterChange).toHaveBeenCalledWith('2');
  expect(
    screen
      .getByRole('button', { name: 'Previous chapter' })
      .querySelector('path')
      ?.getAttribute('d'),
  ).toContain('8.29289');
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
