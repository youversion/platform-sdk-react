import type { Meta, StoryObj } from '@storybook/react-vite';
import { BibleVersionPicker, type RootProps } from './bible-version-picker';
import { useState } from 'react';
import { fireEvent, userEvent, within, expect, waitFor } from 'storybook/test';
import { http, HttpResponse, delay } from 'msw';
import { BookOpenIcon } from './icons/book-open';
import { Button } from './ui/button';
import { RECENT_VERSIONS_KEY } from './bible-version-picker';
import i18n from '@/i18n';
import { waitForElement, waitForShadowRoot } from '../test/storybook-dom';
import mockLanguages from '@/test/mock-data/languages.json';
import { globalHandlers } from '@/test/mocks/handlers';

async function getPickerQueries(container: ParentNode) {
  const root = await waitForShadowRoot(container);
  const content = await waitForElement<HTMLElement>(
    root,
    '[data-yv-shadow-content-wrapper]',
    'version picker content not rendered',
  );
  return { root, picker: within(content) };
}

async function openPicker(container: ParentNode, triggerName: RegExp = /NIV/i) {
  const { root, picker } = await getPickerQueries(container);
  const trigger = await picker.findByRole('button', { name: triggerName }, { timeout: 10_000 });
  await userEvent.click(trigger);
  const overlayElement = await waitForElement<HTMLElement>(
    root,
    '[data-yv-shadow-local-overlay]',
    'version picker overlay not rendered',
  );
  return { picker, overlay: within(overlayElement) };
}

type StoredRecentVersion = {
  id: number;
  title: string;
  localized_abbreviation: string;
};

function isStoredRecentVersion(item: StoredRecentVersion): item is StoredRecentVersion {
  return (
    Number.isFinite(item.id) &&
    Object.prototype.toString.call(item.title) === '[object String]' &&
    Object.prototype.toString.call(item.localized_abbreviation) === '[object String]'
  );
}

function getStoredRecentVersions(): StoredRecentVersion[] {
  const raw = localStorage.getItem(RECENT_VERSIONS_KEY);
  if (!raw) return [];
  try {
    // SAFETY: JSON.parse returns any. isStoredRecentVersion checks each field
    // before the list is used.
    const parsed = JSON.parse(raw) as StoredRecentVersion[];
    if (!Array.isArray(parsed) || !parsed.every(isStoredRecentVersion)) return [];
    return parsed;
  } catch {
    return [];
  }
}

const withLayout = (Story: React.ComponentType) => (
  <div data-yv-sdk className="yv:h-screen yv:flex yv:justify-center yv:items-end yv:p-12">
    <Story />
  </div>
);

type PickerWrapperProps = Omit<RootProps, 'versionId'> & { versionId?: number };

const PickerWrapper = ({ versionId: initialVersionId = 111, ...props }: PickerWrapperProps) => {
  const [versionId, setVersionId] = useState(initialVersionId);
  return (
    <BibleVersionPicker.Root versionId={versionId} onVersionChange={setVersionId} {...props}>
      <BibleVersionPicker.Trigger />
      <BibleVersionPicker.Content />
    </BibleVersionPicker.Root>
  );
};

const meta = {
  title: 'Components/BibleVersionPicker',
  component: PickerWrapper,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [withLayout],
  beforeEach: () => {
    localStorage.removeItem(RECENT_VERSIONS_KEY);
  },
  argTypes: {
    versionId: {
      control: 'number',
      description: 'The version ID to display',
    },
    background: {
      table: { disable: true },
    },
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
      description: 'Popover side position',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof PickerWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    versionId: 111,
    side: 'top',
  },
};

