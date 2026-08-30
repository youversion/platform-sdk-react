import { expandPassageId } from '@/lib/highlight-projection';
import { INTER_FONT, SOURCE_SERIF_FONT, UNTITLED_SERIF_FONT } from '@/lib/verse-html-utils';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { Highlight } from '@youversion/platform-core';
import { delay, http, HttpResponse } from 'msw';
import { useState } from 'react';
import { expect, fn, screen, spyOn, userEvent, waitFor } from 'storybook/test';
import mockBibles from '../test/mock-data/bibles.json';
import { globalHandlers } from '../test/mocks/handlers';
import { setupAuthenticatedUser } from '../test/utils';
import {
  BibleReader,
  type BibleReaderHighlightIntent,
  type BibleReaderRootProps,
} from './bible-reader';

type PathParams = {
  id?: string | readonly string[];
  usfm?: string | readonly string[];
};

function isPathParamText(value: string | readonly string[] | undefined): value is string {
  return Object.prototype.toString.call(value) === '[object String]';
}

function firstPathParam(value: string | readonly string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (isPathParamText(value)) return value;
  return value[0];
}

let signInMock: ReturnType<typeof fn>;

const meta: Meta<typeof BibleReader.Root> = {
  title: 'Components/BibleReader',
  component: BibleReader.Root,
  parameters: {
    layout: 'fullscreen',
  },
  beforeEach: async () => {
    localStorage.clear();

    const { YouVersionAPIUsers } = await import('@youversion/platform-core');

    signInMock = fn().mockImplementation(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      return {
        accessToken: 'mock-token',
        errorMsg: null,
        yvpUserId: 'mock-user-id',
      };
    });

    spyOn(YouVersionAPIUsers, 'signIn')
      .mockImplementation(signInMock)
      .mockName('YouVersionAPIUsers.signIn');
  },
  argTypes: {
    versionId: {
      control: 'number',
      description: 'The Bible version ID to display',
    },
    fontSize: {
      control: { type: 'range', min: 8, max: 24, step: 1 },
      description: 'Font size in pixels',
    },
    lineSpacing: {
      control: 'select',
      options: [1.45, 1.7, 2.0],
      description: 'Line spacing (line-height multiplier)',
    },
    fontFamily: {
      control: 'select',
      options: [UNTITLED_SERIF_FONT, INTER_FONT],
      description: 'Font family',
    },
    showVerseNumbers: {
      control: 'boolean',
      description: 'Show verse numbers',
    },
    background: {
      table: { disable: true },
    },
  },
};

export default meta;
type Story = StoryObj<typeof BibleReader.Root>;

/**
 * Default uncontrolled story: Component manages its own state with John 1 NIV as default
 */
