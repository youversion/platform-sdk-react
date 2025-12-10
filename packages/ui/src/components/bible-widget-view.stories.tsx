import type { Meta, StoryObj } from '@storybook/react-vite';
import { YouVersionProvider } from '@youversion/platform-react-hooks';
import { within, expect, userEvent, screen } from 'storybook/test';
import { BibleWidgetView } from './bible-widget-view';
import { waitFor } from '@testing-library/react';

const meta = {
  title: 'Components/BibleWidgetView',
  component: BibleWidgetView,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story: React.ComponentType): React.ReactElement => (
      <YouVersionProvider
        appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY}
        apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
      >
        <Story />
      </YouVersionProvider>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    reference: {
      control: 'text',
      description: 'USFM reference (e.g., "JHN.3.16", "JHN.3.16-17", "JHN.3")',
    },
    versionId: {
      control: 'number',
      description: 'Bible version ID (e.g., 206 for NLT)',
    },
    showVersionPicker: {
      control: 'boolean',
      description: 'toggle version picker',
    },
  },
} satisfies Meta<typeof BibleWidgetView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
  },
};
export const DarkMode: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    background: 'dark',
  },
};

export const WithVersionPicker: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    showVersionPicker: true,
    background: 'dark',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for loading to finish
    await canvas.findByRole('button', { name: /change bible version/i });
    await waitFor(async () => {
      await expect(
        canvas.getByRole('button', { name: /change bible version/i }),
      ).not.toHaveTextContent('Loading...');
    });

    // Click the version picker button
    const versionPickerButton = canvas.getByRole('button', { name: /change bible version/i });
    await userEvent.click(versionPickerButton);

    // Wait for the search input to be available - use screen because popover uses portal
    const searchInput = await screen.findByPlaceholderText('Search');
    await userEvent.type(searchInput, 'amplified bible');

    // Wait for filtering and assert only one result
    // Find the list that contains Amplified Bible (the versions list, not the languages list)
    await screen.findByText('Amplified Bible');
    const versionList = await screen.findByTestId('version-list');
    await expect(versionList).toBeInTheDocument();

    const versionItems = await within(versionList).findAllByRole('listitem');
    await expect(versionItems).toHaveLength(1);

    // Assert the Amplified Bible is showing
    await expect(versionItems[0]).toHaveTextContent(/amplified/i);

    await userEvent.click(screen.getByRole('listitem', { name: /amplified bible/i }));

    // Wait for version change to complete
    await waitFor(async () => {
      await expect(screen.getByRole('button', { name: /change bible version/i })).toHaveTextContent(
        'AMP',
      );
    });

    expect(screen.getByText(/luke 1.39-45 amp/i));
  },
};
