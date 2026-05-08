/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ResizeObserver is used by VersionAbbreviationIcon and @floating-ui/dom (Radix Popover)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

import {
  BibleLanguagePickerContent,
  BibleVersionPicker,
  BibleVersionPickerLanguageTrigger,
  RECENT_VERSIONS_KEY,
} from './bible-version-picker';
import {
  useVersions,
  useVersion,
  useLanguages,
  useLanguage,
  useFilteredVersions,
  useTheme,
} from '@youversion/platform-react-hooks';
import type { BibleVersion, Language } from '@youversion/platform-core';

vi.mock('@youversion/platform-react-hooks');

const mockVersions: BibleVersion[] = [
  {
    id: 111,
    title: 'New International Version',
    abbreviation: 'NIV',
    localized_title: 'New International Version',
    localized_abbreviation: 'NIV',
    language_tag: 'en',
    books: ['GEN', 'EXO'],
    youversion_deep_link: 'https://bible.com/versions/111',
  },
  {
    id: 206,
    title: 'New Living Translation',
    abbreviation: 'NLT',
    localized_title: 'New Living Translation',
    localized_abbreviation: 'NLT',
    language_tag: 'en',
    books: ['GEN', 'EXO'],
    youversion_deep_link: 'https://bible.com/versions/206',
  },
];

const mockLanguages: Language[] = [
  {
    id: 'en',
    language: 'English',
    display_names: { en: 'English' },
    speaking_population: 1500000000,
  },
  {
    id: 'es',
    language: 'Spanish',
    display_names: { en: 'Spanish', es: 'Español' },
    speaking_population: 500000000,
  },
];