export const Default: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    lineSpacing: 1.7,
    fontFamily: INTER_FONT,
    showVerseNumbers: true,
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

    const verseContainer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
    await expect(verseContainer).toBeInTheDocument();

    const themeContainer = canvasElement.querySelector('[data-yv-theme="light"]');
    await expect(themeContainer).toBeInTheDocument();

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    await userEvent.click(settingsButton);

    await waitFor(async () => {
      await expect(await screen.findByText('Reader Settings')).toBeInTheDocument();
    });

    const fontButtons = screen.getAllByRole('button', { name: /font/i });
    await expect(fontButtons.length).toBe(4);

    const decreaseFontButton = screen.getByTestId('decrease-font-size');
    const increaseFontButton = screen.getByTestId('increase-font-size');

    await userEvent.click(increaseFontButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-size')).toBe('18');
    await userEvent.click(increaseFontButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-size')).toBe('20');
    await expect(increaseFontButton).toBeDisabled();

    await userEvent.click(decreaseFontButton);
    await userEvent.click(decreaseFontButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-size')).toBe('16');
    await userEvent.click(decreaseFontButton);
    await userEvent.click(decreaseFontButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-size')).toBe('12');
    await expect(decreaseFontButton).toBeDisabled();

    const interButton = screen.getByRole('button', { name: /inter/i });
    const untitledSerifButton = screen.getByRole('button', { name: /untitled/i });

    await userEvent.click(untitledSerifButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe(
      UNTITLED_SERIF_FONT,
    );

    await userEvent.click(interButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe(INTER_FONT);
  },
};

export const VerseActionPointerInteractions: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    lineSpacing: 1.7,
    fontFamily: INTER_FONT,
    showVerseNumbers: true,
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/fonts/1/stylesheet', () =>
          HttpResponse.text('', { headers: { 'Content-Type': 'text/css' } }),
        ),
        ...globalHandlers,
      ],
    },
  },
  render: (args) => (
    <div className="yv:grid yv:h-screen yv:grid-rows-[auto_1fr] yv:bg-background">
      <button type="button" data-testid="outside-reader-control">
        Outside reader
      </button>
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const firstVerse = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>('.yv-v[v="1"]');
      if (!element) throw new Error('first verse not rendered');
      return element;
    });
    const secondVerse = canvasElement.querySelector<HTMLElement>('.yv-v[v="2"]');
    const secondVerseLabel = secondVerse?.querySelector<HTMLElement>('.yv-vlbl');
    const outsideControl = canvasElement.querySelector<HTMLButtonElement>(
      '[data-testid="outside-reader-control"]',
    );
    if (!secondVerse || !secondVerseLabel || !outsideControl)
      throw new Error('reader interaction controls not rendered');

    await userEvent.click(firstVerse);
    const dialog = await screen.findByRole('dialog');

    await userEvent.click(secondVerseLabel);
    await expect(firstVerse).toHaveClass('yv-v-selected');
    await expect(secondVerse).toHaveClass('yv-v-selected');
    await expect(dialog).toBeInTheDocument();

    await userEvent.pointer({ keys: '[MouseLeft>]', target: outsideControl });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await expect(firstVerse).not.toHaveClass('yv-v-selected');
    await expect(secondVerse).not.toHaveClass('yv-v-selected');
    await userEvent.pointer({ keys: '[/MouseLeft]', target: outsideControl });
  },
};

/**
 * Dark theme
 */
export const DarkTheme: Story = {
  args: {
    defaultVersionId: 111,
    fontSize: 16,
    lineSpacing: 1.7,
    fontFamily: INTER_FONT,
    showVerseNumbers: true,
  },
  globals: {
    theme: 'dark',
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
};

/**
 * Custom styling with larger font and increased line height
 */
export const CustomStyling: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    fontSize: 18,
    lineSpacing: 2.0,
    fontFamily: UNTITLED_SERIF_FONT,
    showVerseNumbers: false,
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
      <BibleReader.Root {...args}>
        <BibleReader.Toolbar border="bottom" />
        <BibleReader.Content />
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

    await expect(localStorage.getItem('youversion-platform:reader:font-size')).toBe('18');
  },
};

export const FontSizeOutOfRange: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    fontSize: 28,
    lineSpacing: 2.0,
    fontFamily: UNTITLED_SERIF_FONT,
    showVerseNumbers: false,
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
      <BibleReader.Root {...args}>
        <BibleReader.Toolbar border="bottom" />
        <BibleReader.Content />
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

    await expect(localStorage.getItem('youversion-platform:reader:font-size')).toBe('16');
  },
};

