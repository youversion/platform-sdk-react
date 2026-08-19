import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, userEvent, spyOn } from 'storybook/test';

import { VerseOfTheDay } from './verse-of-the-day';

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
  },
  tags: ['integration'],
  beforeEach: () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true, // Allows the property to be redefined later
      value: async () => {
        return Promise.resolve(); // Simulate a successful share
      },
    });
  },
  play: async ({ canvasElement }) => {
    const mockSpy = spyOn(navigator, 'share');
    const canvas = within(canvasElement);

    // Wait for component to load, then check that the verse appears.
    await expect(
      await canvas.findByText(/for I am about to do something new/i),
    ).toBeInTheDocument();
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
    const canvas = within(canvasElement);

    await expect(
      await canvas.findByText(/for I am about to do something new/i),
    ).toBeInTheDocument();

    const card = canvasElement.querySelector('section[data-yv-sdk][data-yv-theme]');
    const contentGroup = canvasElement.querySelector('section[data-yv-sdk][data-yv-theme] > div');
    const bibleText = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');

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
    size: 'lg',
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
