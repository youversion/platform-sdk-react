import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, userEvent, screen, waitFor } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { BibleCard } from './bible-card';

const meta = {
  title: 'Components/BibleCard',
  component: BibleCard,
  parameters: {
    layout: 'centered',
  },
  render: (args) => (
    <div className="yv:h-screen yv:w-screen yv:flex yv:justify-center yv:items-center">
      <BibleCard {...args} />
    </div>
  ),
  tags: ['autodocs'],
  argTypes: {
    background: {
      table: { disable: true },
    },
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
} satisfies Meta<typeof BibleCard>;

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
  },
  globals: {
    theme: 'dark',
  },
};

export const WithVersionPicker: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    showVersionPicker: true,
  },
  globals: {
    theme: 'dark',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for initial content to load
    const versionPickerButton = await canvas.findByRole('button', {
      name: /change bible version/i,
    });

    await waitFor(async () => {
      await expect(versionPickerButton).toHaveTextContent(/NIV/i);
      await expect(canvas.getByText(/at that time mary got ready/i)).toBeInTheDocument();
    });

    // Open version picker dialog
    await userEvent.click(versionPickerButton);

    // Use screen for portal elements (popover renders outside canvas)
    await expect(await screen.findByRole('dialog')).toBeInTheDocument();

    // Wait for versions to actually load (not just the container)
    await waitFor(async () => {
      const versionList = within(await screen.findByRole('dialog')).getByTestId('version-list');
      // Search for New International Version to exist to show data came back from API
      await within(versionList).findByText(/new international version 2011/i);
      const items = await within(versionList).findAllByRole('listitem');
      await expect(items.length).toBeGreaterThan(0);
    });

    // Search for Amplified Bible
    const searchInput = within(await screen.findByRole('dialog')).getByPlaceholderText('Search');
    await userEvent.type(searchInput, 'amplified bible');

    await waitFor(async () => {
      const versionList = within(await screen.findByRole('dialog')).getByTestId('version-list');
      const versionItems = within(versionList).getAllByRole('listitem');
      await expect(versionItems).toHaveLength(1);
      await expect(versionItems[0]).toHaveTextContent(/amplified bible/i);
    });

    // Select Amplified Bible version
    const versionListItem = within(await screen.findByRole('dialog')).getByRole('listitem', {
      name: /amplified bible/i,
    });
    await userEvent.click(versionListItem);

    // Verify version changed to AMP
    await waitFor(async () => {
      await expect(screen.getByRole('button', { name: /change bible version/i })).toHaveTextContent(
        'AMP',
      );
    });

    await waitFor(async () => {
      const heading = screen.getByRole('heading', { level: 2, name: /luke 1:39-45/i });
      await expect(heading).toHaveTextContent(/amp/i);
    });
  },
};

export const RealAPI: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    showVersionPicker: true,
  },
  parameters: {
    msw: {
      handlers: null,
    },
  },
};

export const Error: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
  },
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/bibles/111', () => {
          return HttpResponse.json({
            id: 111,
            localized_abbreviation: 'NIV',
          });
        }),
        http.get('*/v1/bibles/111/passages/LUK.1.39-45', () => {
          return new HttpResponse(null, { status: 500 });
        }),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(canvas.getByRole('heading', { level: 2, name: /error/i })).toBeInTheDocument();
      const errorMessages = canvas.getAllByText(
        'Your previously selected Bible verse is unavailable.',
      );
      await expect(errorMessages.length).toBeGreaterThan(0);
    });
  },
};