export const RealAPI: Story = {
  args: {
    defaultVersionId: 111,
  },
  parameters: {
    msw: {
      handlers: null,
    },
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
};

export const FootnotesPersistAfterFontSizeChange: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    book: 'JHN',
    chapter: '1',
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
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

    const getFootnoteButtons = () => canvasElement.querySelectorAll('[data-verse-footnote] button');

    await waitFor(
      async () => {
        const footnoteButtons = getFootnoteButtons();
        await expect(footnoteButtons.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const initialFootnoteCount = getFootnoteButtons().length;

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    await userEvent.click(settingsButton);

    await waitFor(async () => {
      await expect(await screen.findByText('Reader Settings')).toBeInTheDocument();
    });

    const increaseFontButton = screen.getByTestId('increase-font-size');
    await userEvent.click(increaseFontButton);

    await waitFor(async () => {
      const footnoteButtons = getFootnoteButtons();
      await expect(footnoteButtons.length).toBe(initialFootnoteCount);
    });

    const decreaseFontButton = screen.getByTestId('decrease-font-size');
    await userEvent.click(decreaseFontButton);
    await userEvent.click(decreaseFontButton);

    await waitFor(async () => {
      const footnoteButtons = getFootnoteButtons();
      await expect(footnoteButtons.length).toBe(initialFootnoteCount);
    });
  },
};

export const ThemeOverridesProvider: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    book: 'JHN',
    chapter: '1',
    background: 'light',
  },
  globals: {
    theme: 'dark',
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
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

    const readerTheme = canvasElement.querySelector('[data-yv-theme="light"]');
    await expect(readerTheme).toBeInTheDocument();

    await waitFor(
      async () => {
        const footnoteButton = canvasElement.querySelector('[data-verse-footnote] button');
        await expect(footnoteButton).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const footnoteButton = canvasElement.querySelector('[data-verse-footnote] button');
    await expect(footnoteButton?.closest('[data-yv-theme="light"]')).toBeInTheDocument();

    await userEvent.click(footnoteButton!);

    await waitFor(async () => {
      const popover = document.querySelector('[data-slot="popover-content"]');
      await expect(popover).toBeInTheDocument();
      await expect(popover?.closest('[data-yv-theme="light"]')).toBeInTheDocument();
    });
  },
};

export const SignInFlow: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    book: 'JHN',
    chapter: '1',
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async () => {
    await waitFor(
      async () => {
        const userMenuTrigger = screen.getByTestId('user-menu-trigger');
        await expect(userMenuTrigger).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const userMenuTrigger = screen.getByTestId('user-menu-trigger');
    await expect(userMenuTrigger.querySelector('img')).not.toBeInTheDocument();

    await userEvent.click(userMenuTrigger);

    await waitFor(async () => {
      const signInButton = await screen.findByRole('button', { name: /sign in/i });
      await expect(signInButton).toBeInTheDocument();
    });

    const signInButton = screen.getByRole('button', { name: /sign in/i });
    await userEvent.click(signInButton);

    await expect(signInMock).toHaveBeenCalled();
  },
};

export const SignOutFlow: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    book: 'JHN',
    chapter: '1',
  },
  beforeEach: async () => {
    localStorage.clear();
    await setupAuthenticatedUser({
      avatarUrl: 'https://example.com/avatar/{width}/{height}.jpg',
    });
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async () => {
    await waitFor(
      async () => {
        const userMenuTrigger = screen.getByTestId('user-menu-trigger');
        await expect(userMenuTrigger).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const userMenuTrigger = screen.getByTestId('user-menu-trigger');

    await waitFor(async () => {
      const avatar = userMenuTrigger.querySelector('[data-slot="avatar"]');
      await expect(avatar).toBeInTheDocument();
    });

    await userEvent.click(userMenuTrigger);

    await waitFor(async () => {
      const signOutButton = await screen.findByRole('button', { name: /sign out/i });
      await expect(signOutButton).toBeInTheDocument();
    });

    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    await userEvent.click(signOutButton);

    await waitFor(async () => {
      const userMenuTriggerAfterSignOut = screen.getByTestId('user-menu-trigger');
      await expect(userMenuTriggerAfterSignOut.querySelector('img')).not.toBeInTheDocument();
    });
  },
};

export const AuthenticatedWithAvatar: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    book: 'JHN',
    chapter: '1',
  },
  beforeEach: async () => {
    localStorage.clear();
    await setupAuthenticatedUser({
      avatarUrl: 'https://notion-avatar.app/image/avatar-1.jpg',
    });
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async () => {
    await waitFor(
      async () => {
        const userMenuTrigger = screen.getByTestId('user-menu-trigger');
        await expect(userMenuTrigger).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const userMenuTrigger = screen.getByTestId('user-menu-trigger');

    // Radix only renders the <img> once it loads successfully.
    await waitFor(async () => {
      const avatar = userMenuTrigger.querySelector('img');
      await expect(avatar).toBeInTheDocument();
      await expect(avatar?.getAttribute('src')).toContain('notion-avatar.app/image/avatar-1.jpg');
    });
  },
};

export const LoadsSavedPreferencesFromLocalStorage: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    book: 'JHN',
    chapter: '1',
  },
  beforeEach: () => {
    localStorage.clear();
    // Pre-populate localStorage with saved preferences. The font family is the
    // legacy Source Serif stack, so this story also covers the hydrate-time
    // migration to Untitled Serif.
    localStorage.setItem('youversion-platform:reader:font-size', '18');
    localStorage.setItem('youversion-platform:reader:font-family', SOURCE_SERIF_FONT);
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
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

    // Verify the saved settings were applied via CSS variables
    const verseContainer = canvasElement.querySelector<HTMLElement>(
      '[data-slot="yv-bible-renderer"]',
    )!;
    await expect(verseContainer.style.getPropertyValue('--yv-reader-font-size')).toBe('18px');
    // The legacy Source Serif value seeded above is migrated forward on hydrate.
    await expect(verseContainer.style.getPropertyValue('--yv-reader-font-family')).toBe(
      UNTITLED_SERIF_FONT,
    );
    await expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe(
      UNTITLED_SERIF_FONT,
    );

    // Open settings and verify the correct font family button is active
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    await userEvent.click(settingsButton);

    await waitFor(async () => {
      await expect(await screen.findByText('Reader Settings')).toBeInTheDocument();
    });

    const untitledSerifButton = screen.getByRole('button', { name: /untitled/i });
    await expect(untitledSerifButton).toHaveClass('yv:bg-primary');

    const interButton = screen.getByRole('button', { name: /inter/i });
    await expect(interButton).not.toHaveClass('yv:bg-primary');
  },
};

export const AuthenticatedWithoutAvatar: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    book: 'JHN',
    chapter: '1',
  },
  beforeEach: async () => {
    localStorage.clear();
    await setupAuthenticatedUser();
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async () => {
    await waitFor(
      async () => {
        const userMenuTrigger = screen.getByTestId('user-menu-trigger');
        await expect(userMenuTrigger).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const userMenuTrigger = screen.getByTestId('user-menu-trigger');
    // No image URL → initials fallback ("Test User" → "TU") inside the avatar circle.
    await expect(userMenuTrigger.querySelector('img')).not.toBeInTheDocument();
    await waitFor(async () => {
      const fallback = userMenuTrigger.querySelector('[data-slot="avatar-fallback"]');
      await expect(fallback).toBeInTheDocument();
      await expect(fallback).toHaveTextContent('TU');
    });

    await userEvent.click(userMenuTrigger);

    await waitFor(async () => {
      const signOutButton = await screen.findByRole('button', { name: /sign out/i });
      await expect(signOutButton).toBeInTheDocument();
    });
  },
};

/**
 * Tests that BibleReader works without auth enabled in the provider.
 * The user menu should not be visible when auth is disabled.
 */
export const WithoutAuth: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    book: 'JHN',
    chapter: '1',
  },
  parameters: {
    includeAuth: false,
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Wait for the Bible content to load
    await waitFor(
      async () => {
        const verseContainer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
        await expect(verseContainer).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Verify Bible content is displayed
    const verseContainer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
    await expect(verseContainer).toBeInTheDocument();

    // User menu should not be visible when auth is disabled
    const userMenuTrigger = canvasElement.querySelector('[data-testid="user-menu-trigger"]');
    await expect(userMenuTrigger).not.toBeInTheDocument();

    // Chapter picker and version picker should still work
    const chapterButton = screen.getByRole('button', { name: /change bible book and chapter/i });
    await expect(chapterButton).toBeInTheDocument();

    const versionButton = await screen.findByRole('button', { name: /bible version/i });
    await expect(versionButton).toBeInTheDocument();

    // Settings should still work
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    await expect(settingsButton).toBeInTheDocument();
  },
};

/**
 * Tests that the Bible version button in the toolbar shows a loading spinner
 * initially and then transitions to showing the version abbreviation once loaded.
 */
export const VersionButtonLoadingStates: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    book: 'JHN',
    chapter: '1',
  },
  parameters: {
    msw: {
      handlers: [
        // Delay the version endpoint so the loading state is reliably observable
        http.get('*/v1/bibles/:id', async ({ params }: { params: PathParams }) => {
          await delay(1000);
          const id = firstPathParam(params.id);
          if (!id) return new HttpResponse(null, { status: 404 });
          const bible =
            Object.entries(mockBibles.individual).find(([key]) => key === id)?.[1] ??
            mockBibles.collections.default.data.find((b) => b.id === Number(id));
          if (bible) return HttpResponse.json(bible);
          return new HttpResponse(null, { status: 404 });
        }),
      ],
    },
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async () => {
    // Wait for the toolbar to mount, then capture the button in loading state
    const versionButton = await screen.findByRole('button', { name: /bible version/i });

    // The delayed MSW handler guarantees the loading state is visible
    const spinner = versionButton.querySelector('[role="status"]');
    await expect(spinner).toBeInTheDocument();
    await expect(versionButton).toBeDisabled();
    await expect(versionButton).toHaveAttribute('aria-label', 'Loading Bible version');

    // After loading completes, the button should show the version abbreviation (e.g. "NIV")
    await waitFor(
      async () => {
        await expect(versionButton).not.toBeDisabled();
        // Spinner should be gone
        await expect(versionButton.querySelector('[role="status"]')).not.toBeInTheDocument();
        // aria-label should switch to "Change" once loaded
        await expect(versionButton).toHaveAttribute('aria-label', 'Change Bible version');
        // Should display the abbreviation text
        await expect(versionButton.textContent).toMatch(/[A-Z]{2,}/);
      },
      { timeout: 5000 },
    );
  },
};

/**
 * Tests that a rich intro chapter (Joshua) renders correctly with real-world content
 * including structured sections (At a Glance, Purpose, Major Themes), italic spans,
 * bold-italic spans, and special formatting classes (imt1, imt2, is, ili, ip, etc.).
 * All intro content should render correctly.
 */
export const JoshuaIntroChapter: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 1849,
    book: 'JOS',
    chapter: 'INTRO',
  },
  render: (args) => (
    <div data-yv-sdk className="yv:h-screen">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Wait for the intro content to fully load (not just the renderer element)
    await waitFor(
      async () => {
        const verseContainer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
        await expect(verseContainer).toBeInTheDocument();
        await expect(verseContainer?.textContent).toContain('Joshua');
      },
      { timeout: 5000 },
    );

    const verseContainer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]')!;

    // The unavailable message should not appear
    const hasUnavailableText = verseContainer.textContent?.includes('not available');
    await expect(hasUnavailableText).not.toBeTruthy();

    // Verify key intro content rendered — title and structured sections
    await expect(verseContainer.textContent).toContain('Introduction');
    await expect(verseContainer.textContent).toContain('At a Glance');
    await expect(verseContainer.textContent).toContain('Traditionally Joshua');
    await expect(verseContainer.textContent).toContain('Purpose');
    await expect(verseContainer.textContent).toContain('Major Themes');

    // Verify structured list items rendered (ili class content)
    await expect(verseContainer.textContent).toContain('Entering the Land');
    await expect(verseContainer.textContent).toContain('Conquering the Land');
    await expect(verseContainer.textContent).toContain('Dividing the Land');

    // Verify paragraph content rendered (ip class)
    await expect(verseContainer.textContent).toContain(
      'wilderness wanderers to courageous conquerors',
    );

    // Verify special formatting rendered (bdit = bold-italic, nd = divine name)
    await expect(verseContainer.textContent).toContain('The Land of Promise');
    await expect(verseContainer.textContent).toContain('Covenant and Obedience');
    await expect(verseContainer.textContent).toContain('The Typology of Jesus');
    await expect(verseContainer.textContent).toContain('Yahweh');

    // Toolbar trigger should show "Intro" (title-case label), NOT "INTRO" (raw chapter ID)
    await waitFor(
      async () => {
        const chapterButton = screen.getByRole('button', {
          name: /change bible book and chapter/i,
        });
        await expect(chapterButton.textContent).toContain('Intro');
        await expect(chapterButton.textContent).not.toContain('INTRO');
      },
      { timeout: 5000 },
    );

    // Verify intro footnotes render as clickable buttons
    const footnoteButton = verseContainer.querySelector('[data-verse-footnote^="intro-"] button');
    await expect(footnoteButton).toBeInTheDocument();

    // Click the footnote and verify the popover shows note content without verse reference
    await userEvent.click(footnoteButton!);

    await waitFor(async () => {
      const popover = document.querySelector('[role="dialog"]');
      await expect(popover).toBeInTheDocument();

      // Should show note content (e.g., "See Rashi")
      await expect(popover?.textContent).toContain('See Rashi');

      // Should NOT show a verse reference like "Joshua :intro-0"
      await expect(popover?.textContent).not.toContain('intro-0');
    });
  },
};

