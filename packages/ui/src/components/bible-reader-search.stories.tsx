import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';
import { BibleReader } from './bible-reader';
import { useContext, useState } from 'react';
import {
  YouVersionContext,
  type BibleSearchPhase,
  type BibleSearchResult,
  type UseBibleSearchResult,
} from '@youversion/platform-react-hooks';
import { BibleReaderNavigation } from './bible-reader-navigation';
import { Button } from './ui/button';
import { delay, http, HttpResponse } from 'msw';
import { globalHandlers } from '@/test/mocks/handlers';
import mockPassages from '@/test/mock-data/passages.json';
import { waitForShadowContent, waitForShadowRoot } from '@/test/storybook-dom';

const meta = {
  title: 'Components/BibleReaderSearch',
  component: BibleReader.Root,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof BibleReader.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

async function getReaderStory(canvasElement: HTMLElement) {
  const root = await waitForShadowRoot(canvasElement);
  const content = await waitForShadowContent(root);
  return { root, reader: within(content) };
}

async function getOpenSearch(canvasElement: HTMLElement) {
  const { root, reader } = await getReaderStory(canvasElement);
  const overlay = await waitFor(() => {
    const element = [...root.querySelectorAll<HTMLElement>('[data-yv-shadow-local-overlay]')].find(
      (candidate) => candidate.querySelector('[role="dialog"][data-state="open"]'),
    );
    if (!element) throw new Error('reader search overlay not mounted');
    return element;
  });
  return { root, reader, search: within(overlay) };
}

async function typeInShadowInput(input: HTMLElement, text: string) {
  const submit = text.endsWith('{Enter}');
  const value = submit ? text.slice(0, -'{Enter}'.length) : text;
  // Storybook user-event resolves document.activeElement to the shadow host,
  // so its keyboard helpers cannot type into this shadow-local controlled input.
  await fireEvent.change(input, { target: { value } });
  if (submit) {
    // Wait for React to commit the controlled value before Enter reads it.
    const inputRoot = input.getRootNode();
    if (!(inputRoot instanceof ShadowRoot)) throw new Error('search input is not shadow-local');
    await waitFor(() =>
      expect(inputRoot.querySelector('button[aria-label="Clear search"]')).toBeVisible(),
    );
    await fireEvent.keyDown(input, { key: 'Enter' });
  }
}

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
    const { root, reader } = await getReaderStory(canvasElement);
    await waitFor(
      async () => {
        const verseContainer = root.querySelector('[data-slot="yv-bible-renderer"]');
        await expect(verseContainer).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const searchButton = await waitFor(
      () => reader.getByRole('button', { name: 'Search the Bible' }),
      { timeout: 5000 },
    );
    await userEvent.click(searchButton);

    const { search } = await getOpenSearch(canvasElement);
    await waitFor(async () => {
      await expect(
        within(search.getByRole('region', { name: 'Trending Searches' })).getByRole('button', {
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
    const { root } = await getReaderStory(canvasElement);
    let focused: HTMLElement | null = null;
    await waitFor(
      async () => {
        focused = root.querySelector<HTMLElement>('.yv-v-focused[v="51"]');
        await expect(focused).not.toBeNull();
      },
      { timeout: 5000 },
    );
    const scroller = root.querySelector<HTMLElement>('main');
    await expect(scroller).not.toBeNull();
    const bounds = focused!.getBoundingClientRect();
    const viewport = scroller!.getBoundingClientRect();
    await expect(bounds.top).toBeGreaterThanOrEqual(viewport.top);
    await expect(bounds.bottom).toBeLessThanOrEqual(viewport.bottom);
    await expect(root.activeElement).toBe(focused);
    // A pointer left over the verse can apply its ordinary hover background.
    await userEvent.unhover(focused!);
    const surrounding = root.querySelector<HTMLElement>('.yv-v[v="50"]')!;
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
    const { search } = await getOpenSearch(context.canvasElement);
    await userEvent.click(
      within(search.getByRole('region', { name: 'Trending Searches' })).getByRole('button', {
        name: 'love',
      }),
    );
    await expect(await search.findByRole('alert')).toBeVisible();
    await expect(search.getByRole('button', { name: 'Try again' })).toBeEnabled();
    await expect(search.getByRole('button', { name: 'Back to search' })).toBeEnabled();
  },
};

const searchResult: BibleSearchResult = {
  id: 'JHN.1.51',
  book: 'JHN',
  chapter: '1',
  verses: [51],
};

function useSearchStoryFixture(): UseBibleSearchResult {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState<BibleSearchPhase>({
    kind: 'trending',
    queries: [{ text: 'love' }],
    loading: false,
  });
  const selectSuggestion = (text: string): void => {
    setQuery(text);
    setPhase({ kind: 'results', verses: [searchResult], nextPage: 'none' });
  };
  return {
    query,
    phase,
    setQuery,
    submit: () => selectSuggestion(query),
    selectSuggestion,
    loadMore: () => undefined,
    retry: () => undefined,
  };
}

function SearchJourneyToolbar() {
  const context = useContext(YouVersionContext);
  if (context === null) throw new Error('Search story requires YouVersionProvider');
  return (
    <YouVersionContext.Provider
      value={{
        ...context,
        hookOverrides: {
          ...context.hookOverrides,
          useBibleSearch: useSearchStoryFixture,
          usePassage: () => ({
            passage: mockPassages['JHN.1.51'],
            loading: false,
            error: null,
            refetch: () => undefined,
          }),
        },
      }}
    >
      <BibleReader.Toolbar />
    </YouVersionContext.Provider>
  );
}

export const SearchAndReturn: Story = {
  ...OpenTrending,
  tags: ['integration', 'shadow-dom', 'cross-browser'],
  render: (args) => (
    <div className="yv:grid yv:h-screen yv:grid-rows-[auto_1fr] yv:bg-background">
      <button type="button" data-testid="outside-reader-control">
        Outside reader
      </button>
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <SearchJourneyToolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async (context) => {
    const { root, reader } = await getReaderStory(context.canvasElement);
    const trigger = await reader.findByRole('button', { name: 'Search the Bible' });
    await userEvent.click(trigger);
    const { search } = await getOpenSearch(context.canvasElement);
    await expect(root.activeElement).toBe(
      await search.findByRole('textbox', { name: 'Search the Bible' }),
    );
    const trending = within(search.getByRole('region', { name: 'Trending Searches' }));
    await userEvent.click(trending.getByRole('button', { name: 'love' }));
    const result = await search.findByRole(
      'button',
      { name: /(?:John 1:51|JHN\.1\.51)/i },
      { timeout: 20000 },
    );
    await userEvent.click(result);
    await waitFor(() => expect(search.queryByRole('dialog')).not.toBeInTheDocument());
    const destinationVerse = root.querySelector<HTMLElement>('.yv-v[v="51"]');
    await waitFor(() => expect(root.activeElement).toBe(destinationVerse));

    await userEvent.click(trigger);
    const { search: reopenedSearch } = await getOpenSearch(context.canvasElement);
    await userEvent.click(reopenedSearch.getByRole('button', { name: 'Close search' }));
    await waitFor(() => expect(root.activeElement).toBe(trigger));

    const outsideControl = context.canvasElement.querySelector<HTMLButtonElement>(
      '[data-testid="outside-reader-control"]',
    );
    if (!destinationVerse || !outsideControl) throw new Error('focus regression controls missing');
    outsideControl.focus();
    await userEvent.click(destinationVerse);
    const verseActions = await waitFor(() => {
      const element = root.querySelector<HTMLElement>(
        '[data-slot="verse-action-popover"][data-state="open"]',
      );
      if (!element) throw new Error('verse actions did not open');
      return element;
    });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(verseActions).not.toBeInTheDocument());
    await expect(context.canvasElement.ownerDocument.activeElement).toBe(outsideControl);
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
    const { search } = await getOpenSearch(context.canvasElement);
    await typeInShadowInput(search.getByRole('textbox'), 'no matches{Enter}');
    await waitFor(() =>
      expect(search.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument(),
    );
    await expect(search.getByRole('status')).toBeVisible();
    await expect(search.queryByRole('alert')).not.toBeInTheDocument();
    await expect(search.getByRole('textbox')).toHaveValue('no matches');
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
    const { search } = await getOpenSearch(context.canvasElement);
    await typeInShadowInput(search.getByRole('textbox'), 'patience{Enter}');
    await expect(search.getByRole('status', { name: 'Loading' })).toBeVisible();
    await expect(search.getByRole('button', { name: 'Back to search' })).toBeEnabled();
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
    const { search } = await getOpenSearch(context.canvasElement);
    await Promise.all(
      search
        .getByRole('dialog')
        .getAnimations()
        .map((animation) => animation.finished),
    );
    await typeInShadowInput(search.getByRole('textbox'), 'love{Enter}');
    const searchSpinnerTop = search
      .getByRole('status', { name: 'Loading' })
      .parentElement!.getBoundingClientRect().top;
    await waitFor(() =>
      expect(search.getByRole('dialog').querySelector('li[hidden]')).not.toBeNull(),
    );
    await expect(search.getAllByRole('status', { name: 'Loading' })).toHaveLength(1);
    await expect(
      search.getByRole('status', { name: 'Loading' }).parentElement!.getBoundingClientRect().top,
    ).toBe(searchSpinnerTop);
    await expect(
      within(search.getByRole('dialog')).queryByRole('button', { name: /John 3:16/i }),
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
    const { root, search } = await getOpenSearch(context.canvasElement);
    await typeInShadowInput(search.getByRole('textbox'), 'love{Enter}');
    await waitFor(() => expect(search.getByRole('button', { name: /John 3:16/i })).toBeVisible());
    await expect(search.getByRole('button', { name: 'Filters' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await userEvent.click(search.getByRole('button', { name: 'Filters' }));
    await userEvent.click(search.getByRole('button', { name: 'Old Testament' }));
    await waitFor(() => expect(search.getByRole('button', { name: /Genesis 1:1/i })).toBeVisible());
    await expect(search.queryByRole('button', { name: /John 3:16/i })).not.toBeInTheDocument();
    await userEvent.click(search.getByRole('button', { name: 'New Testament' }));
    await waitFor(() => expect(search.getByRole('button', { name: /John 3:16/i })).toBeVisible());
    await expect(search.queryByRole('button', { name: /Genesis 1:1/i })).not.toBeInTheDocument();
    await userEvent.click(search.getByRole('button', { name: 'Back to search' }));
    await expect(search.getByRole('textbox')).toHaveValue('');
    await expect(root.activeElement).toBe(search.getByRole('textbox'));
    await expect(search.getByRole('button', { name: 'Close search' })).toBeVisible();
    await expect(search.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  },
};