const tabletJourney: Story = {
  args: { versionId: 111 },
  parameters: {
    viewport: {
      options: {
        tabletPortrait: { name: 'Tablet portrait', styles: { width: '834px', height: '1194px' } },
        tabletLandscape: { name: 'Tablet landscape', styles: { width: '1180px', height: '820px' } },
        narrow: { name: 'Narrow', styles: { width: '375px', height: '812px' } },
        short: { name: 'Short', styles: { width: '820px', height: '400px' } },
      },
    },
    msw: {
      handlers: [
        http.get('*/v1/languages', ({ request }) =>
          HttpResponse.json(
            new URL(request.url).searchParams.has('country')
              ? {
                  data: mockLanguages.data.filter((language) => language.id === 'en'),
                  next_page_token: null,
                }
              : mockLanguages,
          ),
        ),
        http.get('*/v1/languages/es', () =>
          HttpResponse.json({
            id: 'es',
            language: 'es',
            display_names: { es: 'Español (América Latina)', en: 'Spanish' },
          }),
        ),
        ...globalHandlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const { picker, overlay } = await openPicker(canvasElement);
    const trigger = await picker.findByRole('button', { name: /NIV/i });
    const dialog = await overlay.findByRole('dialog');
    await waitFor(async () => {
      await expect(overlay.getByRole('button', { name: /^Language English 9$/ })).toBeVisible();
      const bounds = dialog.getBoundingClientRect();
      await expect(
        Math.abs(bounds.width - Math.min(400, window.innerWidth - 32)),
      ).toBeLessThanOrEqual(1);
      // Matches max-h: min(600px, 100svh - 32px, --radix-popover-content-available-height).
      const radixAvailable = Number.parseFloat(
        getComputedStyle(dialog).getPropertyValue('--radix-popover-content-available-height'),
      );
      const expectedHeight = Math.min(
        600,
        window.innerHeight - 32,
        Number.isFinite(radixAvailable) ? radixAvailable : 600,
      );
      await expect(Math.abs(bounds.height - expectedHeight)).toBeLessThanOrEqual(1);
      await expect(bounds.left).toBeGreaterThanOrEqual(15);
      await expect(bounds.right).toBeLessThanOrEqual(window.innerWidth - 15);
      await expect(bounds.top).toBeGreaterThanOrEqual(15);
      await expect(bounds.bottom).toBeLessThanOrEqual(window.innerHeight - 15);
      await expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth);
    });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(overlay.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(trigger);
    await userEvent.click(await overlay.findByRole('button', { name: /^Language\b/ }));
    await expect(overlay.getByRole('tab', { name: /suggested/i })).toHaveAttribute(
      'data-state',
      'active',
    );
    await expect(overlay.queryByRole('listitem', { name: /Spanish/ })).not.toBeInTheDocument();
    await userEvent.click(overlay.getByRole('button', { name: /search languages/i }));
    await userEvent.type(overlay.getByRole('textbox', { name: /search languages/i }), 'Spanish');
    const results = await overlay.findByTestId('language-search-results');
    await waitFor(() => expect(within(results).getAllByRole('listitem')).toHaveLength(1));
    await expect(within(results).getByRole('listitem', { name: /Spanish/ })).toBeVisible();
    await expect(
      within(results).queryByRole('listitem', { name: /English/ }),
    ).not.toBeInTheDocument();
    await userEvent.click(overlay.getByRole('button', { name: /^back$/i }));
    await expect(overlay.getByRole('tab', { name: /suggested/i })).toBeVisible();
    await userEvent.click(overlay.getByRole('button', { name: /back to bible versions/i }));
    await expect(overlay.getByRole('textbox', { name: /search bible versions/i })).toBeVisible();
    await userEvent.click(overlay.getByRole('button', { name: /^Language\b/ }));
    await userEvent.click(overlay.getByRole('tab', { name: /^All\b/ }));
    await userEvent.click(await overlay.findByRole('listitem', { name: /Spanish/ }));
    await waitFor(async () => {
      const openDialog = overlay.getByRole('dialog');
      const heading = within(overlay.getByTestId('version-list')).getByRole('heading');
      await expect(heading).toHaveTextContent('Español (América Latina)');
      const badge = within(heading).getByText('1').getBoundingClientRect();
      await expect(badge.right).toBeLessThanOrEqual(heading.getBoundingClientRect().right - 15);
      await expect(openDialog.scrollWidth).toBeLessThanOrEqual(openDialog.clientWidth);
    });
    await userEvent.click(overlay.getByRole('listitem', { name: /Reina-Valera 1960/i }));
    await waitFor(() => expect(overlay.queryByRole('dialog')).not.toBeInTheDocument());
    await expect(trigger).toHaveTextContent('RVR1960');
  },
};

export const TabletPortrait: Story = {
  ...tabletJourney,
  tags: ['integration'],
  globals: { viewport: { value: 'tabletPortrait', isRotated: false } },
};

export const TabletLandscape: Story = {
  ...tabletJourney,
  tags: ['integration'],
  globals: { viewport: { value: 'tabletLandscape', isRotated: false } },
};

export const NarrowLanguageHeading: Story = {
  ...tabletJourney,
  tags: ['integration'],
  globals: { viewport: { value: 'narrow', isRotated: false } },
};

export const ShortViewport: Story = {
  ...tabletJourney,
  tags: ['integration'],
  globals: { viewport: { value: 'short', isRotated: false } },
};

export const Loading: Story = {
  args: {
    versionId: 111,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/bibles', async () => {
          await delay('infinite');
          return new HttpResponse(null);
        }),
        http.get('*/v1/languages', async () => {
          await delay('infinite');
          return new HttpResponse(null);
        }),
        http.get('*/v1/bibles/:id', async () => {
          await delay('infinite');
          return new HttpResponse(null);
        }),
      ],
    },
  },
};

