import type { Meta, StoryObj } from '@storybook/react-vite';
import { within, expect, fn, userEvent, waitFor } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { BibleCard, type BibleCardProps } from './bible-card';
import { globalHandlers } from '../test/mocks/handlers';
import {
  requireShadowContent,
  waitForShadowContent,
  waitForShadowRoot,
} from '../test/storybook-dom';

async function getVersionPickerQueries(container: ParentNode, triggerName: RegExp) {
  const root = await waitForShadowRoot(container);
  return waitFor(() => {
    const content = root.querySelector<HTMLElement>('[data-yv-shadow-content-wrapper]');
    if (!content) throw new globalThis.Error('BibleCard shadow content not rendered');
    const picker = within(content);
    const trigger = picker.queryByRole('button', { name: triggerName });
    if (!trigger) throw new globalThis.Error('version picker trigger not rendered');
    return { root, picker, trigger };
  });
}

async function getVersionPickerOverlay(root: ShadowRoot) {
  return waitFor(() => {
    const overlay = root.querySelector<HTMLElement>('[data-yv-shadow-local-overlay]');
    if (!overlay) throw new globalThis.Error('version picker overlay not rendered');
    return within(overlay);
  });
}

function ControlledBibleCard(props: BibleCardProps): React.ReactNode {
  const [versionId, setVersionId] = useState(props.versionId ?? props.defaultVersionId ?? 111);
  return (
    <BibleCard
      {...props}
      versionId={versionId}
      onVersionChange={(nextVersionId) => {
        props.onVersionChange?.(nextVersionId);
        setVersionId(nextVersionId);
      }}
    />
  );
}

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
    maxWidth: {
      description:
        'Painted section max-width. A number is CSS px (default 700). Pass "100%" for full-bleed; that path keeps the 600px inner column. Scripture fills the inner column (the card lifts the 65ch renderer measure).',
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

export const WithHighlights: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    highlights: [
      { version_id: 111, passage_id: 'LUK.1.39', color: 'fffe00' },
      { version_id: 111, passage_id: 'LUK.1.41-42', color: '5dff79' },
    ],
  },
};

export const RtlInterfaceWithLtrScripture: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    showVersionPicker: true,
    scriptureDirection: 'ltr',
  },
  globals: {
    interfaceDirection: 'rtl',
    locale: 'ar',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    const canvas = within(await waitForShadowContent(root));
    const { trigger: versionPicker } = await getVersionPickerQueries(
      canvasElement,
      /تغيير إصدار الكتاب المقدس/i,
    );
    await canvas.findByText(/at that time mary got ready/i);
    const card = root.querySelector('section[data-yv-sdk]');
    const reference = root.querySelector('h2');
    const renderer = root.querySelector('[data-slot="yv-bible-renderer"]');

    await expect(card).toHaveAttribute('dir', 'rtl');
    await expect(renderer).toHaveAttribute('dir', 'ltr');
    await expect(reference?.querySelector('bdi')).toHaveAttribute('dir', 'auto');
    await expect(reference?.getBoundingClientRect().left ?? 0).toBeGreaterThan(
      versionPicker.getBoundingClientRect().left,
    );
  },
};

