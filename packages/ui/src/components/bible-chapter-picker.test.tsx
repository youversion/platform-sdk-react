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
import type {
  BibleChapterPickerRootProps,
  BibleChapterPickerSelectData,
} from './bible-chapter-picker';
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
  {
    id: 'EXO',
    title: 'Exodus',
    full_title: 'The Second Book of Moses, Commonly Called Exodus',
    canon: 'old_testament',
    abbreviation: 'Exo',
    chapters: [
      { id: '1', title: '1', passage_id: 'EXO.1' },
      { id: '2', title: '2', passage_id: 'EXO.2' },
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

function findAccordionTrigger(name: RegExp): HTMLElement | undefined {
  return screen
    .queryAllByRole('button', { name })
    .find((button) => button.getAttribute('data-slot') === 'accordion-trigger');
}

// Render Content inline (onChapterPickerPress path renders children without the popover portal).
function renderContent(props: Partial<BibleChapterPickerRootProps> = {}) {
  render(
    <BibleChapterPicker.Root
      versionId={3034}
      book="GEN"
      chapter="1"
      onChapterPickerPress={vi.fn()}
      {...props}
    >
      <BibleChapterPicker.Trigger />
      <BibleChapterPicker.Content />
    </BibleChapterPicker.Root>,
  );
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

describe('BibleChapterPicker - typography (matches Figma sizing; sans inherited)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('book row uses 16px, regular collapsed and bold when expanded', () => {
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

describe('BibleChapterPicker - accordion expand/collapse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  // Scenario A: the selected book is expanded on mount; one click must close it.
  it('collapses the initially expanded book on the first click', async () => {
    const user = userEvent.setup();
    renderContent();

    expect(findAccordionTrigger(/Genesis/i)).toHaveAttribute('data-state', 'open');

    await user.click(findAccordionTrigger(/Genesis/i)!);

    expect(findAccordionTrigger(/Genesis/i)).toHaveAttribute('data-state', 'closed');
  });

  // Scenario B: collapsing a book other than the selected one must not re-open the selected book.
  it('collapses a different expanded book on the first click without re-opening the selected book', async () => {
    const user = userEvent.setup();
    renderContent();

    await user.click(findAccordionTrigger(/Exodus/i)!);

    expect(findAccordionTrigger(/Genesis/i)).toHaveAttribute('data-state', 'closed');
    expect(findAccordionTrigger(/Exodus/i)).toHaveAttribute('data-state', 'open');

    await user.click(findAccordionTrigger(/Exodus/i)!);

    expect(findAccordionTrigger(/Exodus/i)).toHaveAttribute('data-state', 'closed');
    expect(findAccordionTrigger(/Genesis/i)).toHaveAttribute('data-state', 'closed');
  });

  // Scenario C: with no book selected, an expanded book must still close on the first click.
  it('collapses an expanded book on the first click when no book prop is provided', async () => {
    const user = userEvent.setup();
    renderContent({ book: undefined });

    await user.click(findAccordionTrigger(/Exodus/i)!);
    expect(findAccordionTrigger(/Exodus/i)).toHaveAttribute('data-state', 'open');

    await user.click(findAccordionTrigger(/Exodus/i)!);

    expect(findAccordionTrigger(/Exodus/i)).toHaveAttribute('data-state', 'closed');
  });

  it('never flips the accordion between controlled and uncontrolled', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    renderContent();

    // Full expand/collapse sequence across both books.
    await user.click(findAccordionTrigger(/Genesis/i)!);
    await user.click(findAccordionTrigger(/Exodus/i)!);
    await user.click(findAccordionTrigger(/Exodus/i)!);
    await user.click(findAccordionTrigger(/Genesis/i)!);

    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('changing from controlled to uncontrolled'),
    );

    warnSpy.mockRestore();
  });
});