export const LightBackground: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
};

export const DarkBackground: Story = {
  args: {
    versionId: 111,
  },
  globals: {
    theme: 'dark',
  },
  tags: ['integration'],
};

export const WithCustomTrigger: Story = {
  args: {
    versionId: 111,
  },
  render: (args) => (
    <BibleVersionPicker.Root versionId={args.versionId ?? 111} side={args.side}>
      <BibleVersionPicker.Trigger>
        <Button size="icon">
          <BookOpenIcon className="yv:w-4 yv:h-4" />
        </Button>
      </BibleVersionPicker.Trigger>
      <BibleVersionPicker.Content />
    </BibleVersionPicker.Root>
  ),
};

export const InteractiveLanguageSelection: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const { overlay } = await openPicker(canvasElement);

    // Validate the dialog in the picker root's shadow-local overlay.
    const dialog = await overlay.findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    // Click language button
    const languageButton = await overlay.findByRole('button', { name: /^language /i });
    await waitFor(async () => {
      await expect(languageButton).toHaveTextContent('English');
    });
    await userEvent.click(languageButton);

    // Verify language list is visible
    const bibleLanguagesHeading = await overlay.findByRole('heading', {
      name: /bible languages/i,
    });
    await expect(bibleLanguagesHeading).toBeInTheDocument();

    // Select Korean
    const koreanOption = await overlay.findByRole('listitem', { name: /korean/i });
    await userEvent.click(koreanOption);

    // Wait for the language button to update with the selected language
    await waitFor(async () => {
      await expect(await overlay.findByRole('button', { name: /^language /i })).toHaveTextContent(
        /한국어/,
      );
    });
  },
};

