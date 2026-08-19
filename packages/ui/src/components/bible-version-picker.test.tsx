/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';

// ResizeObserver is used by VersionAbbreviationIcon and @floating-ui/dom (Radix Popover)
import { installResizeObserverStub } from '@/test/dom-stubs';

installResizeObserverStub();

import {
  BibleLanguagePickerContent,
  BibleVersionPicker,
  BibleVersionPickerLanguageTrigger,
  RECENT_VERSIONS_KEY,
} from './bible-version-picker';
import type { HookOverrides } from '@youversion/platform-react-hooks';
import type {
  BibleVersion,
  GetLanguagesOptions,
  Language,
  Organization,
} from '@youversion/platform-core';
import { HookOverrideProvider } from '@/test/hook-overrides';

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
    organization_id: '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff',
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

const mockOrganization: Organization = {
  id: '05a9aa40-37b6-4e34-b9f1-a443fa4b1fff',
  name: 'Biblica',
};

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
  {
    id: 'ko',
    language: 'Korean',
    display_names: { en: 'Korean', ko: '한국어' },
    speaking_population: 80000000,
  },
];

type OverrideSetup = {
  versionsLoading?: boolean;
  languagesLoading?: boolean;
  versionsLanguageInfoLoading?: boolean;
  filteredVersions?: BibleVersion[];
};

