import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, userEvent, screen } from 'storybook/test';
import { BibleWidgetView } from './bible-widget-view';
import { waitFor } from '@testing-library/react';

const meta = {
  title: 'Components/BibleWidgetView',
  component: BibleWidgetView,
  parameters: {
    layout: 'centered',
  },
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

    // Wait for loading to finish with extended timeout for CI
    const versionPickerButton = await canvas.findByRole(
      'button',
      { name: /change bible version/i },
      { timeout: 10_000 },
    );
    await waitFor(
      async () => {
        await expect(versionPickerButton).not.toHaveTextContent('Loading...');
      },
      { timeout: 10_000 },
    );

    // Click the version picker button
    await userEvent.click(versionPickerButton);

    // Wait for the version list to load before searching - use screen because popover uses portal
    await screen.findByTestId('version-list', {}, { timeout: 10_000 });

    // Now search for amplified bible
    const searchInput = await screen.findByPlaceholderText('Search');
    await userEvent.type(searchInput, 'amplified bible');

    // Wait for filtering and assert only one result
    await screen.findByText('Amplified Bible');
    const versionList = await screen.findByTestId('version-list');
    await expect(versionList).toBeInTheDocument();

    const versionItems = await within(versionList).findAllByRole('listitem');
    await expect(versionItems).toHaveLength(1);

    // Assert the Amplified Bible is showing
    await expect(versionItems[0]).toHaveTextContent(/amplified/i);

    await userEvent.click(screen.getByRole('listitem', { name: /amplified bible/i }));

    // Wait for version change to complete
    await waitFor(
      async () => {
        await expect(
          screen.getByRole('button', { name: /change bible version/i }),
        ).toHaveTextContent('AMP');
      },
      { timeout: 10_000 },
    );

    await waitFor(
      async () => {
        const heading = screen.getByRole('heading', { level: 2, name: /luke 1:39-45/i });
        await expect(heading).toHaveTextContent(/amp/i);
      },
      { timeout: 10_000 },
    );
  },
};

export const RealAPI: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    showVersionPicker: true,
    background: 'dark',
  },
  parameters: {
    msw: {
      handlers: null,
    },
  },
};
