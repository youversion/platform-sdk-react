import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within, userEvent, spyOn } from 'storybook/test';

import { VerseOfTheDay } from './verse-of-the-day';

const meta = {
  title: 'Components/VerseOfTheDay',
  component: VerseOfTheDay,
  parameters: {
    layout: 'centered',
  },
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

    // Wait for component to load, then check that the loading text is shown before the verse.
    await expect(await canvas.findByText('Loading...')).toBeInTheDocument();
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