function defaultOverrides({
  versionsLoading = false,
  languagesLoading = false,
  versionsLanguageInfoLoading = false,
  filteredVersions = mockVersions,
}: OverrideSetup = {}): HookOverrides {
  return {
    useVersions: (languageId) => {
      if (languageId === '*') {
        return {
          versions: versionsLanguageInfoLoading
            ? null
            : {
                data: mockLanguages.map((language, index) => ({
                  ...mockVersions[0]!,
                  id: language.id === 'en' ? 111 : language.id === 'es' ? 222 : 333,
                  language_tag: language.id,
                  localized_abbreviation: language.id,
                  abbreviation: language.id,
                  title: language.language,
                  localized_title: language.language,
                  youversion_deep_link: `https://bible.com/versions/${index}`,
                })),
                next_page_token: null,
              },
          loading: versionsLanguageInfoLoading,
          error: null,
          refetch: () => undefined,
        };
      }

      return {
        versions: versionsLoading ? null : { data: mockVersions, next_page_token: null },
        loading: versionsLoading,
        error: null,
        refetch: () => undefined,
      };
    },
    useVersion: () => ({
      version: mockVersions[0]!,
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
    useLanguages: (params?: GetLanguagesOptions) => ({
      languages: languagesLoading
        ? null
        : {
            data: params && 'country' in params ? [mockLanguages[0]!] : mockLanguages,
            next_page_token: null,
          },
      loading: languagesLoading,
      error: null,
      refetch: () => undefined,
    }),
    useLanguage: () => ({
      language: mockLanguages[0]!,
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
    useFilteredVersions: () => filteredVersions,
    useOrganizations: () => ({
      organizations: new Map([[mockOrganization.id, mockOrganization]]),
    }),
  };
}

function renderWithOverrides(ui: ReactElement, setup?: OverrideSetup) {
  return render(ui, {
    wrapper: ({ children }) => (
      <HookOverrideProvider overrides={defaultOverrides(setup)}>{children}</HookOverrideProvider>
    ),
  });
}

function renderPicker(setup?: OverrideSetup) {
  return renderWithOverrides(
    <BibleVersionPicker.Root versionId={111} onVersionChange={vi.fn()}>
      <BibleVersionPicker.Trigger>
        <button type="button">Open</button>
      </BibleVersionPicker.Trigger>
      <BibleVersionPicker.Content />
    </BibleVersionPicker.Root>,
    setup,
  );
}

async function openPicker() {
  const trigger = screen.getByRole('button', { name: /open/i });
  await userEvent.click(trigger);
}

async function openLanguagePanel() {
  await openPicker();
  await userEvent.click(screen.getByRole('button', { name: /select language/i }));
}

function getLanguageSearchInput() {
  return screen.getByRole('textbox', { name: /search languages/i });
}

function getVersionSearchInput() {
  return screen.getByRole('textbox', { name: /search bible versions/i });
}

describe('BibleVersionPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  describe('loading state', () => {
    it('should show spinner in version list when versions are loading', async () => {
      renderPicker({ versionsLoading: true, filteredVersions: [] });
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

      renderPicker({ versionsLoading: true, filteredVersions: [] });
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
      renderPicker({ versionsLoading: true, filteredVersions: [] });
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
      renderPicker({ versionsLoading: false, filteredVersions: [] });
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
      renderPicker({ versionsLoading: false, filteredVersions: mockVersions });
      await openPicker();

      await waitFor(() => {
        const languageButton = screen.getByRole('button', { name: /select language/i });
        const badge = languageButton.querySelector('[data-slot="badge"]');
        expect(badge).not.toBeNull();
        expect(badge!.textContent).toBe('2');
      });
    });

    it('should render version items when loaded', async () => {
      renderPicker({ versionsLoading: false, filteredVersions: mockVersions });
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

  describe('abbreviation tile', () => {
    it('renders the abbreviation tile with the Figma media styling', async () => {
      renderPicker({ versionsLoading: false, filteredVersions: mockVersions });
      await openPicker();

      const row = await screen.findByRole('listitem', { name: /new international version/i });
      const media = row.querySelector('[data-slot="item-media"]');
      expect(media).not.toBeNull();
      // tile: 64px square, 8px radius, warm-neutral fill, themed border
      expect(media!.className).toContain('yv:size-16');
      expect(media!.className).toContain('yv:rounded-[8px]');
      expect(media!.className).toContain('yv:bg-secondary');
      expect(media!.className).toContain('yv:border-border');
      expect(media!.textContent).toContain('NIV');
    });

    it('splits a trailing-digit abbreviation onto a second line', async () => {
      renderPicker({
        versionsLoading: false,
        filteredVersions: [
          {
            ...mockVersions[0]!,
            id: 1995,
            title: 'New American Standard Bible',
            localized_abbreviation: 'NASB1995',
            abbreviation: 'NASB1995',
          },
        ],
      });
      await openPicker();

      const row = await screen.findByRole('listitem', { name: /new american standard bible/i });
      const media = row.querySelector('[data-slot="item-media"]');
      expect(media).not.toBeNull();
      // prefix + digits render as separate lines, not the raw concatenation
      const lines = Array.from(media!.querySelectorAll('div > div')).map((n) => n.textContent);
      expect(lines).toContain('NASB');
      expect(lines).toContain('1995');
    });

    it('renders the publisher name above the version title when available', async () => {
      renderPicker({ versionsLoading: false, filteredVersions: mockVersions });
      await openPicker();

      const row = await screen.findByRole('listitem', { name: /new international version/i });
      const description = row.querySelector('[data-slot="item-description"]');
      expect(description).not.toBeNull();
      expect(description!.textContent).toBe('Biblica');
    });

    it('omits the publisher name when the version has no organization', async () => {
      renderPicker({ versionsLoading: false, filteredVersions: mockVersions });
      await openPicker();

      const row = await screen.findByRole('listitem', { name: /new living translation/i });
      const description = row.querySelector('[data-slot="item-description"]');
      expect(description).toBeNull();
    });

    it('still lists recent versions saved without an abbreviation field', async () => {
      vi.spyOn(window.localStorage, 'getItem').mockImplementation((key) =>
        key === RECENT_VERSIONS_KEY
          ? JSON.stringify([
              {
                id: 1588,
                title: 'Amplified Bible',
                localized_abbreviation: 'AMP',
              },
            ])
          : null,
      );

      renderPicker({ versionsLoading: false, filteredVersions: mockVersions });
      await openPicker();

      const recentList = await screen.findByTestId('recent-version-list');
      expect(within(recentList).getByText(/Amplified Bible/i)).toBeTruthy();
    });

    it('applies the same tile styling to recent-version rows', async () => {
      vi.spyOn(window.localStorage, 'getItem').mockImplementation((key) =>
        key === RECENT_VERSIONS_KEY
          ? JSON.stringify([
              {
                id: 111,
                title: 'New International Version',
                localized_abbreviation: 'NIV',
                abbreviation: 'NIV',
              },
            ])
          : null,
      );

      renderPicker({ versionsLoading: false, filteredVersions: mockVersions });
      await openPicker();

      const recentList = await screen.findByTestId('recent-version-list');
      const media = recentList.querySelector('[data-slot="item-media"]');
      expect(media).not.toBeNull();
      expect(media!.className).toContain('yv:size-16');
      expect(media!.className).toContain('yv:bg-secondary');
      expect(media!.className).toContain('yv:rounded-[8px]');
    });
  });

  describe('recent versions storage', () => {
    it('falls back to [] when localStorage contains [null]', async () => {
      vi.spyOn(window.localStorage, 'getItem').mockImplementation((key) =>
        key === RECENT_VERSIONS_KEY ? '[null]' : null,
      );

      expect(() => renderPicker()).not.toThrow();
      await openPicker();

      expect(screen.queryByTestId('recent-version-list')).not.toBeInTheDocument();
    });

    it('falls back to en when navigator exists but languages is missing', async () => {
      const user = userEvent.setup();
      const languagesDescriptor = Object.getOwnPropertyDescriptor(
        globalThis.navigator,
        'languages',
      );
      Object.defineProperty(globalThis.navigator, 'languages', {
        value: undefined,
        configurable: true,
      });

      try {
        const onVersionPickerPress = vi.fn();
        renderWithOverrides(
          <BibleVersionPicker.Root versionId={111} onVersionPickerPress={onVersionPickerPress}>
            <BibleVersionPicker.Trigger />
          </BibleVersionPicker.Root>,
        );

        await user.click(screen.getByRole('button'));

        expect(onVersionPickerPress).toHaveBeenCalledWith({
          versionId: 111,
          languageId: 'en',
        });
      } finally {
        if (languagesDescriptor) {
          Object.defineProperty(globalThis.navigator, 'languages', languagesDescriptor);
        }
      }
    });
  });

  describe('onVersionPickerPress override', () => {
    it('calls onVersionPickerPress with { versionId, languageId } when Trigger is clicked', async () => {
      const user = userEvent.setup();
      const onVersionPickerPress = vi.fn();

      renderWithOverrides(
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
      renderWithOverrides(
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

      renderWithOverrides(
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

      renderWithOverrides(
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

      renderWithOverrides(
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

      renderWithOverrides(
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

      renderWithOverrides(
        <BibleVersionPicker.Root versionId={111} onVersionPickerPress={vi.fn()}>
          <BibleVersionPickerLanguageTrigger onClick={onClick} />
        </BibleVersionPicker.Root>,
      );

      await user.click(screen.getByRole('button', { name: /select language/i }));

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('language trigger does not open default language view when click is prevented', async () => {
      const user = userEvent.setup();

      renderWithOverrides(
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

      const { rerender } = renderWithOverrides(
        <BibleVersionPicker.Root versionId={111} onVersionPickerPress={vi.fn()}>
          <BibleVersionPicker.Content open />
        </BibleVersionPicker.Root>,
      );

      await user.type(getVersionSearchInput(), 'nlt');
      expect(getVersionSearchInput()).toHaveValue('nlt');

      rerender(
        <BibleVersionPicker.Root versionId={111} onVersionPickerPress={vi.fn()}>
          <BibleVersionPicker.Content open={false} />
        </BibleVersionPicker.Root>,
      );

      expect(getVersionSearchInput()).toHaveValue('');
    });

    it('open=false clears language search for pre-warmed standalone content', async () => {
      const user = userEvent.setup();

      const rootProps = { versionId: 111, onVersionPickerPress: vi.fn() };
      const { rerender } = renderWithOverrides(
        <BibleVersionPicker.Root {...rootProps}>
          <BibleLanguagePickerContent open />
        </BibleVersionPicker.Root>,
      );

      await user.type(getLanguageSearchInput(), 'span');
      expect(getLanguageSearchInput()).toHaveValue('span');
      expect(screen.queryByRole('tab', { name: /suggested/i })).not.toBeInTheDocument();

      rerender(
        <BibleVersionPicker.Root {...rootProps}>
          <BibleLanguagePickerContent open={false} />
        </BibleVersionPicker.Root>,
      );

      expect(getLanguageSearchInput()).toHaveValue('');

      rerender(
        <BibleVersionPicker.Root {...rootProps}>
          <BibleLanguagePickerContent open />
        </BibleVersionPicker.Root>,
      );

      expect(screen.getByRole('tab', { name: /suggested/i })).toBeInTheDocument();
    });
  });

  describe('language search', () => {
    it('filters languages globally when searching', async () => {
      const user = userEvent.setup();

      renderPicker();
      await openLanguagePanel();

      await user.type(getLanguageSearchInput(), 'span');

      expect(screen.queryByRole('tab', { name: /suggested/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: /all/i })).not.toBeInTheDocument();

      const results = screen.getByTestId('language-search-results');
      expect(within(results).getAllByRole('listitem')).toHaveLength(1);
      expect(within(results).getByRole('listitem', { name: /spanish/i })).toBeInTheDocument();
    });

    it('shows empty state when no languages match the search', async () => {
      const user = userEvent.setup();

      renderPicker();
      await openLanguagePanel();

      await user.type(getLanguageSearchInput(), 'Koreanea');

      expect(
        screen.getByText("We're sorry, there are no results for this search."),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('language-search-results')).not.toBeInTheDocument();
    });

    it('shows loading state instead of empty results while languages are loading', async () => {
      const user = userEvent.setup();

      renderPicker({ languagesLoading: true });
      await openLanguagePanel();

      await user.type(getLanguageSearchInput(), 'span');

      expect(
        screen.queryByText("We're sorry, there are no results for this search."),
      ).not.toBeInTheDocument();
      expect(
        screen
          .getByRole('textbox', { name: /search languages/i })
          .closest('[data-yv-sdk]')
          ?.querySelector('.yv\\:animate-spin'),
      ).toBeInTheDocument();
    });

    it('clears language search when navigating back to bible versions', async () => {
      const user = userEvent.setup();

      renderPicker();
      await openLanguagePanel();

      await user.type(getLanguageSearchInput(), 'korean');
      expect(getLanguageSearchInput()).toHaveValue('korean');

      await user.click(screen.getByRole('button', { name: /back to bible versions/i }));
      await user.click(screen.getByRole('button', { name: /select language/i }));

      expect(getLanguageSearchInput()).toHaveValue('');
    });

    it('preserves the selected tab after clearing language search', async () => {
      const user = userEvent.setup();

      renderPicker();
      await openLanguagePanel();

      await user.click(screen.getByRole('tab', { name: /all/i }));
      await user.type(getLanguageSearchInput(), 'span');
      await user.clear(getLanguageSearchInput());

      expect(screen.getByRole('tab', { name: /all/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('calls onLanguageChange and clears search after selecting a filtered language', async () => {
      const user = userEvent.setup();
      const onLanguageChange = vi.fn();

      renderWithOverrides(
        <BibleVersionPicker.Root versionId={111} onLanguageChange={onLanguageChange}>
          <BibleVersionPicker.Trigger>
            <button type="button">Open</button>
          </BibleVersionPicker.Trigger>
          <BibleVersionPicker.Content />
        </BibleVersionPicker.Root>,
      );

      await openLanguagePanel();
      await user.type(getLanguageSearchInput(), 'korean');
      await user.click(screen.getByRole('listitem', { name: /korean/i }));

      expect(onLanguageChange).toHaveBeenCalledWith('ko');
      expect(screen.getByRole('heading', { name: /bible versions/i })).toBeInTheDocument();
    });
  });
});
