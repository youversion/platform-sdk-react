/**
 * @vitest-environment jsdom
 */
// We stub ResizeObserver for jsdom (used by Radix/@floating-ui). The stub methods are intentionally no-ops.
/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BibleBook, BibleVersion, Language } from '@youversion/platform-core';
import {
  useBooks,
  useFilteredVersions,
  useLanguage,
  useLanguages,
  useTheme,
  useVersion,
  useVersions,
} from '@youversion/platform-react-hooks';
import { BibleReader, type BibleThemeSettingsData } from './bible-reader';
import { INTER_FONT, SOURCE_SERIF_FONT } from '@/lib/verse-html-utils';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

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
  };
});

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

describe('BibleReader theme settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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

  it('calls onOpenBibleThemeSettings with current settings/actions and skips popover content', async () => {
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

    const data = onOpenBibleThemeSettings.mock.calls[0]![0] as BibleThemeSettingsData;
    expect(data).toMatchObject({
      fontSize: 18,
      fontFamily: INTER_FONT,
      minFontSize: 12,
      maxFontSize: 20,
    });
    expect(data.onFontIncreased).toEqual(expect.any(Function));
    expect(data.onFontDecreased).toEqual(expect.any(Function));
    expect(data.onFontSelected).toEqual(expect.any(Function));
  });

  it('returns next settings when override actions update SDK-owned state', async () => {
    const user = userEvent.setup();
    const onOpenBibleThemeSettings = vi.fn();

    render(
      <BibleReader.Root defaultVersionId={3034} defaultBook="JHN" defaultChapter="1">
        <BibleReader.Toolbar onOpenBibleThemeSettings={onOpenBibleThemeSettings} />
      </BibleReader.Root>,
    );

    await user.click(screen.getByRole('button', { name: 'Settings' }));

    const data = onOpenBibleThemeSettings.mock.calls[0]![0] as BibleThemeSettingsData;

    expect(data.onFontIncreased()).toEqual({
      fontSize: 18,
      fontFamily: SOURCE_SERIF_FONT,
    });
    expect(data.onFontIncreased()).toEqual({
      fontSize: 20,
      fontFamily: SOURCE_SERIF_FONT,
    });
    expect(data.onFontIncreased()).toEqual({
      fontSize: 20,
      fontFamily: SOURCE_SERIF_FONT,
    });
    expect(data.onFontDecreased()).toEqual({
      fontSize: 18,
      fontFamily: SOURCE_SERIF_FONT,
    });
    expect(data.onFontSelected(INTER_FONT)).toEqual({
      fontSize: 18,
      fontFamily: INTER_FONT,
    });

    await waitFor(() => {
      expect(localStorage.getItem('youversion-platform:reader:font-size')).toBe('18');
      expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe(INTER_FONT);
    });
  });
});
