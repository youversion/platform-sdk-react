import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, userEvent, screen, waitFor } from 'storybook/test';
import { delay, http, HttpResponse } from 'msw';
import { BibleCard } from './bible-card';
import mockPassages from '../test/mock-data/passages.json';
import mockBibles from '../test/mock-data/bibles.json';

const LOADING_DELAY = 1000;

const delayedHandlers = [
  http.get('*/v1/bibles/:id/passages/*', async ({ params }) => {
    await delay(LOADING_DELAY);

    const id = String(params.id);
    if (id === '111') {
      return HttpResponse.json(mockPassages['LUK.1.39-45.NIV']);
    }

    if (id === '1588') {
      return HttpResponse.json(mockPassages['LUK.1.39-45.AMP']);
    }

    return new HttpResponse(null, { status: 404 });
  }),
  http.get('*/v1/bibles/:id', async ({ params }) => {
    await delay(LOADING_DELAY);

    const id = String(params.id);
    const bible = mockBibles.individual[id as keyof typeof mockBibles.individual];
    if (bible) {
      return HttpResponse.json(bible);
    }

    return new HttpResponse(null, { status: 404 });
  }),
];

const meta = {
  title: 'Components/BibleCard',
  component: BibleCard,
  parameters: {
    layout: 'centered',
  },
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

export const Loading: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
  },
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: delayedHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const loadingSkeleton = await canvas.findByRole('status', {
      name: /loading bible verse/i,
    });
    await expect(loadingSkeleton).toHaveAttribute('aria-busy', 'true');
  },
};

export const LoadingWithVersionPicker: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    showVersionPicker: true,
  },
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: delayedHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const loadingSkeleton = await canvas.findByRole('status', {
      name: /loading bible verse/i,
    });
    await expect(loadingSkeleton).toHaveAttribute('aria-busy', 'true');
  },
};

export const LoadingDarkMode: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    showVersionPicker: true,
  },
  globals: {
    theme: 'dark',
  },
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: delayedHandlers,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const loadingSkeleton = await canvas.findByRole('status', {
      name: /loading bible verse/i,
    });
    await expect(loadingSkeleton).toHaveAttribute('aria-busy', 'true');
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
