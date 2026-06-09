import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, spyOn, userEvent, waitFor } from 'storybook/test';
import { http, HttpResponse, delay } from 'msw';
import { BibleReader } from './bible-reader';
import { setupAuthenticatedUser } from '../test/utils';
import { INTER_FONT, SOURCE_SERIF_FONT } from '@/lib/verse-html-utils';
import mockBibles from '../test/mock-data/bibles.json';
import { globalHandlers } from '../test/mocks/handlers';

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
      options: [SOURCE_SERIF_FONT, INTER_FONT, "'Georgia', serif", "'Nunito Sans', sans-serif"],
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
    fontFamily: "'Inter', sans-serif",
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
    await expect(fontButtons.length).toBe(2);

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
    const sourceSerifButton = screen.getByRole('button', { name: /source serif/i });

    await userEvent.click(sourceSerifButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe(
      SOURCE_SERIF_FONT,
    );

    await userEvent.click(interButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe(INTER_FONT);
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
    fontFamily: "'Inter', sans-serif",
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
    fontFamily: "'Nunito Sans', sans-serif",
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
    fontFamily: "'Nunito Sans', sans-serif",
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
      const avatar = userMenuTrigger.querySelector('img');
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
      const avatar = userMenuTrigger.querySelector('img');
      await expect(avatar).toBeInTheDocument();
      await expect(avatar?.getAttribute('src')).toContain('example.com/avatar');
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
    // Pre-populate localStorage with saved preferences
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
    await expect(verseContainer.style.getPropertyValue('--yv-reader-font-family')).toBe(
      SOURCE_SERIF_FONT,
    );

    // Open settings and verify the correct font family button is active
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    await userEvent.click(settingsButton);

    await waitFor(async () => {
      await expect(await screen.findByText('Reader Settings')).toBeInTheDocument();
    });

    const sourceSerifButton = screen.getByRole('button', { name: /source serif/i });
    await expect(sourceSerifButton).toHaveClass('yv:bg-primary');

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
    await expect(userMenuTrigger.querySelector('img')).not.toBeInTheDocument();

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
        http.get('*/v1/bibles/:id', async ({ params }) => {
          await delay(1000);
          const id = params.id as string;
          const bible =
            mockBibles.individual[id as keyof typeof mockBibles.individual] ??
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
        http.get('*/v1/bibles/111/passages/:usfm', async ({ params }) => {
          await delay(800);
          const usfm = params.usfm as string;
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