export const WideContainer: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    maxWidth: '100%',
  },
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => (
    <div className="yv:p-8" style={{ width: 900 }}>
      <BibleCard {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    const canvas = within(await waitForShadowContent(root));

    await waitFor(async () => {
      await expect(canvas.getByText(/at that time mary got ready/i)).toBeInTheDocument();
    });

    const card = root.querySelector('section[data-yv-sdk][data-yv-theme]');
    const contentGroup = root.querySelector('section[data-yv-sdk][data-yv-theme] > div');
    const bibleText = root.querySelector('[data-slot="yv-bible-renderer"]');

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
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    const canvas = within(await waitForShadowContent(root));

    // Wait for initial content to load
    const {
      root: pickerRoot,
      picker,
      trigger: versionPickerButton,
    } = await getVersionPickerQueries(canvasElement, /change bible version/i);

    await waitFor(async () => {
      await expect(versionPickerButton).toHaveTextContent(/NIV/i);
      await expect(canvas.getByText(/at that time mary got ready/i)).toBeInTheDocument();
    });

    // Open version picker dialog
    await userEvent.click(versionPickerButton);
    const overlay = await getVersionPickerOverlay(pickerRoot);

    await expect(await overlay.findByRole('dialog')).toBeInTheDocument();

    // Wait for versions to actually load (not just the container)
    await waitFor(async () => {
      const versionList = overlay.getByTestId('version-list');
      // Search for New International Version to exist to show data came back from API
      await within(versionList).findByText(/new international version 2011/i);
      const items = await within(versionList).findAllByRole('listitem');
      await expect(items.length).toBeGreaterThan(0);
    });

    // Search for Amplified Bible
    const searchInput = overlay.getByRole('textbox', {
      name: /search bible versions/i,
    });
    await userEvent.type(searchInput, 'amplified bible');

    await waitFor(async () => {
      const versionList = overlay.getByTestId('version-list');
      const versionItems = within(versionList).getAllByRole('listitem');
      await expect(versionItems).toHaveLength(1);
      await expect(versionItems[0]).toHaveTextContent(/amplified bible/i);
    });

    // Select Amplified Bible version
    const versionListItem = overlay.getByRole('listitem', {
      name: /amplified bible/i,
    });
    await userEvent.click(versionListItem);

    // Verify version changed to AMP
    await waitFor(async () => {
      await expect(picker.getByRole('button', { name: /change bible version/i })).toHaveTextContent(
        'AMP',
      );
    });

    await waitFor(async () => {
      const heading = canvas.getByRole('heading', { level: 2, name: /luke 1:39-45/i });
      await expect(heading).toHaveTextContent(/amp/i);
    });
  },
};

export const WithControlledVersionPicker: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    showVersionPicker: true,
    onVersionChange: fn(),
  },
  tags: ['integration'],
  render: (args) => <ControlledBibleCard {...args} />,
  play: async ({ args, canvasElement }) => {
    const { root, trigger } = await getVersionPickerQueries(canvasElement, /change bible version/i);
    await waitFor(async () => {
      await expect(trigger).toBeEnabled();
      await expect(trigger).toHaveTextContent(/NIV/i);
    });
    await userEvent.click(trigger);
    const overlay = await getVersionPickerOverlay(root);
    const searchInput = overlay.getByRole('textbox', { name: /search bible versions/i });
    await userEvent.type(searchInput, 'amplified bible');
    const amplified = await overlay.findByRole('listitem', { name: /amplified bible/i });

    await userEvent.click(amplified);

    await expect(args.onVersionChange).toHaveBeenCalledWith(1588);
    await waitFor(async () => {
      await expect(
        within(requireShadowContent(root)).getByRole('heading', {
          level: 2,
          name: /luke 1:39-45/i,
        }),
      ).toHaveTextContent(/amp/i);
    });
  },
};

export const WithNativeVersionPickerCallback: Story = {
  args: {
    reference: 'LUK.1.39-45',
    versionId: 111,
    showVersionPicker: true,
    onVersionPickerPress: fn(),
  },
  tags: ['integration'],
  play: async ({ args, canvasElement }) => {
    const { root, trigger } = await getVersionPickerQueries(canvasElement, /change bible version/i);
    await waitFor(async () => {
      await expect(trigger).toBeEnabled();
      await expect(trigger).toHaveTextContent(/NIV/i);
    });

    await userEvent.click(trigger);

    await expect(args.onVersionPickerPress).toHaveBeenCalledWith({
      languageId: 'en',
      versionId: 111,
    });
    await expect(root.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();
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
    const root = await waitForShadowRoot(canvasElement);
    const canvas = within(await waitForShadowContent(root));

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
    const { root: pickerRoot, trigger: versionPickerButton } = await getVersionPickerQueries(
      canvasElement,
      /change bible version/i,
    );

    await waitFor(async () => {
      await expect(versionPickerButton).toBeEnabled();
      await expect(versionPickerButton).toHaveTextContent(/NIV/i);
    });

    // Walk the recovery path: switch to a version whose passage resolves.
    await userEvent.click(versionPickerButton);

    const overlay = await getVersionPickerOverlay(pickerRoot);
    const searchInput = overlay.getByRole('textbox', { name: /search bible versions/i });

    await userEvent.type(searchInput, 'amplified bible');

    await waitFor(async () => {
      const versionList = overlay.getByTestId('version-list');
      const versionItems = within(versionList).getAllByRole('listitem');
      await expect(versionItems).toHaveLength(1);
      await expect(versionItems[0]).toHaveTextContent(/amplified bible/i);
    });

    await userEvent.click(overlay.getByRole('listitem', { name: /amplified bible/i }));

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
