import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import { BibleReader } from './bible-reader';
import { useState } from 'react';
import { BibleReaderNavigation } from './bible-reader-navigation';
import { Button } from './ui/button';
import { delay, http, HttpResponse } from 'msw';
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
      await expect(
        within(screen.getByRole('region', { name: 'Trending Searches' })).getByRole('button', {
          name: 'love',
        }),
      ).toBeInTheDocument();
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
    await expect(focused).toHaveFocus();
    // A pointer left over the verse can apply its ordinary hover background.
    await userEvent.unhover(focused!);
    const surrounding = canvasElement.querySelector<HTMLElement>('.yv-v[v="50"]')!;
    await waitFor(async () => {
      await expect(getComputedStyle(focused!).opacity).toBe('1');
      await expect(getComputedStyle(focused!).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      await expect(getComputedStyle(surrounding).opacity).toBe('0.35');
    });
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
    await userEvent.click(
      within(screen.getByRole('region', { name: 'Trending Searches' })).getByRole('button', {
        name: 'love',
      }),
    );
    await expect(await screen.findByRole('alert')).toBeVisible();
    await expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
    await expect(screen.getByRole('button', { name: 'Back to search' })).toBeEnabled();
  },
};

export const SearchAndReturn: Story = {
  ...OpenTrending,
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/search-verses', () =>
          HttpResponse.json({
            verses: [{ reference: 'JHN.1' }, { reference: 'JHN.1.51' }],
            did_you_mean: [],
            search_instead_for: null,
            next_page_token: null,
          }),
        ),
        ...globalHandlers,
      ],
    },
  },
  play: async (context) => {
    await OpenTrending.play?.(context);
    const input = screen.getByRole('textbox', { name: 'Search the Bible' });
    await expect(input).toHaveFocus();
    await userEvent.type(input, 'angels{Enter}');
    const result = await screen.findByRole('button', { name: /John 1:51/i });
    await expect(
      screen.queryByRole('button', { name: /^John 1(?:\s|$)/i }),
    ).not.toBeInTheDocument();
    await userEvent.click(result);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(context.canvasElement.querySelector('.yv-v[v="51"]')).toHaveFocus());
    await userEvent.click(screen.getByRole('button', { name: 'Search the Bible' }));
    await expect(screen.getByRole('textbox')).toHaveValue('');
    const recents = within(screen.getByRole('region', { name: 'Recent Searches' }));
    await waitFor(() => expect(recents.getByRole('button', { name: 'angels' })).toBeVisible());
    await userEvent.click(screen.getByRole('button', { name: 'Close search' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Search the Bible' })).toHaveFocus(),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Search the Bible' }));
    await expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-modal', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: 'Search the Bible' })).not.toBeInTheDocument(),
    );
  },
};

export const EmptyResults: Story = {
  ...OpenTrending,
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/search-verses', () =>
          HttpResponse.json({ verses: [{ reference: 'JHN.1' }], did_you_mean: [] }),
        ),
        ...globalHandlers,
      ],
    },
  },
  play: async (context) => {
    await OpenTrending.play?.(context);
    await userEvent.type(screen.getByRole('textbox'), 'no matches{Enter}');
    await waitFor(() =>
      expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument(),
    );
    await expect(screen.getByRole('status')).toBeVisible();
    await expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await expect(screen.getByRole('textbox')).toHaveValue('no matches');
  },
};

export const SearchLoading: Story = {
  ...OpenTrending,
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/search-verses', async () => {
          await delay('infinite');
          return HttpResponse.json({ verses: [], did_you_mean: [] });
        }),
        ...globalHandlers,
      ],
    },
  },
  play: async (context) => {
    await OpenTrending.play?.(context);
    await userEvent.type(screen.getByRole('textbox'), 'patience{Enter}');
    await expect(screen.getByRole('status', { name: 'Loading' })).toBeVisible();
    await expect(screen.getByRole('button', { name: 'Back to search' })).toBeEnabled();
  },
};

export const VersePreviewsLoading: Story = {
  ...OpenTrending,
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/search-verses', async () => {
          await delay(500);
          return HttpResponse.json({
            verses: [{ reference: 'JHN.3.16' }],
            did_you_mean: [],
          });
        }),
        http.get('*/v1/bibles/:versionId/passages/:passageId', async ({ request }) => {
          if (new URL(request.url).searchParams.get('format') !== 'text') return;
          await delay('infinite');
          return HttpResponse.json({});
        }),
        ...globalHandlers,
      ],
    },
  },
  play: async (context) => {
    await OpenTrending.play?.(context);
    await Promise.all(
      screen
        .getByRole('dialog')
        .getAnimations()
        .map((animation) => animation.finished),
    );
    await userEvent.type(screen.getByRole('textbox'), 'love{Enter}');
    const searchSpinnerTop = screen
      .getByRole('status', { name: 'Loading' })
      .parentElement!.getBoundingClientRect().top;
    await waitFor(() =>
      expect(screen.getByRole('dialog').querySelector('li[hidden]')).not.toBeNull(),
    );
    await expect(screen.getAllByRole('status', { name: 'Loading' })).toHaveLength(1);
    await expect(
      screen.getByRole('status', { name: 'Loading' }).parentElement!.getBoundingClientRect().top,
    ).toBe(searchSpinnerTop);
    await expect(
      within(screen.getByRole('dialog')).queryByRole('button', { name: /John 3:16/i }),
    ).not.toBeInTheDocument();
  },
};

export const TestamentFilters: Story = {
  ...OpenTrending,
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/search-verses', ({ request }) => {
          const next = new URL(request.url).searchParams.has('page_token');
          return HttpResponse.json({
            verses: [{ reference: next ? 'GEN.1.1' : 'JHN.3.16' }],
            did_you_mean: [],
            next_page_token: next ? null : 'second',
          });
        }),
        http.get('*/v1/bibles/111/passages/GEN.1.1', () =>
          HttpResponse.json({
            id: 'GEN.1.1',
            reference: 'Genesis 1:1',
            content: 'In the beginning God created the heavens and the earth.',
          }),
        ),
        ...globalHandlers,
      ],
    },
  },
  play: async (context) => {
    await OpenTrending.play?.(context);
    await userEvent.type(screen.getByRole('textbox'), 'love{Enter}');
    await waitFor(() => expect(screen.getByRole('button', { name: /John 3:16/i })).toBeVisible());
    await expect(screen.getByRole('button', { name: 'Filters' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await userEvent.click(screen.getByRole('button', { name: 'Old Testament' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Genesis 1:1/i })).toBeVisible());
    await expect(screen.queryByRole('button', { name: /John 3:16/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'New Testament' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /John 3:16/i })).toBeVisible());
    await expect(screen.queryByRole('button', { name: /Genesis 1:1/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Back to search' }));
    await expect(screen.getByRole('textbox')).toHaveValue('');
    await expect(screen.getByRole('textbox')).toHaveFocus();
    await expect(screen.getByRole('button', { name: 'Close search' })).toBeVisible();
    await expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  },
};
