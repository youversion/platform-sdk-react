import type { Meta, StoryObj } from '@storybook/react-vite';
import { YouVersionProvider } from '@youversion/platform-react-hooks';
import { BibleVersionPicker, type RootProps } from './bible-version-picker';
import { useState } from 'react';
import { screen, userEvent, within, expect } from 'storybook/test';
import { BookOpen } from 'lucide-react';
import { Button } from './ui/button';

const withProvider = (Story: React.ComponentType) => (
  <YouVersionProvider
    appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY}
    apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
  >
    <div className="yv:h-screen yv:flex yv:justify-center yv:items-end yv:p-12">
      <Story />
    </div>
  </YouVersionProvider>
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
  decorators: [withProvider],
  argTypes: {
    versionId: {
      control: 'number',
      description: 'The version ID to display',
    },
    background: {
      control: 'select',
      options: ['light', 'dark'],
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

    await expect(languageButton).toHaveTextContent(/korean/i);
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
