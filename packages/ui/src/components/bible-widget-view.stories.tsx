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

    // Validate the dialog is open
    // P.S. I use screen here because the Popover uses a Portal that moves
    // the element out of the original canvas element.
    const dialog = await screen.findByRole('dialog');
    await expect(dialog).toBeInTheDocument();

    // Wait for the version list to load before searching - use screen because popover uses portal
    await within(dialog).findByTestId('version-list', {}, { timeout: 10_000 });

    // Now search for amplified bible
    const searchInput = await within(dialog).findByPlaceholderText('Search');
    await userEvent.type(searchInput, 'amplified bible');

    // Wait for filtering and assert only one result
    await within(dialog).findByText('Amplified Bible');
    const versionList = await within(dialog).findByTestId('version-list');
    const versionItems = await within(versionList).findAllByRole('listitem');
    await expect(versionItems).toHaveLength(1);

    // Assert the Amplified Bible is showing
    await expect(versionItems[0]).toHaveTextContent(/amplified bible/i);

    // Select the Ampilfied Bible list item
    const versionListItem = await within(dialog).findByRole('listitem', {
      name: /amplified bible/i,
    });
    await userEvent.click(versionListItem);

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
