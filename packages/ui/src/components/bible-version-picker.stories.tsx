import type { Meta, StoryObj } from '@storybook/react-vite';
import { BibleVersionPicker, type RootProps } from './bible-version-picker';
import { useState } from 'react';
import { screen, userEvent, within, expect, waitFor } from 'storybook/test';
import { BookOpen } from 'lucide-react';
import { Button } from './ui/button';
import { RECENT_VERSIONS_KEY } from './bible-version-picker';

type StoredRecentVersion = {
  id: number;
  title: string;
  localized_abbreviation: string;
};

function getStoredRecentVersions(): StoredRecentVersion[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_VERSIONS_KEY) || '[]') as StoredRecentVersion[];
  } catch {
    return [];
  }
}

const withLayout = (Story: React.ComponentType) => (
  <div className="yv:h-screen yv:flex yv:justify-center yv:items-end yv:p-12">
    <Story />
  </div>
);

const PickerWrapper = ({ versionId: initialVersionId = 111, ...props }: RootProps) => {
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
      control: 'select',
      options: [undefined, 'light', 'dark'],
      description: 'Background theme for the picker',
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
    background: 'light',
    side: 'top',
  },
};

export const LightBackground: Story = {
  args: {
    versionId: 111,
    background: 'light',
  },
  tags: ['integration'],
};

export const DarkBackground: Story = {
  args: {
    versionId: 111,
    background: 'dark',
  },
  tags: ['integration'],
};

export const WithCustomTrigger: Story = {
  args: {
    versionId: 111,
    background: 'light',
  },
  render: (args) => (
    <BibleVersionPicker.Root
      versionId={args.versionId}
      background={args.background}
      side={args.side}
    >
      <BibleVersionPicker.Trigger>
        <Button size="icon">
          <BookOpen className="yv:w-4 yv:h-4" />
        </Button>
      </BibleVersionPicker.Trigger>
      <BibleVersionPicker.Content />
    </BibleVersionPicker.Root>
  ),
};

export const InteractiveLanguageSelection: Story = {
  args: {
    versionId: 111,
    background: 'light',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open popover
    const trigger = await canvas.findByRole('button', { name: /NIV/i }, { timeout: 10_000 });
    await userEvent.click(trigger);

    // Validate the dialog is open
    // P.S. I use screen here because the Popover uses a Portal that moves
    // the element out of the original canvas element.
    const dialog = await screen.findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    // Click language button
    const languageButton = await screen.findByRole('button', { name: /select language/i });
    await expect(languageButton).toHaveTextContent('English');
    await userEvent.click(languageButton);

    // Verify language list is visible
    const selectLanguageHeading = await screen.findByRole('heading', { name: /select language/i });
    await expect(selectLanguageHeading).toBeInTheDocument();

    // Select Korean
    const koreanOption = await screen.findByRole('listitem', { name: /korean/i });
    await userEvent.click(koreanOption);

    await expect(await screen.findByRole('button', { name: /select language/i })).toHaveTextContent(
      /korean/i,
    );
    await userEvent.click(languageButton);
  },
};

export const InteractiveVersionSearch: Story = {
  args: {
    versionId: 111,
    background: 'light',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Open popover
    const trigger = canvas.getByRole('button', { name: /select|111|1/i });
    await userEvent.click(trigger);

    // Type in search
    const searchInput = screen.getByPlaceholderText('Search');
    await userEvent.type(searchInput, 'NIV', { delay: 50 });

    // Verify search is working (versions should be filtered)
    await expect(searchInput).toHaveValue('NIV');

    await expect(
      await screen.findByRole(
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
    background: 'light',
  },
  tags: ['integration'],
  play: async () => {
    // Open popover
    const trigger = await screen.findByRole('button', { name: /NIV/i }, { timeout: 10_000 });
    await userEvent.click(trigger);

    // Verify initially there's no recent versions section
    const dialog = await screen.findByRole('dialog');
    await expect(dialog).toBeInTheDocument();
    await expect(screen.queryByText('Recently Used Versions')).not.toBeInTheDocument();

    // Select a different version (Amplified Bible)
    const ampOption = await screen.findByRole('listitem', { name: /Amplified Bible/i });
    await userEvent.click(ampOption);

    // Reopen the popover and verify the recent versions section now appears
    const updatedTrigger = await screen.findByRole('button', { name: /AMP/i });
    await expect(updatedTrigger).toBeInTheDocument();
    await userEvent.click(updatedTrigger);

    await expect(await screen.findByText('Recently Used Versions')).toBeInTheDocument();
    const recentVersionList = await screen.findByTestId('recent-version-list');
    await expect(within(recentVersionList).getByText(/Amplified Bible/i)).toBeInTheDocument();

    // Verify localStorage was updated
    let storedVersions = getStoredRecentVersions();
    await expect(storedVersions.length).toBe(1);
    await expect(storedVersions[0]?.title).toContain('Amplified');

    // Now select NIV from the main list
    const nivOption = await screen.findByRole('listitem', {
      name: /New International Version 2011/i,
    });
    await userEvent.click(nivOption);

    // Reopen and select AMP from recent versions
    const nivTrigger = await screen.findByRole('button', { name: /NIV/i });
    await expect(nivTrigger).toBeInTheDocument();
    await userEvent.click(nivTrigger);

    const recentList = await screen.findByTestId('recent-version-list');
    const ampRecentOption = within(recentList).getByRole('listitem', {
      name: /Amplified Bible/i,
    });
    await userEvent.click(ampRecentOption);

    // Verify AMP is selected and moved to top of recent versions
    const ampTrigger = await screen.findByRole('button', { name: /AMP/i });
    await expect(ampTrigger).toBeInTheDocument();

    storedVersions = getStoredRecentVersions();
    await expect(storedVersions[0]?.localized_abbreviation).toBe('AMP');
  },
};

export const RecentVersionsSearchFilter: Story = {
  args: {
    versionId: 111,
    background: 'light',
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
  play: async () => {
    // Open popover
    const trigger = await screen.findByRole('button', { name: /NIV/i }, { timeout: 10_000 });
    await userEvent.click(trigger);

    // Verify recent versions are displayed
    await expect(await screen.findByText('Recently Used Versions')).toBeInTheDocument();
    const recentVersionList = await screen.findByTestId('recent-version-list');
    await expect(within(recentVersionList).getByText(/Amplified Bible/i)).toBeInTheDocument();
    await expect(
      within(recentVersionList).getByText(/American Standard Version/i),
    ).toBeInTheDocument();

    // Search for "ASV"
    const searchInput = screen.getByPlaceholderText('Search');
    await userEvent.type(searchInput, 'ASV', { delay: 50 });

    // Verify only ASV appears in recent versions after filtering
    await waitFor(async () => {
      await expect(screen.queryByText(/Amplified Bible/i)).not.toBeInTheDocument();
    });
    await expect(
      within(await screen.findByTestId('recent-version-list')).getByText(
        /American Standard Version/i,
      ),
    ).toBeInTheDocument();
  },
};

export const RecentVersionsMaxLimit: Story = {
  args: {
    versionId: 111,
    background: 'light',
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
  play: async () => {
    // Open popover
    const trigger = await screen.findByRole('button', { name: /NIV/i }, { timeout: 10_000 });
    await userEvent.click(trigger);

    // Select a new version (NASB2020) - this should push out ASV
    const nasbOption = await screen.findByRole('listitem', {
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