export const SuggestedLanguagesTabs: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
  beforeEach: () => {
    // Save original navigator.languages and mock it for deterministic test behavior
    // This sets Korean first, then English as user's preferred languages
    const originalLanguages = navigator.languages;
    Object.defineProperty(navigator, 'languages', {
      value: ['ko-KR', 'en-US'],
      configurable: true,
    });

    // Return cleanup function to restore original value
    return () => {
      Object.defineProperty(navigator, 'languages', {
        value: originalLanguages,
        configurable: true,
      });
    };
  },
  play: async ({ canvasElement }) => {
    // The ko-KR stub above exists to drive the *suggested languages* list, but
    // YouVersionProvider also syncs the SDK's own UI language from
    // navigator.languages on mount — and we ship a Korean bundle. Pin the UI back
    // to English (after mount, so the provider effect has already run) so the
    // assertions below can match English labels.
    await i18n.changeLanguage('en');

    const { overlay } = await openPicker(canvasElement);

    // Validate the dialog is open
    const dialog = await overlay.findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    // Click language button to open language selection
    const languageButton = await overlay.findByRole('button', { name: /^language /i });
    await userEvent.click(languageButton);

    // Verify the Suggested tab is active by default and shows "Regional" heading
    const suggestedTab = await overlay.findByRole('tab', { name: /suggested/i });
    await waitFor(async () => {
      await expect(suggestedTab).toHaveAttribute('data-state', 'active');
    });

    const regionalHeading = await overlay.findByRole('heading', { name: /regional/i });
    await expect(regionalHeading).toBeInTheDocument();

    // Find the active tab panel (Suggested) to scope our language queries
    const suggestedTabPanel = await overlay.findByRole('tabpanel');

    // Verify user's browser languages appear at the top of suggested languages
    // We mocked navigator.languages to ['en-US', 'ko-KR'], so English should be first, Korean second
    const suggestedLanguageItems = within(suggestedTabPanel).getAllByRole('listitem');
    await expect(suggestedLanguageItems[1]).toHaveAttribute('aria-label', 'English');
    await expect(suggestedLanguageItems[0]?.getAttribute('aria-label')).toMatch(/Korean$/);

    // Verify the All tab exists with language count
    const allTab = await overlay.findByRole('tab', { name: /all/i });
    await expect(allTab).toBeInTheDocument();

    // Switch to All tab
    await userEvent.click(allTab);
    await expect(allTab).toHaveAttribute('data-state', 'active');
    await expect(suggestedTab).toHaveAttribute('data-state', 'inactive');

    // Verify All Languages heading is shown
    const allLanguagesHeading = await overlay.findByRole('heading', { name: /all languages/i });
    await expect(allLanguagesHeading).toBeInTheDocument();

    // Find the active tab panel (All) to scope our language queries
    const allTabPanel = await overlay.findByRole('tabpanel');

    // Verify languages in All tab are sorted alphabetically by display name
    // English comes before Korean alphabetically
    const allLanguageItems = within(allTabPanel).getAllByRole('listitem');
    const languageLabels = allLanguageItems.map((item) => item.getAttribute('aria-label'));
    const englishIndex = languageLabels.indexOf('English');
    const koreanIndex = languageLabels.findIndex((label) => label?.endsWith('Korean'));
    await expect(englishIndex).toBeLessThan(koreanIndex);

    // Switch back to Suggested tab and select a language
    await userEvent.click(suggestedTab);
    await expect(suggestedTab).toHaveAttribute('data-state', 'active');

    // Find the active tab panel again after switching tabs
    const suggestedTabPanelAgain = await overlay.findByRole('tabpanel');
    const englishOption = await within(suggestedTabPanelAgain).findByRole('listitem', {
      name: /english/i,
    });
    await userEvent.click(englishOption);

    // Verify the language button shows the selected language
    await waitFor(async () => {
      await expect(await overlay.findByRole('button', { name: /^language /i })).toHaveTextContent(
        /english/i,
      );
    });
  },
};

export const SuggestedLanguagesOrder: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
  beforeEach: () => {
    const originalLanguages = navigator.languages;
    Object.defineProperty(navigator, 'languages', {
      value: ['en-US'],
      configurable: true,
    });

    return () => {
      Object.defineProperty(navigator, 'languages', {
        value: originalLanguages,
        configurable: true,
      });
    };
  },
  play: async ({ canvasElement }) => {
    const { overlay } = await openPicker(canvasElement);

    // Open language selection
    const languageButton = await overlay.findByRole('button', { name: /^language /i });
    await userEvent.click(languageButton);

    // Verify suggested languages appear in API order (not alphabetical or by population)
    const suggestedTabPanel = await overlay.findByRole('tabpanel');
    await waitFor(async () => {
      const labels = within(suggestedTabPanel)
        .getAllByRole('listitem')
        .map((item) => item.getAttribute('aria-label'));
      await expect(labels[0]).toBe('English');
      await expect(labels[1]).toMatch(/Spanish$/);
      await expect(labels[2]).toMatch(/Portuguese/);
      await expect(labels[3]).toMatch(/French$/);
    });
  },
};