/**
 * Controlled mode (YPE-3705): the host supplies highlight data via the
 * `highlights` prop (core API shape, including range USFMs) and receives
 * intent events; the reader performs no highlight persistence. Tweak the
 * `highlights` arg and watch the paint follow; select verses and tap colors to
 * see `onVerseSelect` / `onHighlightApply` / `onHighlightRemove` in the
 * Actions panel. Note: taps paint nothing here — there is no host echoing the
 * intents back (see `ControlledFakeHost` for the round-trip).
 */
export const Controlled: Story = {
  args: {
    defaultVersionId: 111,
    defaultBook: 'JHN',
    defaultChapter: '1',
    highlights: [
      { version_id: 111, passage_id: 'JHN.1.1', color: 'fffe00' },
      { version_id: 111, passage_id: 'JHN.1.3-5', color: '5dff79' },
    ],
    onVerseSelect: fn(),
    onHighlightApply: fn(),
    onHighlightRemove: fn(),
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background">
      <BibleReader.Root {...args}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
};

/**
 * Splits a stored highlight into per-verse entries so it can be matched
 * against an intent's per-verse `passageIds`. API data may hold range USFMs
 * (`JHN.1.3-5`); matching those as opaque strings would silently miss, and a
 * partial removal (one verse out of a range) must split the range, not drop
 * it. Unexpandable ids pass through untouched.
 */
const toPerVerse = (h: Highlight): Highlight[] => {
  const expanded = expandPassageId(h.passage_id);
  if (!expanded) return [h];
  return expanded.verses.map((verse) => ({
    version_id: h.version_id,
    passage_id: `${expanded.book}.${expanded.chapter}.${verse}`,
    color: h.color,
  }));
};

/** True when a per-verse stored entry is covered by an intent's verses. */
const matchesIntent = (h: Highlight, intent: BibleReaderHighlightIntent) =>
  h.version_id === intent.versionId && intent.passageIds.includes(h.passage_id);

/**
 * Controlled mode with a stateful fake host that echoes `onHighlightApply` /
 * `onHighlightRemove` back into the `highlights` prop — the executable
 * reference implementation of the round-trip contract for native hosts
 * (RN Expo, YPE-3710). Selecting verses and tapping a color paints only via
 * the prop update; tapping an X circle un-paints the same way.
 */
export const ControlledFakeHost: Story = {
  name: 'Controlled (fake host)',
  args: {
    defaultVersionId: 111,
    defaultBook: 'JHN',
    defaultChapter: '1',
    onVerseSelect: fn(),
    onHighlightApply: fn(),
    onHighlightRemove: fn(),
  },
  render: function FakeHostStory(args: BibleReaderRootProps) {
    // The host's own highlight store. A real native host owns this in its data
    // layer (with the API, cache, and optimism behind it); the reader only ever
    // sees the resulting array. Seeded with a range USFM on purpose — API data
    // can hold ranges, and intents are per-verse, so every write normalizes the
    // store through `toPerVerse` before matching.
    const [highlights, setHighlights] = useState<Highlight[]>([
      { version_id: 111, passage_id: 'JHN.1.1', color: 'fffe00' },
      { version_id: 111, passage_id: 'JHN.1.3-5', color: '5dff79' },
    ]);

    const handleApply = (intent: BibleReaderHighlightIntent) => {
      args.onHighlightApply?.(intent);
      setHighlights((prev) => [
        // Replace any existing entry for these verses (last write wins).
        ...prev.flatMap(toPerVerse).filter((h) => !matchesIntent(h, intent)),
        ...intent.passageIds.map((passage_id) => ({
          version_id: intent.versionId,
          passage_id,
          color: intent.color,
        })),
      ]);
    };

    const handleRemove = (intent: BibleReaderHighlightIntent) => {
      args.onHighlightRemove?.(intent);
      setHighlights((prev) => prev.flatMap(toPerVerse).filter((h) => !matchesIntent(h, intent)));
    };

    return (
      <div className="yv:h-screen yv:bg-background">
        <BibleReader.Root
          {...args}
          highlights={highlights}
          onHighlightApply={handleApply}
          onHighlightRemove={handleRemove}
        >
          <BibleReader.Content />
          <BibleReader.Toolbar />
        </BibleReader.Root>
      </div>
    );
  },
};

export const ChapterChangeLoadingOverlay: Story = {
  tags: ['integration'],
  args: {
    defaultVersionId: 111,
    defaultBook: 'JHN',
    defaultChapter: '1',
  },
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/bibles/111/passages/:usfm', async ({ params }: { params: PathParams }) => {
          await delay(800);
          const usfm = firstPathParam(params.usfm);
          if (!usfm) return new HttpResponse(null, { status: 404 });
          return HttpResponse.json({
            id: usfm,
            content: `<div class="p"><span class="verse">Passage text for ${usfm}.</span></div>`,
            reference: usfm,
          });
        }),
        ...globalHandlers,
      ],
    },
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
        const renderer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
        await expect(renderer?.textContent).toContain('JHN.1');
      },
      { timeout: 5000 },
    );

    const nextButton = screen.getByRole('button', { name: /next chapter/i });
    await userEvent.click(nextButton);

    const rendererAfterClick = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
    await expect(rendererAfterClick?.textContent).toContain('JHN.1');

    await waitFor(
      async () => {
        const overlay = canvasElement.querySelector('[aria-label="Loading passage"]');
        await expect(overlay).toBeInTheDocument();
        await expect(overlay).toHaveAttribute('role', 'status');
        await expect(canvasElement.querySelector('[class*="opacity-40"]')).toBeInTheDocument();
        const renderer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
        await expect(renderer?.textContent).toContain('JHN.1');
      },
      { timeout: 2000 },
    );

    await waitFor(
      async () => {
        const renderer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
        await expect(renderer?.textContent).toContain('JHN.2');
        await expect(
          canvasElement.querySelector('[aria-label="Loading passage"]'),
        ).not.toBeInTheDocument();
        await expect(canvasElement.querySelector('[class*="opacity-40"]')).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const scroller = canvasElement.querySelector('main');
    await expect(scroller?.scrollTop).toBe(0);
  },
};