function setupDefaultMocks({
  versionsLoading = false,
  filteredVersions = mockVersions,
}: {
  versionsLoading?: boolean;
  filteredVersions?: BibleVersion[];
} = {}) {
  vi.mocked(useVersions).mockReturnValue({
    versions: versionsLoading ? null : { data: mockVersions, next_page_token: null },
    loading: versionsLoading,
    error: null,
    refetch: vi.fn(),
  });

  vi.mocked(useVersion).mockReturnValue({
    version: mockVersions[0]!,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });

  vi.mocked(useLanguages).mockImplementation((params: Parameters<typeof useLanguages>[0]) => ({
    languages: {
      data: params && 'country' in params ? [mockLanguages[0]!] : mockLanguages,
      next_page_token: null,
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }));

  vi.mocked(useLanguage).mockReturnValue({
    language: { id: 'en', display_names: { en: 'English' }, language: 'English' },
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as ReturnType<typeof useLanguage>);

  vi.mocked(useFilteredVersions).mockReturnValue(filteredVersions);

  vi.mocked(useTheme).mockReturnValue('light');
}

function renderPicker() {
  return render(
    <BibleVersionPicker.Root versionId={111} onVersionChange={vi.fn()}>
      <BibleVersionPicker.Trigger>
        <button type="button">Open</button>
      </BibleVersionPicker.Trigger>
      <BibleVersionPicker.Content />
    </BibleVersionPicker.Root>,
  );
}

async function openPicker() {
  const trigger = screen.getByRole('button', { name: /open/i });
  await userEvent.click(trigger);
}

describe('BibleVersionPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('loading state', () => {
    it('should show spinner in version list when versions are loading', async () => {
      setupDefaultMocks({ versionsLoading: true, filteredVersions: [] });
      renderPicker();
      await openPicker();

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const spinner = dialog.querySelector('svg.yv\\:animate-spin');
        expect(spinner).not.toBeNull();
      });

      expect(screen.queryByText('No versions found')).toBeNull();
    });

    it('should show spinner in version list when loading even with recent versions', async () => {
      const recentVersions = [
        {
          id: 111,
          title: 'New International Version',
          localized_abbreviation: 'NIV',
          abbreviation: 'NIV',
        },
      ];
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => {
        if (key === RECENT_VERSIONS_KEY) return JSON.stringify(recentVersions);
        return null;
      });

      setupDefaultMocks({ versionsLoading: true, filteredVersions: [] });
      renderPicker();
      await openPicker();

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const spinners = dialog.querySelectorAll('svg.yv\\:animate-spin');
        // Badge spinner + version list spinner
        expect(spinners.length).toBeGreaterThanOrEqual(2);
      });

      expect(screen.queryByText('No versions found')).toBeNull();

      getItemSpy.mockRestore();
    });

    it('should show spinner in badge when versions are loading', async () => {
      setupDefaultMocks({ versionsLoading: true, filteredVersions: [] });
      renderPicker();
      await openPicker();

      await waitFor(() => {
        const languageButton = screen.getByRole('button', { name: /select language/i });
        const badge = languageButton.querySelector('[data-slot="badge"]');
        expect(badge).not.toBeNull();

        const spinner = badge!.querySelector('svg');
        expect(spinner).not.toBeNull();

        expect(badge!.textContent).not.toContain('0');
      });
    });
  });

  describe('empty state', () => {
    it('should show "No versions found" when not loading and results are empty', async () => {
      setupDefaultMocks({ versionsLoading: false, filteredVersions: [] });
      renderPicker();
      await openPicker();

      await waitFor(() => {
        expect(screen.getByText('No versions found')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const spinners = dialog.querySelectorAll('svg.yv\\:animate-spin');
      expect(spinners).toHaveLength(0);
    });
  });

  describe('loaded state', () => {
    it('should show version count in badge when loaded', async () => {
      setupDefaultMocks({ versionsLoading: false, filteredVersions: mockVersions });
      renderPicker();
      await openPicker();

      await waitFor(() => {
        const languageButton = screen.getByRole('button', { name: /select language/i });
        const badge = languageButton.querySelector('[data-slot="badge"]');
        expect(badge).not.toBeNull();
        expect(badge!.textContent).toBe('2');
      });
    });

    it('should render version items when loaded', async () => {
      setupDefaultMocks({ versionsLoading: false, filteredVersions: mockVersions });
      renderPicker();
      await openPicker();

      await waitFor(() => {
        expect(
          screen.getByRole('listitem', { name: /new international version/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('listitem', { name: /new living translation/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('onVersionPickerPress override', () => {
    it('calls onVersionPickerPress with { versionId, languageId } when Trigger is clicked', async () => {
      const user = userEvent.setup();
      const onVersionPickerPress = vi.fn();

      setupDefaultMocks();
      render(
        <BibleVersionPicker.Root versionId={111} onVersionPickerPress={onVersionPickerPress}>
          <BibleVersionPicker.Trigger />
        </BibleVersionPicker.Root>,
      );

      await user.click(screen.getByRole('button'));

      expect(onVersionPickerPress).toHaveBeenCalledTimes(1);
      expect(onVersionPickerPress).toHaveBeenCalledWith({
        versionId: 111,
        languageId: 'en',
      });
    });

    it('does NOT render popover content when onVersionPickerPress is provided', () => {
      setupDefaultMocks();
      render(
        <BibleVersionPicker.Root versionId={111} onVersionPickerPress={vi.fn()}>
          <BibleVersionPicker.Trigger />
        </BibleVersionPicker.Root>,
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Search')).not.toBeInTheDocument();
    });

    it('uses controlled languageId in onVersionPickerPress payload', async () => {
      const user = userEvent.setup();
      const onVersionPickerPress = vi.fn();

      setupDefaultMocks();
      render(
        <BibleVersionPicker.Root
          versionId={111}
          languageId="es"
          onVersionPickerPress={onVersionPickerPress}
        >
          <BibleVersionPicker.Trigger />
        </BibleVersionPicker.Root>,
      );

      await user.click(screen.getByRole('button'));

      expect(onVersionPickerPress).toHaveBeenCalledWith({
        versionId: 111,
        languageId: 'es',
      });
    });

    it('does not call onVersionPickerPress when trigger click is prevented', async () => {
      const user = userEvent.setup();
      const onVersionPickerPress = vi.fn();

      setupDefaultMocks();
      render(
        <BibleVersionPicker.Root versionId={111} onVersionPickerPress={onVersionPickerPress}>
          <BibleVersionPicker.Trigger onClick={(event) => event.preventDefault()} />
        </BibleVersionPicker.Root>,
      );

      await user.click(screen.getByRole('button'));

      expect(onVersionPickerPress).not.toHaveBeenCalled();
    });
  });

  describe('standalone content', () => {
    it('renders version content and calls onRequestClose after version selection', async () => {
      const user = userEvent.setup();
      const onVersionChange = vi.fn();
      const onRequestClose = vi.fn();

      setupDefaultMocks();
      render(
        <BibleVersionPicker.Root
          versionId={111}
          onVersionChange={onVersionChange}
          onVersionPickerPress={vi.fn()}
        >
          <BibleVersionPicker.Content onRequestClose={onRequestClose} />
        </BibleVersionPicker.Root>,
      );

      await user.click(screen.getByRole('listitem', { name: /new living translation/i }));

      expect(onVersionChange).toHaveBeenCalledWith(206);
      expect(onRequestClose).toHaveBeenCalledTimes(1);
    });

    it('renders language content and calls onRequestClose after language selection', async () => {
      const user = userEvent.setup();
      const onLanguageChange = vi.fn();
      const onRequestClose = vi.fn();

      setupDefaultMocks();
      render(
        <BibleVersionPicker.Root
          versionId={111}
          defaultLanguageId="es"
          onLanguageChange={onLanguageChange}
          onVersionPickerPress={vi.fn()}
        >
          <BibleLanguagePickerContent onRequestClose={onRequestClose} />
        </BibleVersionPicker.Root>,
      );

      expect(screen.queryByText('Select Language')).not.toBeInTheDocument();
      expect(screen.getByText('Suggested')).toBeInTheDocument();
      await user.click(screen.getByRole('listitem', { name: /english/i }));

      expect(onLanguageChange).toHaveBeenCalledWith('en');
      expect(onRequestClose).toHaveBeenCalledTimes(1);
    });

    it('language trigger calls custom click handler without preventing default behavior', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();

      setupDefaultMocks();
      render(
        <BibleVersionPicker.Root versionId={111} onVersionPickerPress={vi.fn()}>
          <BibleVersionPickerLanguageTrigger onClick={onClick} />
        </BibleVersionPicker.Root>,
      );

      await user.click(screen.getByRole('button', { name: /select language/i }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('language trigger does not open default language view when click is prevented', async () => {
      const user = userEvent.setup();

      setupDefaultMocks();
      render(
        <BibleVersionPicker.Root versionId={111}>
          <BibleVersionPicker.Trigger />
          <BibleVersionPickerLanguageTrigger onClick={(event) => event.preventDefault()} />
          <BibleVersionPicker.Content />
        </BibleVersionPicker.Root>,
      );

      await user.click(screen.getByRole('button', { name: 'NIV' }));
      await user.click(screen.getAllByRole('button', { name: /select language/i })[0]!);

      expect(screen.queryByText('All Languages')).not.toBeInTheDocument();
    });

    it('bounds and animates the default language view inside the popover content', async () => {
      const user = userEvent.setup();

      setupDefaultMocks();
      renderPicker();

      await openPicker();
      await user.click(screen.getByRole('button', { name: /select language/i }));

      expect(screen.getByRole('heading', { name: /select language/i })).toBeInTheDocument();

      const dialog = screen.getByRole('dialog');
      const viewport = dialog.querySelector('.yv\\:relative.yv\\:min-h-0.yv\\:overflow-hidden');
      expect(viewport).not.toBeNull();

      const animatedPanels = dialog.querySelectorAll(
        '.yv\\:transition-all.yv\\:duration-300.yv\\:ease-out',
      );
      expect(animatedPanels).toHaveLength(2);

      const languagePanel = screen
        .getByRole('tab', { name: /suggested/i })
        .closest('.yv\\:h-full.yv\\:min-h-0.yv\\:overflow-hidden');
      expect(languagePanel).not.toBeNull();
    });

    it('open=false clears version search for pre-warmed standalone content', async () => {
      const user = userEvent.setup();

      setupDefaultMocks();
      const { rerender } = render(
        <BibleVersionPicker.Root versionId={111} onVersionPickerPress={vi.fn()}>
          <BibleVersionPicker.Content open />
        </BibleVersionPicker.Root>,
      );

      await user.type(screen.getByPlaceholderText('Search'), 'nlt');
      expect(screen.getByPlaceholderText('Search')).toHaveValue('nlt');

      rerender(
        <BibleVersionPicker.Root versionId={111} onVersionPickerPress={vi.fn()}>
          <BibleVersionPicker.Content open={false} />
        </BibleVersionPicker.Root>,
      );

      expect(screen.getByPlaceholderText('Search')).toHaveValue('');
    });
  });
});