export const LanguageSearch: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const { overlay } = await openPicker(canvasElement);

    const languageButton = await overlay.findByRole('button', { name: /^language /i });
    await userEvent.click(languageButton);
    await userEvent.click(await overlay.findByRole('button', { name: /search languages/i }));

    const languageSearchInput = overlay.getByRole('textbox', { name: /search languages/i });
    await userEvent.type(languageSearchInput, 'Korean', { delay: 50 });

    await waitFor(async () => {
      await expect(overlay.queryByRole('tab', { name: /suggested/i })).not.toBeInTheDocument();
      await expect(overlay.queryByRole('tab', { name: /all/i })).not.toBeInTheDocument();
    });

    const results = await overlay.findByTestId('language-search-results');
    await expect(within(results).getAllByRole('listitem')).toHaveLength(1);
    await expect(within(results).getByRole('listitem', { name: /korean/i })).toBeInTheDocument();

    const currentLanguageSearchInput = overlay.getByRole('textbox', {
      name: /search languages/i,
    });
    // user-event cannot clear an input in a shadow root: it checks
    // document.activeElement, which is the shadow host.
    await fireEvent.input(currentLanguageSearchInput, { target: { value: '' } });
    await userEvent.type(currentLanguageSearchInput, 'Koreanea', { delay: 50 });

    await expect(
      overlay.getByText("We're sorry, there are no results for this search."),
    ).toBeInTheDocument();
  },
};

export const InteractiveVersionSearch: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const { overlay } = await openPicker(canvasElement, /select|111|1/i);

    // Type in search
    const searchInput = overlay.getByRole('textbox', { name: /search bible versions/i });
    await userEvent.type(searchInput, 'NIV', { delay: 50 });

    // Verify search is working (versions should be filtered)
    await expect(searchInput).toHaveValue('NIV');

    await expect(
      await overlay.findByRole(
        'listitem',
        { name: /new international version 2011/i },
        { timeout: 5_000 },
      ),
    ).toBeInTheDocument();
  },
};

export const RealAPI: Story = {
  args: {
    versionId: 111,
  },
  parameters: {
    msw: {
      handlers: null,
    },
  },
};

export const RecentVersionsSelection: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const { picker, overlay } = await openPicker(canvasElement);

    // Verify initially there's no recent versions section
    const dialog = await overlay.findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(
      overlay.queryByRole('heading', { name: i18n.t('recentlyUsedVersionsHeading') }),
    ).not.toBeInTheDocument();

    // Select a different version (Amplified Bible)
    const ampOption = await overlay.findByRole('listitem', { name: /Amplified Bible/i });
    await userEvent.click(ampOption);

    // Reopen the popover and verify the recent versions section now appears
    const updatedTrigger = await picker.findByRole('button', { name: /AMP/i });
    await expect(updatedTrigger).toBeInTheDocument();
    await userEvent.click(updatedTrigger);

    await expect(
      await overlay.findByRole('heading', { name: i18n.t('recentlyUsedVersionsHeading') }),
    ).toBeInTheDocument();
    const recentVersionList = await overlay.findByTestId('recent-version-list');
    await expect(within(recentVersionList).getByText(/Amplified Bible/i)).toBeInTheDocument();

    // Verify localStorage was updated
    let storedVersions = getStoredRecentVersions();
    await expect(storedVersions.length).toBe(1);
    await expect(storedVersions[0]?.title).toContain('Amplified');

    // Now select NIV from the main list
    const nivOption = await overlay.findByRole('listitem', {
      name: /New International Version 2011/i,
    });
    await userEvent.click(nivOption);

    // Reopen and select AMP from recent versions
    const nivTrigger = await picker.findByRole('button', { name: /NIV/i });
    await expect(nivTrigger).toBeInTheDocument();
    await userEvent.click(nivTrigger);

    const recentList = await overlay.findByTestId('recent-version-list');
    const ampRecentOption = within(recentList).getByRole('listitem', {
      name: /Amplified Bible/i,
    });
    await userEvent.click(ampRecentOption);

    // Verify AMP is selected and moved to top of recent versions
    const ampTrigger = await picker.findByRole('button', { name: /AMP/i });
    await expect(ampTrigger).toBeInTheDocument();

    storedVersions = getStoredRecentVersions();
    await expect(storedVersions[0]?.localized_abbreviation).toBe('AMP');
  },
};

