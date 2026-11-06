import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, userEvent, spyOn } from 'storybook/test';
import { http, HttpResponse } from 'msw';
import { getWorker } from 'msw-storybook-addon';

import { VerseOfTheDay } from './verse-of-the-day';
import { waitFor, waitForShadowContent, waitForShadowRoot } from '@/test/storybook-dom';
import { globalHandlers } from '@/test/mocks/handlers';
import mockPassages from '@/test/mock-data/passages.json';
import { ScriptureStoryDataProvider } from '@/test/scripture-story-data';

const VOTD_PASSAGE_RELEASE_EVENT = 'yv-storybook-release-votd-passage';
const VOTD_PASSAGE_WAITING_EVENT = 'yv-storybook-votd-passage-waiting';

const withScriptureStoryData = (Story: React.ComponentType) => (
  <ScriptureStoryDataProvider>
    <Story />
  </ScriptureStoryDataProvider>
);

const meta = {
  title: 'Components/VerseOfTheDay',
  component: VerseOfTheDay,
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => (
    <div className="yv:w-full">
      <VerseOfTheDay {...args} />
    </div>
  ),
  tags: ['autodocs'],
  argTypes: {
    background: {
      table: { disable: true },
    },
    // We are intentionally not allowing controls
    // for dayOfYear and versionId, since they are
    // mocked, essentially hard-coded, above.
    versionId: {
      table: {
        disable: true,
      },
    },
    dayOfYear: {
      table: {
        disable: true,
      },
    },
    showSunIcon: {
      control: 'boolean',
    },
    showBibleAppAttribution: {
      control: 'boolean',
    },
    showShareButton: {
      control: 'boolean',
    },
    size: {
      control: { type: 'select' },
      options: ['default', 'lg'],
    },
  },
} satisfies Meta<typeof VerseOfTheDay>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    versionId: 111, // This is intentionally set to NIV due to mock data
    showSunIcon: true,
    showBibleAppAttribution: true,
    showShareButton: true,
    size: 'default',
    highlights: [],
  },
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  decorators: [withScriptureStoryData],
  play: async ({ canvasElement }) => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => Promise.resolve(),
    });
    const mockSpy = spyOn(navigator, 'share');
    const canvas = within(await waitForShadowContent(await waitForShadowRoot(canvasElement)));

    // Wait for component to load, then check that the verse appears.
    await waitFor(() =>
      expect(canvas.getByText(/for I am about to do something new/i)).toBeInTheDocument(),
    );
    await expect(await canvas.findByText(/isaiah 43:19/i)).toBeInTheDocument();
    await expect(await canvas.findByTitle(/Sun/i)).toBeInTheDocument();
    await expect(await canvas.findByTitle(/Bible App/i)).toBeInTheDocument();

    await userEvent.click(await canvas.findByRole('button', { name: /share/i }));
    await expect(mockSpy).toHaveBeenCalledTimes(1);
    const callArgs = mockSpy.mock.calls[0]?.[0];
    await expect(callArgs).toHaveProperty('text');
    await expect(callArgs?.text).toContain('For I am about to do something new');
    await expect(callArgs?.text).toContain('Isaiah 43:19 NIV');
  },
};

export const OfflineRecovery: Story = {
  args: {
    versionId: 111,
    showSunIcon: true,
    showBibleAppAttribution: true,
    showShareButton: true,
    size: 'default',
    highlights: [],
  },
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  loaders: [
    () => {
      getWorker().use(
        http.get('*/v1/bibles/111/passages/ISA.43.19', () => HttpResponse.error(), {
          once: true,
        }),
        http.get(
          '*/v1/bibles/111/passages/ISA.43.19',
          async () => {
            await new Promise<void>((resolve) => {
              window.addEventListener(VOTD_PASSAGE_RELEASE_EVENT, () => resolve(), {
                once: true,
              });
              window.dispatchEvent(new Event(VOTD_PASSAGE_WAITING_EVENT));
            });
            return HttpResponse.json(mockPassages['ISA.43.19']);
          },
          { once: true },
        ),
      );
      return {};
    },
  ],
  parameters: {
    msw: {
      handlers: globalHandlers,
    },
  },
  render: (args) => (
    <>
      <button type="button">Before Verse of the Day</button>
      <div className="yv:w-full">
        <VerseOfTheDay {...args} />
      </div>
      <button type="button">After Verse of the Day</button>
    </>
  ),
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    const canvas = within(await waitForShadowContent(root));
    const alert = await canvas.findByRole('alert');
    const card = root.querySelector<HTMLElement>(
      '[data-yv-shadow-content-wrapper] > section[data-yv-sdk]',
    );
    const shareButton = canvas.getByRole('button', { name: /share/i });

    await expect(alert.getBoundingClientRect().height).toBeGreaterThan(0);
    await expect(alert).not.toBeEmptyDOMElement();
    await expect(card ? getComputedStyle(card).display : '').toBe('flex');
    await expect(card ? getComputedStyle(card).flexDirection : '').toBe('column');
    await expect(shareButton).toBeDisabled();
    await expect(canvas.getByTitle(/Bible App/i)).toBeInTheDocument();

    const afterVerseOfTheDay = within(canvasElement).getByRole('button', {
      name: 'After Verse of the Day',
    });
    const beforeVerseOfTheDay = within(canvasElement).getByRole('button', {
      name: 'Before Verse of the Day',
    });
    beforeVerseOfTheDay.focus();
    await userEvent.tab();
    await expect(document.activeElement).toBe(afterVerseOfTheDay);

    let recoveryRequestIsWaiting = false;
    const markRecoveryRequestWaiting = () => {
      recoveryRequestIsWaiting = true;
    };
    window.addEventListener(VOTD_PASSAGE_WAITING_EVENT, markRecoveryRequestWaiting, { once: true });
    window.dispatchEvent(new Event('offline'));
    window.dispatchEvent(new Event('online'));

    try {
      await waitFor(async () => {
        await expect(recoveryRequestIsWaiting).toBe(true);
      });
      await waitFor(async () => {
        const loading = canvas.getByRole('status', { name: /loading verse/i });
        await expect(loading.getBoundingClientRect().height).toBeGreaterThan(0);
        await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
      });
    } finally {
      window.removeEventListener(VOTD_PASSAGE_WAITING_EVENT, markRecoveryRequestWaiting);
      window.dispatchEvent(new Event(VOTD_PASSAGE_RELEASE_EVENT));
    }

    await waitFor(async () => {
      await expect(canvas.getByText(/for I am about to do something new/i)).toBeInTheDocument();
      await expect(canvas.getByText(/isaiah 43:19/i)).toBeInTheDocument();
      await expect(canvas.queryByRole('alert')).not.toBeInTheDocument();
      await expect(canvas.queryByRole('status')).not.toBeInTheDocument();
      await expect(shareButton).toBeEnabled();
    });
  },
};

