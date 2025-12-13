import type { Meta, StoryObj } from '@storybook/react-vite';
import { BibleChapterPicker } from './bible-chapter-picker';
import { YouVersionProvider } from '@youversion/platform-react-hooks';
import { within, waitFor, expect, userEvent } from 'storybook/test';
import { useState } from 'react';

const meta = {
  title: 'Components/BibleChapterPicker',
  component: BibleChapterPicker.Root,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story, { args }) => {
      const [book, setBook] = useState('MAT');
      const [chapter, setChapter] = useState('5');
      return (
        <YouVersionProvider
          appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY}
          apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
        >
          <div className="yv:h-screen yv:flex yv:justify-center yv:items-end yv:p-12">
            <BibleChapterPicker.Root
              book={book}
              onBookChange={setBook}
              chapter={chapter}
              onChapterChange={setChapter}
              versionId={args.versionId}
              background={args.background}
            >
              <BibleChapterPicker.Trigger />
            </BibleChapterPicker.Root>
          </div>
        </YouVersionProvider>
      );
    },
  ],
  argTypes: {
    versionId: {
      control: 'number',
      description: 'The version ID to display',
    },
    background: {
      control: 'select',
      options: ['light', 'dark'],
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BibleChapterPicker.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LightBackground: Story = {
  args: {
    versionId: 111,
    background: 'light',
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // Wait for the component to load - button should show book title once books are loaded
    const popoverTrigger = await canvas.findByRole('button', { name: /matthew 5/i });

    // Click the book selector to open dropdown
    await userEvent.click(popoverTrigger);

    // Expect the Genesis accordion trigger to be visible
    await waitFor(async () => {
      const accordionButton = body.getByRole('button', { name: /Genesis/i });
      await expect(accordionButton).toBeVisible();
      await expect(accordionButton).toHaveAttribute('data-slot', 'accordion-trigger');
    });

    // Test search functionality
    const searchInput = body.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'exo');

    // Verify search results show Exodus
    await waitFor(() => expect(body.getByText('Exodus')).toBeInTheDocument());

    // Verify Genesis is filtered out
    await expect(body.queryByText('Genesis')).not.toBeInTheDocument();

    // Clear search and select Genesis
    await userEvent.clear(searchInput);
    await waitFor(() => expect(body.getByText('Genesis')).toBeInTheDocument());
    await userEvent.click(body.getByText('Genesis'));

    // Wait for chapter selector to become available
    await waitFor(() => expect(body.getByText('11')).toBeInTheDocument());

    // Click chapter selector to select chapter 11
    await userEvent.click(body.getByText('11'));

    // Assert that the button text changed to Genesis 11
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: /^genesis 11$/i })).toBeInTheDocument(),
    );
    await expect(canvas.queryByRole('button', { name: /^genesis 5$/i })).not.toBeInTheDocument();
  },
};

export const DarkBackground: Story = {
  args: {
    versionId: 111,
    background: 'dark',
  },
  tags: ['integration'],
  // Using the play function get component in the open state for visual testing
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for the component to load
    const popoverTrigger = await canvas.findByRole('button', { name: /matthew 5/i });
    await waitFor(() => expect(popoverTrigger).toBeInTheDocument());

    // Click the book selector to open dropdown
    await userEvent.click(popoverTrigger);
  },
};

export const CustomStartingPoint: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
  // Using the play function get component in the open state for visual testing
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // Wait for the component to load - button should show book title once books are loaded
    const popoverTrigger = await canvas.findByRole('button', { name: /matthew 5/i });

    // Click the book selector to open dropdown
    await userEvent.click(popoverTrigger);

    // Expect the selected book accordion trigger to be visible
    await waitFor(async () => {
      const matchingButtons = body.queryAllByRole('button', { name: /Matthew/i });
      const accordionTrigger = matchingButtons.find(
        (button) => button.getAttribute('data-slot') === 'accordion-trigger',
      );
      await expect(accordionTrigger).toBeVisible();
    });
  },
};
export const RealAPI: Story = {
  args: {
    versionId: 1,
  },
  parameters: {
    msw: {
      handlers: null,
    },
  },
};
