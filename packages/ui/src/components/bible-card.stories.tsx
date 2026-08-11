import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, userEvent, screen, waitFor } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { BibleCard } from './bible-card';
import { globalHandlers } from '../test/mocks/handlers';

const meta = {
  title: 'Components/BibleCard',
  component: BibleCard,
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => (
    <div className="yv:w-full">
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

export const WideContainer: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
  },
  tags: ['integration'],
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => (
    <div className="yv:p-8" style={{ width: 900 }}>
      <BibleCard {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(canvas.getByText(/at that time mary got ready/i)).toBeInTheDocument();
    });

    const card = canvasElement.querySelector('section[data-yv-sdk][data-yv-theme]');
    const contentGroup = canvasElement.querySelector('section[data-yv-sdk][data-yv-theme] > div');
    const bibleText = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');

    await expect(card).not.toBeNull();
    await expect(contentGroup).not.toBeNull();
    await expect(bibleText).not.toBeNull();

    const cardWidth = card?.getBoundingClientRect().width ?? 0;
    const contentGroupRect = contentGroup?.getBoundingClientRect();
    const cardRect = card?.getBoundingClientRect();
    const leftWhitespace = (contentGroupRect?.left ?? 0) - (cardRect?.left ?? 0);
    const rightWhitespace = (cardRect?.right ?? 0) - (contentGroupRect?.right ?? 0);
    const bibleTextWidth = bibleText?.getBoundingClientRect().width ?? 0;

    await expect(cardWidth).toBeGreaterThan(800);
    await expect(contentGroupRect?.width ?? 0).toBeLessThanOrEqual(600);
    await expect(bibleTextWidth).toBeLessThanOrEqual(600);
    await expect(Math.abs(leftWhitespace - rightWhitespace)).toBeLessThanOrEqual(1);
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
    const searchInput = within(await screen.findByRole('dialog')).getByRole('textbox', {
      name: /search bible versions/i,
    });
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
    showVersionPicker: true,
  },
  tags: ['integration'],
  parameters: {
    msw: {
      /*
        A story-level `handlers` array replaces the preview-level `globalHandlers`
        rather than merging with it, so `globalHandlers` is spread back in.
        Without it the version picker's `useLanguages`/`useVersions` calls fall
        through to the live API, because `onUnhandledRequest` is 'warn'.

        The 500 override comes first: MSW takes the first matching handler, so it
        wins over the successful NIV passage handler in `globalHandlers`. Version
        1588 (AMP) is left on `globalHandlers` and still resolves, which is what
        makes the recovery path below testable.
      */
      handlers: [
        http.get('*/v1/bibles/111/passages/LUK.1.39-45', () => {
          return new HttpResponse(null, { status: 500 });
        }),
        ...globalHandlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The header slot carries the "Error" label; the body block is the one alert.
    await waitFor(async () => {
      await expect(canvas.getByRole('heading', { level: 2, name: /error/i })).toBeInTheDocument();
    });

    const alerts = canvas.getAllByRole('alert');

    await expect(alerts).toHaveLength(1);
    await expect(alerts[0]).toHaveTextContent(
      'The Bible service is having trouble right now. Please try again in a moment.',
    );
    // role="alert" implies assertive. The explicit polite value holds the
    // announcement down, so a failed load does not interrupt the reader.
    await expect(alerts[0]).toHaveAttribute('aria-live', 'polite');

    // The picker is the in-card recovery path: a 404 is fixed by switching versions.
    const versionPickerButton = await canvas.findByRole('button', {
      name: /change bible version/i,
    });

    await waitFor(async () => {
      await expect(versionPickerButton).toBeEnabled();
      await expect(versionPickerButton).toHaveTextContent(/NIV/i);
    });

    // Walk the recovery path: switch to a version whose passage resolves.
    await userEvent.click(versionPickerButton);

    const dialog = await screen.findByRole('dialog');
    const searchInput = within(dialog).getByRole('textbox', { name: /search bible versions/i });

    await userEvent.type(searchInput, 'amplified bible');

    await waitFor(async () => {
      const versionList = within(dialog).getByTestId('version-list');
      const versionItems = within(versionList).getAllByRole('listitem');
      await expect(versionItems).toHaveLength(1);
      await expect(versionItems[0]).toHaveTextContent(/amplified bible/i);
    });

    await userEvent.click(within(dialog).getByRole('listitem', { name: /amplified bible/i }));

    // The error clears: no alert, and the passage replaces the "Error" heading.
    await waitFor(async () => {
      await expect(canvas.queryByRole('alert')).toBeNull();
      await expect(canvas.getByText(/at that time mary got ready/i)).toBeInTheDocument();
    });

    await expect(
      canvas.getByRole('heading', { level: 2, name: /luke 1:39-45/i }),
    ).toHaveTextContent(/amp/i);
  },
};