export const WideContainer: Story = {
  args: {
    versionId: 111,
    showSunIcon: true,
    showBibleAppAttribution: true,
    showShareButton: true,
    size: 'default',
  },
  tags: ['integration'],
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => (
    <div className="yv:p-8" style={{ width: 900 }}>
      <VerseOfTheDay {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    const canvas = within(await waitForShadowContent(root));

    await waitFor(() =>
      expect(canvas.getByText(/for I am about to do something new/i)).toBeInTheDocument(),
    );

    const card = root.querySelector('section[data-yv-sdk][data-yv-theme]');
    const contentGroup = root.querySelector('section[data-yv-sdk][data-yv-theme] > div');
    const bibleText = root.querySelector('[data-slot="yv-bible-renderer"]');

    await expect(card).not.toBeNull();
    await expect(contentGroup).not.toBeNull();
    await expect(bibleText).not.toBeNull();

    const cardRect = card?.getBoundingClientRect();
    const contentGroupRect = contentGroup?.getBoundingClientRect();
    const leftWhitespace = (contentGroupRect?.left ?? 0) - (cardRect?.left ?? 0);
    const rightWhitespace = (cardRect?.right ?? 0) - (contentGroupRect?.right ?? 0);

    await expect(cardRect?.width ?? 0).toBeGreaterThan(800);
    await expect(contentGroupRect?.width ?? 0).toBeLessThanOrEqual(600);
    await expect(bibleText?.getBoundingClientRect().width ?? 0).toBeLessThanOrEqual(600);
    await expect(Math.abs(leftWhitespace - rightWhitespace)).toBeLessThanOrEqual(1);
  },
};

export const Large: Story = {
  args: {
    versionId: 111,
    size: 'lg',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const root = await waitForShadowRoot(canvasElement);
    const canvas = within(await waitForShadowContent(root));
    await waitFor(() =>
      expect(canvas.getByText(/for I am about to do something new/i)).toBeInTheDocument(),
    );
    await expect(root.querySelector('section[data-size="lg"]')).toBeInTheDocument();
    await expect(root.querySelector('[data-slot="yv-bible-renderer"]')).toHaveStyle({
      '--yv-reader-font-size': '20px',
    });
  },
};

export const Minimal: Story = {
  args: {
    showSunIcon: false,
    showShareButton: false,
    showBibleAppAttribution: false,
  },
};

export const WithHighlights: Story = {
  args: {
    versionId: 111,
    showSunIcon: true,
    showBibleAppAttribution: true,
    showShareButton: false,
    highlights: [{ version_id: 111, passage_id: 'ISA.43.19', color: 'fffe00' }],
  },
};

export const RtlInterfaceWithLtrScripture: Story = {
  args: {
    versionId: 111,
    showSunIcon: true,
    showBibleAppAttribution: true,
    showShareButton: true,
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
    await canvas.findByText(/for I am about to do something new/i);
    const card = root.querySelector('section[data-yv-sdk]');
    const icon = root.querySelector('[data-slot="card-icon"]');
    const action = root.querySelector('[data-slot="card-action"]');
    const renderer = root.querySelector('[data-slot="yv-bible-renderer"]');

    await expect(card).toHaveAttribute('dir', 'rtl');
    await expect(renderer).toHaveAttribute('dir', 'ltr');
    await expect(icon?.getBoundingClientRect().left ?? 0).toBeGreaterThan(
      action?.getBoundingClientRect().left ?? 0,
    );
  },
};

export const RealAPI: Story = {
  args: {
    showSunIcon: true,
    showBibleAppAttribution: true,
    showShareButton: true,
    size: 'default',
  },
  parameters: {
    msw: {
      handlers: null,
    },
  },
};