export const SearchResetsAfterSelection: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const { picker, overlay } = await openPicker(canvasElement);

    // Type in search
    const searchInput = overlay.getByRole('textbox', { name: /search bible versions/i });
    await userEvent.type(searchInput, 'Amplified', { delay: 50 });
    await expect(searchInput).toHaveValue('Amplified');

    // Select a version from the filtered results
    const ampOption = await overlay.findByRole('listitem', { name: /Amplified Bible/i });
    await userEvent.click(ampOption);

    // Reopen the popover
    const updatedTrigger = await picker.findByRole('button', { name: /AMP/i });
    await userEvent.click(updatedTrigger);

    // Verify search input is cleared
    const resetSearchInput = overlay.getByRole('textbox', { name: /search bible versions/i });
    await expect(resetSearchInput).toHaveValue('');
  },
};

export const RecentVersionsSearchFilter: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
  beforeEach: () => {
    // Pre-populate localStorage with recent versions before component mounts
    localStorage.setItem(
      RECENT_VERSIONS_KEY,
      JSON.stringify([
        { id: 1588, title: 'Amplified Bible', localized_abbreviation: 'AMP' },
        { id: 12, title: 'American Standard Version', localized_abbreviation: 'ASV' },
      ]),
    );
  },
  play: async ({ canvasElement }) => {
    const { overlay } = await openPicker(canvasElement);

    // Verify recent versions are displayed
    await expect(
      await overlay.findByRole('heading', { name: i18n.t('recentlyUsedVersionsHeading') }),
    ).toBeInTheDocument();
    const recentVersionList = await overlay.findByTestId('recent-version-list');
    await expect(within(recentVersionList).getByText(/Amplified Bible/i)).toBeInTheDocument();
    await expect(
      within(recentVersionList).getByText(/American Standard Version/i),
    ).toBeInTheDocument();

    // Search for "ASV"
    const searchInput = overlay.getByRole('textbox', { name: /search bible versions/i });
    await userEvent.type(searchInput, 'ASV', { delay: 50 });

    // Verify only ASV appears in recent versions after filtering
    await waitFor(async () => {
      const filteredRecentList = await overlay.findByTestId('recent-version-list');
      await expect(
        within(filteredRecentList).queryByText(/Amplified Bible/i),
      ).not.toBeInTheDocument();
    });
    await expect(
      within(await overlay.findByTestId('recent-version-list')).getByText(
        /American Standard Version/i,
      ),
    ).toBeInTheDocument();
  },
};

export const RecentVersionsMaxLimit: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
  beforeEach: () => {
    // Pre-populate localStorage with 3 recent versions (max limit) before component mounts
    localStorage.setItem(
      RECENT_VERSIONS_KEY,
      JSON.stringify([
        { id: 1588, title: 'Amplified Bible', localized_abbreviation: 'AMP' },
        { id: 100, title: 'New American Standard Bible 1995', localized_abbreviation: 'NASB1995' },
        { id: 12, title: 'American Standard Version', localized_abbreviation: 'ASV' },
      ]),
    );
  },
  play: async ({ canvasElement }) => {
    const { overlay } = await openPicker(canvasElement);

    // Select a new version (NASB2020) - this should push out ASV
    const nasbOption = await overlay.findByRole('listitem', {
      name: /New American Standard Bible 2020/i,
    });
    await userEvent.click(nasbOption);

    // Verify localStorage was updated with max 3 versions, NASB2020 at the top
    const storedVersions = getStoredRecentVersions();
    await expect(storedVersions.length).toBe(3);
    await expect(storedVersions[0]?.title).toContain('New American Standard Bible 2020');
    await expect(storedVersions.map((v) => v.localized_abbreviation)).not.toContain('ASV');
  },
};
