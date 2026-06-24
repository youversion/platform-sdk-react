/**
 * @vitest-environment jsdom
 */
// We stub ResizeObserver for jsdom (used by Radix/@floating-ui). The stub methods are intentionally no-ops.
/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ResizeObserver is used by @floating-ui/dom (Radix Popover)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

import { BibleChapterPicker } from './bible-chapter-picker';
import type { BibleChapterPickerSelectData } from './bible-chapter-picker';
import { useBooks, useTheme } from '@youversion/platform-react-hooks';
import type { BibleBook } from '@youversion/platform-core';

vi.mock('@youversion/platform-react-hooks');

const mockBooks: BibleBook[] = [
  {
    id: 'GEN',
    title: 'Genesis',
    full_title: 'The First Book of Moses, Commonly Called Genesis',
    canon: 'old_testament',
    abbreviation: 'Gen',
    intro: { id: 'INTRO', passage_id: 'GEN.0.INTRO', title: 'Intro' },
    chapters: [
      { id: '1', title: '1', passage_id: 'GEN.1' },
      { id: '2', title: '2', passage_id: 'GEN.2' },
    ],
  },
];

function setupDefaultMocks() {
  vi.mocked(useTheme).mockReturnValue('light');
  vi.mocked(useBooks).mockReturnValue({
    books: { data: [...mockBooks], next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
}

describe('BibleChapterPicker - onChapterPickerPress override', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('calls onChapterPickerPress with { book, chapter, versionId } when Trigger is clicked', async () => {
    const user = userEvent.setup();
    const onChapterPickerPress = vi.fn();

    render(
      <BibleChapterPicker.Root
        versionId={3034}
        book="GEN"
        chapter="1"
        onChapterPickerPress={onChapterPickerPress}
      >
        <BibleChapterPicker.Trigger />
      </BibleChapterPicker.Root>,
    );

    await user.click(screen.getByRole('button'));

    expect(onChapterPickerPress).toHaveBeenCalledTimes(1);
    expect(onChapterPickerPress).toHaveBeenCalledWith({
      book: 'GEN',
      chapter: '1',
      versionId: 3034,
    });
  });

  it('does NOT render popover content when onChapterPickerPress is provided', () => {
    render(
      <BibleChapterPicker.Root
        versionId={3034}
        book="GEN"
        chapter="1"
        onChapterPickerPress={vi.fn()}
      >
        <BibleChapterPicker.Trigger />
      </BibleChapterPicker.Root>,
    );

    expect(screen.queryByText('Books')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Search')).not.toBeInTheDocument();
  });
});

describe('BibleChapterPicker - default popover mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('renders popover content when Trigger is clicked and no override is provided', async () => {
    const user = userEvent.setup();

    render(
      <BibleChapterPicker.Root versionId={3034} book="GEN" chapter="1">
        <BibleChapterPicker.Trigger />
      </BibleChapterPicker.Root>,
    );

    await user.click(screen.getByRole('button'));

    expect(await screen.findByText('Books')).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Search')).toBeInTheDocument();
  });
});

describe('BibleChapterPicker.Content onSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('calls onSelect with { book, chapter, versionId } when a normal chapter is clicked (with onChapterPickerPress)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <BibleChapterPicker.Root
        versionId={3034}
        book="GEN"
        chapter="1"
        onChapterPickerPress={vi.fn()}
      >
        <BibleChapterPicker.Trigger />
        <BibleChapterPicker.Content onSelect={onSelect} />
      </BibleChapterPicker.Root>,
    );

    await user.click(screen.getByText('2'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    const payload = onSelect.mock.calls[0]![0] as BibleChapterPickerSelectData;
    expect(payload).toEqual({
      book: 'GEN',
      chapter: '2',
      versionId: 3034,
    });
  });

  it('calls onSelect when intro chapter is clicked (with onChapterPickerPress)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <BibleChapterPicker.Root
        versionId={3034}
        book="GEN"
        chapter="1"
        onChapterPickerPress={vi.fn()}
      >
        <BibleChapterPicker.Trigger />
        <BibleChapterPicker.Content onSelect={onSelect} />
      </BibleChapterPicker.Root>,
    );

    const introButton = screen.getByTestId('intro-chapter-button');
    await user.click(introButton);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      book: 'GEN',
      chapter: 'INTRO',
      versionId: 3034,
    });
  });

  it('preserves default popover behavior when onSelect is not provided', async () => {
    const user = userEvent.setup();

    render(
      <BibleChapterPicker.Root versionId={3034} book="GEN" chapter="1">
        <BibleChapterPicker.Trigger />
      </BibleChapterPicker.Root>,
    );

    await user.click(screen.getByRole('button'));
    expect(await screen.findByText('Books')).toBeInTheDocument();

    await user.click(screen.getByText('2'));

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Search')).not.toBeInTheDocument();
    });
  });
});

describe('BibleChapterPicker - typography (matches Figma: Aktiv Grotesk App)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  function findAccordionTrigger(name: RegExp): HTMLElement | undefined {
    return screen
      .queryAllByRole('button', { name })
      .find((button) => button.getAttribute('data-slot') === 'accordion-trigger');
  }

  // Render Content inline (onChapterPickerPress path renders children without the popover portal).
  function renderContent() {
    render(
      <BibleChapterPicker.Root
        versionId={3034}
        book="GEN"
        chapter="1"
        onChapterPickerPress={vi.fn()}
      >
        <BibleChapterPicker.Trigger />
        <BibleChapterPicker.Content />
      </BibleChapterPicker.Root>,
    );
  }

  it('book row uses Aktiv 16px, regular collapsed and bold when expanded', () => {
    renderContent();

    // GEN is the default-expanded book (book="GEN").
    const genesisTrigger = findAccordionTrigger(/Genesis/i);
    expect(genesisTrigger).toBeDefined();
    expect(genesisTrigger).toHaveClass('yv:text-base', 'yv:font-normal');
    expect(genesisTrigger).toHaveAttribute('data-state', 'open');
    expect(genesisTrigger).toHaveClass('yv:data-[state=open]:font-bold');
  });

  it('chapter number buttons use Aktiv 16px bold', () => {
    renderContent();

    const chapterButton = screen.getByText('2').closest('button');
    expect(chapterButton).not.toBeNull();
    expect(chapterButton).toHaveClass('yv:text-base', 'yv:font-bold');
  });

  it('search input uses Aktiv 16px', () => {
    renderContent();

    expect(screen.getByPlaceholderText('Search')).toHaveClass('yv:text-base');
  });
});
