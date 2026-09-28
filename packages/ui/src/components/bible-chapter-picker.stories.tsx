import type { Meta, StoryObj } from '@storybook/react-vite';
import { BibleChapterPicker } from './bible-chapter-picker';
import { fireEvent, within, waitFor, expect, userEvent } from 'storybook/test';
import { useState } from 'react';
import { waitForElement, waitForShadowRoot } from '../test/storybook-dom';

async function getPickerQueries(container: ParentNode) {
  const root = await waitForShadowRoot(container);
  const content = await waitForElement<HTMLElement>(
    root,
    '[data-yv-shadow-content-wrapper]',
    'chapter picker content not rendered',
  );
  return { root, picker: within(content) };
}

async function getOverlayQueries(root: ShadowRoot) {
  const overlay = await waitForElement<HTMLElement>(
    root,
    '[data-yv-shadow-local-overlay]',
    'chapter picker overlay not rendered',
  );
  return within(overlay);
}

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
        <div data-yv-sdk className="yv:h-screen yv:flex yv:justify-center yv:items-end yv:p-12">
          <BibleChapterPicker.Root
            book={book}
            onBookChange={setBook}
            chapter={chapter}
            onChapterChange={setChapter}
            versionId={args.versionId}
          >
            <BibleChapterPicker.Trigger />
          </BibleChapterPicker.Root>
        </div>
      );
    },
  ],
  argTypes: {
    versionId: {
      control: 'number',
      description: 'The version ID to display',
    },
    background: {
      table: { disable: true },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof BibleChapterPicker.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LightBackground: Story = {
  args: {
    versionId: 111,
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const { root, picker } = await getPickerQueries(canvasElement);

    // Wait for the component to load - button should show book title once books are loaded
    const popoverTrigger = await picker.findByRole('button', { name: /matthew 5/i });

    // Click the book selector to open dropdown
    await userEvent.click(popoverTrigger);
    const overlay = await getOverlayQueries(root);

    // Expect the Genesis accordion trigger to be visible
    await waitFor(async () => {
      const accordionButton = overlay.getByRole('button', { name: /Genesis/i });
      await expect(accordionButton).toBeVisible();
      await expect(accordionButton).toHaveAttribute('data-slot', 'accordion-trigger');
    });

    // Test search functionality
    const searchInput = overlay.getByPlaceholderText(/search/i);
    await userEvent.type(searchInput, 'exo');

    // Verify search results show Exodus
    await waitFor(() => expect(overlay.getByText('Exodus')).toBeInTheDocument());

    // Verify Genesis is filtered out
    await waitFor(() => expect(overlay.queryByText('Genesis')).not.toBeInTheDocument());

    // Clear search and select Genesis
    const currentSearchInput = overlay.getByPlaceholderText(/search/i);
    await fireEvent.input(currentSearchInput, { target: { value: '' } });
    await waitFor(() => expect(overlay.getByText('Genesis')).toBeInTheDocument());
    await userEvent.click(overlay.getByText('Genesis'));

    // Wait for chapter selector to become available
    await waitFor(() => expect(overlay.getByText('11')).toBeInTheDocument());

    // Click chapter selector to select chapter 11
    await userEvent.click(overlay.getByText('11'));

    // Assert that the button text changed to Genesis 11
    await waitFor(() =>
      expect(picker.getByRole('button', { name: /^genesis 11$/i })).toBeInTheDocument(),
    );
    await expect(picker.queryByRole('button', { name: /^genesis 5$/i })).not.toBeInTheDocument();
  },
};

export const DarkBackground: Story = {
  args: {
    versionId: 111,
  },
  globals: {
    theme: 'dark',
  },
  tags: ['integration'],
  // Using the play function get component in the open state for visual testing
  play: async ({ canvasElement }) => {
    const { picker } = await getPickerQueries(canvasElement);

    // Wait for the component to load
    const popoverTrigger = await picker.findByRole('button', { name: /matthew 5/i });
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
    const { root, picker } = await getPickerQueries(canvasElement);

    // Wait for the component to load - button should show book title once books are loaded
    const popoverTrigger = await picker.findByRole('button', { name: /matthew 5/i });

    // Click the book selector to open dropdown
    await userEvent.click(popoverTrigger);
    const overlay = await getOverlayQueries(root);

    // Expect the selected book accordion trigger to be visible
    await waitFor(async () => {
      const matchingButtons = overlay.queryAllByRole('button', { name: /Matthew/i });
      const accordionTrigger = matchingButtons.find(
        (button) => button.getAttribute('data-slot') === 'accordion-trigger',
      );
      await expect(accordionTrigger).toBeVisible();
    });
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
};
