/**
 * @vitest-environment jsdom
 */
// We stub ResizeObserver for jsdom (used by Radix/@floating-ui). The stub methods are intentionally no-ops.
/* eslint-disable @typescript-eslint/no-empty-function */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { useEffect, useState, type ReactElement } from 'react';
import userEvent from '@testing-library/user-event';

// ResizeObserver is used by @floating-ui/dom (Radix Popover)
import { installResizeObserverStub } from '@/test/dom-stubs';

installResizeObserverStub();

import { BibleChapterPicker } from './bible-chapter-picker';
import type {
  BibleChapterPickerRootProps,
  BibleChapterPickerSelectData,
} from './bible-chapter-picker';
import type { HookOverrides } from '@youversion/platform-react-hooks';
import type { BibleBook } from '@youversion/platform-core';
import { HookOverrideProvider } from '@/test/hook-overrides';
import { InterfaceDirectionProvider } from '@/lib/direction';
import { ReuseShadowBoundary } from '@/lib/shadow-isolation';

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

function defaultOverrides(): HookOverrides {
  return {
    useBooks: () => ({
      books: { data: [...mockBooks], next_page_token: null },
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
  };
}

function renderWithOverrides(ui: ReactElement) {
  return render(
    <HookOverrideProvider overrides={defaultOverrides()}>
      <ReuseShadowBoundary>{ui}</ReuseShadowBoundary>
    </HookOverrideProvider>,
  );
}

function findAccordionTrigger(name: RegExp): HTMLElement | undefined {
  return screen
    .queryAllByRole('button', { name })
    .find((button) => button.getAttribute('data-slot') === 'accordion-trigger');
}

// Render Content inline (onChapterPickerPress path renders children without the popover portal).
function renderContent(props: Partial<BibleChapterPickerRootProps> = {}) {
  renderWithOverrides(
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

function standaloneContent(onChapterPickerPress: () => void): ReactElement {
  return (
    <HookOverrideProvider overrides={defaultOverrides()}>
      <ReuseShadowBoundary>
        <BibleChapterPicker.Root
          versionId={3034}
          book="GEN"
          chapter="1"
          onChapterPickerPress={onChapterPickerPress}
        >
          <BibleChapterPicker.Trigger />
          <BibleChapterPicker.Content />
        </BibleChapterPicker.Root>
      </ReuseShadowBoundary>
    </HookOverrideProvider>
  );
}

it('skips the scheduled reveal after focus moves to a host control', async () => {
  vi.useFakeTimers();
  const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
  try {
    render(
      <>
        <button type="button">Host control</button>
        {standaloneContent(() => undefined)}
      </>,
    );
    findAccordionTrigger(/Exodus/i)?.focus();
    const hostControl = screen.getByRole('button', { name: 'Host control' });
    hostControl.focus();

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(hostControl).toHaveFocus();
    expect(scrollSpy).not.toHaveBeenCalled();
  } finally {
    scrollSpy.mockRestore();
    vi.useRealTimers();
  }
});

it('keeps the focused chapter visible when a book reveal is pending', async () => {
  vi.useFakeTimers();
  const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
  try {
    render(standaloneContent(() => undefined));
    const chapter = screen.getByRole('button', { name: '2' });
    chapter.focus();

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(chapter).toHaveFocus();
    expect(scrollSpy).not.toHaveBeenCalled();
  } finally {
    scrollSpy.mockRestore();
    vi.useRealTimers();
  }
});

it('does not scroll consumer ancestors again when only the callback identity changes', async () => {
  vi.useFakeTimers();
  const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
  try {
    const { rerender } = render(standaloneContent(() => undefined));
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    rerender(standaloneContent(() => undefined));
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(scrollSpy).toHaveBeenCalledTimes(1);
  } finally {
    scrollSpy.mockRestore();
    vi.useRealTimers();
  }
});

it('does not let focus in a sibling accordion suppress the current-book reveal', async () => {
  const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
  try {
    render(
      <>
        <div data-slot="accordion">
          <div data-slot="accordion-item">
            <button type="button" data-slot="accordion-trigger">
              Sibling accordion trigger
            </button>
          </div>
        </div>
        {standaloneContent(() => undefined)}
      </>,
    );
    screen.getByRole('button', { name: 'Sibling accordion trigger' }).focus();

    await waitFor(() => expect(scrollSpy).toHaveBeenCalledTimes(1));
  } finally {
    scrollSpy.mockRestore();
  }
});

it.each([
  { prefersReduced: false, behavior: 'smooth' },
  { prefersReduced: true, behavior: 'auto' },
])(
  'reveals the current book with $behavior scrolling based on motion preference',
  async ({ prefersReduced, behavior }) => {
    vi.useFakeTimers();
    const matchMedia = vi.fn(() => ({ matches: prefersReduced }));
    vi.stubGlobal('matchMedia', matchMedia);
    const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
    try {
      render(standaloneContent(() => undefined));
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
      expect(scrollSpy).toHaveBeenCalledExactlyOnceWith({ block: 'start', behavior });
    } finally {
      scrollSpy.mockRestore();
      vi.unstubAllGlobals();
      vi.useRealTimers();
    }
  },
);

it('cancels pending book reveals when the picker unmounts', async () => {
  vi.useFakeTimers();
  const scheduleSpy = vi.spyOn(globalThis, 'setTimeout');
  const cancelSpy = vi.spyOn(globalThis, 'clearTimeout');
  const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView');
  try {
    const { unmount } = render(standaloneContent(() => undefined));
    scheduleSpy.mockClear();
    screen.getByRole('button', { name: 'Genesis 1' }).click();
    expect(scheduleSpy).toHaveBeenCalledTimes(1);
    const revealTimer = scheduleSpy.mock.results[0]!.value;
    unmount();
    expect(cancelSpy).toHaveBeenCalledWith(revealTimer);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(scrollSpy).not.toHaveBeenCalled();
  } finally {
    scheduleSpy.mockRestore();
    cancelSpy.mockRestore();
    scrollSpy.mockRestore();
    vi.useRealTimers();
  }
});

describe('BibleChapterPicker - onChapterPickerPress override', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onChapterPickerPress with { book, chapter, versionId } when Trigger is clicked', async () => {
    const user = userEvent.setup();
    const onChapterPickerPress = vi.fn();

    renderWithOverrides(
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
    renderWithOverrides(
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

  it('preserves first-render defaults when a parent mount effect changes them', async () => {
    const user = userEvent.setup();
    const onChapterPickerPress = vi.fn();

    function PickerWithChangingDefaults(): ReactElement {
      const [defaults, setDefaults] = useState({ book: 'GEN', chapter: '1' });
      useEffect(() => setDefaults({ book: 'EXO', chapter: '2' }), []);

      return (
        <BibleChapterPicker.Root
          versionId={3034}
          defaultBook={defaults.book}
          defaultChapter={defaults.chapter}
          onChapterPickerPress={onChapterPickerPress}
        >
          <BibleChapterPicker.Trigger />
        </BibleChapterPicker.Root>
      );
    }

    const { container } = render(
      <HookOverrideProvider overrides={defaultOverrides()}>
        <PickerWithChangingDefaults />
      </HookOverrideProvider>,
    );
    const trigger = await waitFor(() => {
      const button = container
        .querySelector<HTMLElement>('[data-yv-shadow-host]')
        ?.shadowRoot?.querySelector<HTMLButtonElement>('button');
      if (!button) throw new Error('chapter picker trigger not mounted');
      return button;
    });

    await user.click(trigger);

    expect(onChapterPickerPress).toHaveBeenCalledWith({
      book: 'GEN',
      chapter: '1',
      versionId: 3034,
    });
  });
});

describe('BibleChapterPicker - default popover mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders popover content when Trigger is clicked and no override is provided', async () => {
    const user = userEvent.setup();

    renderWithOverrides(
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
  });

  it('calls onSelect with { book, chapter, versionId } when a normal chapter is clicked (with onChapterPickerPress)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(data: BibleChapterPickerSelectData) => void>();

    renderWithOverrides(
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
    const payload = onSelect.mock.calls[0]![0];
    expect(payload).toEqual({
      book: 'GEN',
      chapter: '2',
      versionId: 3034,
    });
  });

  it('calls onSelect when intro chapter is clicked (with onChapterPickerPress)', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn<(data: BibleChapterPickerSelectData) => void>();

    renderWithOverrides(
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

    renderWithOverrides(
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

describe('BibleChapterPicker - accordion expand/collapse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

it('establishes RTL on standalone chapter content while isolating dynamic labels', () => {
  renderWithOverrides(
    <InterfaceDirectionProvider direction="rtl">
      <BibleChapterPicker.Root
        versionId={3034}
        book="GEN"
        chapter="1"
        onChapterPickerPress={vi.fn()}
      >
        <BibleChapterPicker.Trigger dir="ltr" />
        <BibleChapterPicker.Content />
      </BibleChapterPicker.Root>
    </InterfaceDirectionProvider>,
  );

  const trigger = screen.getByRole('button', { name: /genesis 1/i });
  expect(trigger).toHaveAttribute('dir', 'rtl');
  expect(trigger.querySelectorAll('bdi')).toHaveLength(2);
  for (const bookName of screen.getAllByText('Genesis')) {
    expect(bookName.closest('bdi')).toHaveAttribute('dir', 'auto');
  }
  expect(screen.getByPlaceholderText('Search')).toHaveAttribute('dir', 'auto');
  expect(screen.getByPlaceholderText('Search').closest('[data-yv-sdk]')).toHaveAttribute(
    'dir',
    'rtl',
  );
});
