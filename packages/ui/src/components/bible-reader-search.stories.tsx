import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor } from 'storybook/test';
import { BibleReader } from './bible-reader';
import { useState } from 'react';
import { BibleReaderNavigation } from './bible-reader-navigation';
import { Button } from './ui/button';
import { http, HttpResponse } from 'msw';
import { globalHandlers } from '@/test/mocks/handlers';

const meta = {
  title: 'Components/BibleReaderSearch',
  component: BibleReader.Root,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof BibleReader.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OpenTrending: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    defaultBook: 'JHN',
    defaultChapter: '1',
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        const verseContainer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
        await expect(verseContainer).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const searchButton = await waitFor(
      () => screen.getByRole('button', { name: 'Search the Bible' }),
      { timeout: 5000 },
    );
    await userEvent.click(searchButton);

    await waitFor(async () => {
      await expect(screen.getByRole('option', { name: 'love' })).toBeInTheDocument();
    });
  },
};

/** Host-owned navigation created before the reader mounts. */
function NavigationExample() {
  const [navigation] = useState(() => {
    const connection = new BibleReaderNavigation();
    connection.focusReference({ versionId: 111, passageId: 'JHN.1.51' });
    return connection;
  });
  return (
    <div className="yv:h-screen yv:flex yv:flex-col">
      <Button onClick={() => navigation.focusReference({ versionId: 111, passageId: 'JHN.1.51' })}>
        Focus John 1:51
      </Button>
      <div className="yv:flex-1 yv:min-h-0">
        <BibleReader.Root navigation={navigation} defaultVersionId={111}>
          <BibleReader.Content />
          <BibleReader.Toolbar />
        </BibleReader.Root>
      </div>
    </div>
  );
}

export const NavigateAndFocus: Story = {
  tags: ['integration'],
  render: () => <NavigationExample />,
  play: async ({ canvasElement }) => {
    let focused: HTMLElement | null = null;
    await waitFor(
      async () => {
        focused = canvasElement.querySelector<HTMLElement>('.yv-v-focused[v="51"]');
        await expect(focused).not.toBeNull();
      },
      { timeout: 5000 },
    );
    const scroller = canvasElement.querySelector<HTMLElement>('main');
    await expect(scroller).not.toBeNull();
    await expect(scroller!.scrollTop).toBeGreaterThan(0);
    const bounds = focused!.getBoundingClientRect();
    const viewport = scroller!.getBoundingClientRect();
    await expect(bounds.top).toBeGreaterThanOrEqual(viewport.top);
    await expect(bounds.bottom).toBeLessThanOrEqual(viewport.bottom);
    // Native smooth-scroll events must not clear focus after landing.
    await new Promise((resolve) => setTimeout(resolve, 250));
    await expect(focused).toHaveClass('yv-v-focused');
    scroller!.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
    await waitFor(() => expect(focused).not.toHaveClass('yv-v-focused'));
  },
};

export const SearchFailure: Story = {
  ...OpenTrending,
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/search-verses', () => new HttpResponse(null, { status: 503 })),
        ...globalHandlers,
      ],
    },
  },
  play: async (context) => {
    await OpenTrending.play?.(context);
    await userEvent.click(screen.getByRole('button', { name: 'love' }));
    await expect(await screen.findByRole('alert')).toBeVisible();
    await expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    await expect(screen.getByRole('button', { name: 'Close' })).toBeEnabled();
  },
};
