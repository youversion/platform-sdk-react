import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, screen, spyOn, userEvent, waitFor } from 'storybook/test';
import { BibleReader } from './bible-reader';
import { setupAuthenticatedUser } from '../test/utils';

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
    lineHeight: {
      control: 'select',
      options: [1.4, 1.6, 1.8, 2.0],
      description: 'Line height multiplier',
    },
    fontFamily: {
      control: 'select',
      options: ['Source Serif Pro', 'Inter', "'Georgia', serif", "'Nunito Sans', sans-serif"],
      description: 'Font family',
    },
    showVerseNumbers: {
      control: 'boolean',
      description: 'Show verse numbers',
    },
    background: {
      control: 'select',
      options: [undefined, 'light', 'dark'],
      description: 'Background theme',
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
    versionId: 111,
    lineHeight: 1.6,
    fontFamily: "'Inter', sans-serif",
    showVerseNumbers: true,
    background: 'light',
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
    await userEvent.click(increaseFontButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-size')).toBe('20');

    await userEvent.click(decreaseFontButton);
    await userEvent.click(decreaseFontButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-size')).toBe('16');
    await userEvent.click(decreaseFontButton);
    await userEvent.click(decreaseFontButton);
    await userEvent.click(decreaseFontButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-size')).toBe('12');

    const interButton = screen.getByRole('button', { name: /inter/i });
    const sourceSerifButton = screen.getByRole('button', { name: /source serif/i });

    await userEvent.click(sourceSerifButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe(
      'Source Serif',
    );

    await userEvent.click(interButton);
    await expect(localStorage.getItem('youversion-platform:reader:font-family')).toBe('Inter');
  },
};

/**
 * Dark theme
 */
export const DarkTheme: Story = {
  args: {
    versionId: 111,
    fontSize: 16,
    lineHeight: 1.6,
    fontFamily: "'Inter', sans-serif",
    showVerseNumbers: true,
    background: 'dark',
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background yv:dark">
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
    versionId: 111,
    fontSize: 18,
    lineHeight: 2.0,
    fontFamily: "'Nunito Sans', sans-serif",
    showVerseNumbers: false,
    background: 'light',
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background">
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
    versionId: 111,
    fontSize: 28,
    lineHeight: 2.0,
    fontFamily: "'Nunito Sans', sans-serif",
    showVerseNumbers: false,
    background: 'light',
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background">
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
    versionId: 111,
  },
  parameters: {
    msw: {
      handlers: null,
    },
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background yv:dark">
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
    versionId: 111,
    book: 'JHN',
    chapter: '1',
    background: 'light',
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

    const getFootnoteButtons = () => canvasElement.querySelectorAll('[data-verse-footnote] button');

    await waitFor(
      async () => {
        const footnoteButtons = getFootnoteButtons();
        await expect(footnoteButtons.length).toBe(9);
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
    versionId: 111,
    book: 'JHN',
    chapter: '1',
    background: 'light',
  },
  globals: {
    theme: 'dark',
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
    versionId: 111,
    book: 'JHN',
    chapter: '1',
    background: 'light',
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background">
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
    versionId: 111,
    book: 'JHN',
    chapter: '1',
    background: 'light',
  },
  beforeEach: async () => {
    localStorage.clear();
    await setupAuthenticatedUser({
      avatarUrl: 'https://example.com/avatar/{width}/{height}.jpg',
    });
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background">
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
    versionId: 111,
    book: 'JHN',
    chapter: '1',
    background: 'light',
  },
  beforeEach: async () => {
    localStorage.clear();
    await setupAuthenticatedUser({
      avatarUrl: 'https://example.com/avatar/{width}/{height}.jpg',
    });
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background">
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

export const AuthenticatedWithoutAvatar: Story = {
  tags: ['integration'],
  args: {
    versionId: 111,
    book: 'JHN',
    chapter: '1',
    background: 'light',
  },
  beforeEach: async () => {
    localStorage.clear();
    await setupAuthenticatedUser();
  },
  render: (args) => (
    <div className="yv:h-screen yv:bg-background">
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
