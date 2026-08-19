import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import React from 'react';

import { type BibleTextViewProps, BibleTextView, Verse, getCleanVerseText } from './verse';
import { VerseActionPopover } from './verse-action-popover';
import { buildVerseShareText } from '@/lib/verse-share';
import { Button } from './ui/button';
import { XIcon } from '@/components/icons/x';

// USFM format: BOOK.CHAPTER or BOOK.CHAPTER.VERSE or BOOK.CHAPTER.VERSE-VERSE
const USFM_PATTERN = /^[A-Z1-4]{3}\.\d+(\.\d+(-\d+)?)?$/;

type DebouncedBibleTextViewProps = {
  reference: string;
  versionId: number;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  debounceMs?: number;
};

const MULTIPLE_FOOTNOTE_SINGLE_VERSE_HTML = `
  <div class="p">
    <span class="yv-v" v="51"></span><span class="yv-vlbl">51</span>He then added,
    <span class="wj">"Very truly I tell you,</span><span class="yv-n f"><span class="fr">1:51 </span><span class="ft">The Greek is plural.</span></span>
    <span class="wj">you</span><span class="yv-n f"><span class="fr">1:51 </span><span class="ft">The Greek is plural.</span></span>
    <span class="wj">will see heaven open."</span>
  </div>
`;

function DebouncedBibleTextView({
  reference,
  versionId,
  fontFamily,
  fontSize,
  lineHeight,
  debounceMs = 500,
}: DebouncedBibleTextViewProps): React.ReactElement | null {
  const [debouncedReference, setDebouncedReference] = React.useState(() => {
    const trimmed = reference.trim();
    if (trimmed === '') return '';
    return USFM_PATTERN.test(reference) ? reference : '';
  });
  const [debouncedVersionId, setDebouncedVersionId] = React.useState(() => {
    return Number.isInteger(versionId) && versionId > 0 ? versionId : 0;
  });
  const [isInvalid, setIsInvalid] = React.useState(() => {
    const trimmed = reference.trim();
    if (trimmed === '') return false;
    return !USFM_PATTERN.test(reference) || !(Number.isInteger(versionId) && versionId > 0);
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (reference.trim() === '') {
        setDebouncedReference('');
        setIsInvalid(false);
        return;
      }

      const isValidReference = USFM_PATTERN.test(reference);
      const isValidVersionId = Number.isInteger(versionId) && versionId > 0;

      if (isValidReference) {
        setDebouncedReference(reference);
      } else {
        setDebouncedReference('');
      }

      setIsInvalid(!isValidReference || !isValidVersionId);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [reference, versionId, debounceMs]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const isValidVersionId = Number.isInteger(versionId) && versionId > 0;
      if (isValidVersionId) {
        setDebouncedVersionId(versionId);
      } else {
        setDebouncedVersionId(0);
      }

      const trimmed = reference.trim();
      if (trimmed === '') {
        setIsInvalid(false);
      } else {
        const isValidReference = USFM_PATTERN.test(reference);
        setIsInvalid(!isValidReference || !isValidVersionId);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [versionId, reference, debounceMs]);

  if (isInvalid) {
    return (
      <div style={{ color: 'red', padding: '1rem' }}>Incorrect USFM reference: {reference}</div>
    );
  }

  if (debouncedReference.trim() === '') {
    return null;
  }

  return (
    <BibleTextView
      reference={debouncedReference}
      versionId={debouncedVersionId}
      fontFamily={fontFamily}
      fontSize={fontSize}
      lineHeight={lineHeight}
    />
  );
}

const meta = {
  title: 'Components/BibleTextView',
  component: BibleTextView,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      table: {
        disable: true,
      },
    },
    reference: {
      control: 'text',
      description: 'USFM reference (e.g., "JHN.3.16", "JHN.3.16-17", "JHN.3")',
    },
    versionId: {
      control: 'number',
      description: 'Bible version ID (e.g., 206 for WEB)',
    },
    fontFamily: {
      control: 'text',
      description: 'Font family for the Bible text',
    },
    fontSize: {
      control: { type: 'range', min: 12, max: 36, step: 1 },
      description: 'Font size in pixels',
    },
    lineHeight: {
      control: { type: 'range', min: 1.375, max: 2, step: 0.125 },
      description: 'Line height',
    },
    renderNotes: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof BibleTextView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SingleVerse: Story = {
  args: {
    reference: 'JHN.3.16',
    versionId: 111,
    renderNotes: true,
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole('status', { name: /loading/i })).toBeInTheDocument();

    await waitFor(async () => {
      await expect(await canvas.findByText(/for God so loved the world/i)).toBeInTheDocument();
    });
  },
};

export const VerseRange: Story = {
  args: {
    reference: 'JHN.3.16-17',
    versionId: 111,
    renderNotes: true,
  },
};

export const FullChapter: Story = {
  args: {
    reference: 'JHN.3',
    versionId: 111,
    renderNotes: true,
  },
};

export const ControlledHighlights: Story = {
  args: {
    reference: 'JHN.1',
    versionId: 111,
    highlights: [
      { version_id: 111, passage_id: 'JHN.1.1', color: 'fffe00' },
      { version_id: 111, passage_id: 'JHN.1.3-5', color: '5dff79' },
    ],
  },
};

export const RealAPI: Story = {
  render: (args) => <DebouncedBibleTextView {...args} />,
  args: {
    reference: 'JHN.1',
    versionId: 111,
    renderNotes: true,
    showVerseNumbers: true,
  },
  parameters: {
    msw: {
      handlers: [],
    },
  },
};

export const FootnoteInteraction: Story = {
  args: {
    reference: 'JHN.1.51',
    versionId: 111,
    renderNotes: true,
    showVerseNumbers: true,
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        const footnoteButtons = canvasElement.querySelectorAll('[data-verse-footnote] button');
        await expect(footnoteButtons.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const footnoteButtons = canvasElement.querySelectorAll('[data-verse-footnote] button');
    await expect(footnoteButtons.length).toBeGreaterThan(0);
    await userEvent.click(footnoteButtons[0]!);

    await waitFor(async () => {
      await expect(await screen.findByText('Footnotes')).toBeInTheDocument();
    });

    await waitFor(async () => {
      await expect(await screen.findByText(/John 1:51/i)).toBeInTheDocument();
    });

    await waitFor(async () => {
      const noteItems = document.querySelectorAll('[data-yv-sdk] ul li');
      await expect(noteItems.length).toBeGreaterThan(0);
    });
  },
};

export const MultipleFootnotesInSingleVerse: Story = {
  args: {
    reference: 'JHN.1.51',
    versionId: 111,
    renderNotes: true,
  },
  tags: ['integration'],
  render: () => (
    <div data-yv-sdk data-yv-theme="light">
      <Verse.Html html={MULTIPLE_FOOTNOTE_SINGLE_VERSE_HTML} renderNotes={true} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        const footnoteButtons = canvasElement.querySelectorAll('[data-verse-footnote="51"] button');
        await expect(footnoteButtons.length).toBe(2);
      },
      { timeout: 5000 },
    );

    const footnoteButtons = canvasElement.querySelectorAll('[data-verse-footnote="51"] button');
    await expect(footnoteButtons.length).toBe(2);

    for (const button of footnoteButtons) {
      await expect(button.closest('.yv-v[v="51"]')).toBeInTheDocument();
    }

    const footnoteAnchors = canvasElement.querySelectorAll('[data-verse-footnote="51"]');
    await expect(footnoteAnchors.length).toBe(2);

    const firstAnchor = footnoteAnchors[0];
    const secondAnchor = footnoteAnchors[1];

    await expect(firstAnchor?.previousElementSibling?.textContent ?? '').toMatch(
      /very truly i tell you,/i,
    );
    await expect(firstAnchor?.nextElementSibling?.textContent ?? '').toMatch(/^you$/i);

    await expect(secondAnchor?.previousElementSibling?.textContent ?? '').toMatch(/^you$/i);
    await expect(secondAnchor?.nextElementSibling?.textContent ?? '').toMatch(
      /will see heaven open/i,
    );
  },
};

export const DarkMode: Story = {
  args: {
    reference: 'JHN.3.16',
    versionId: 111,
    renderNotes: true,
  },
  globals: {
    theme: 'dark',
  },
  render: (args) => <BibleTextView {...args} />,
};

export const FootnotePopoverThemeLight: Story = {
  args: {
    reference: 'JHN.1',
    versionId: 111,
    renderNotes: true,
    showVerseNumbers: true,
  },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        const verseContainer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
        await expect(verseContainer).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    await waitFor(
      async () => {
        const footnoteButtons = canvasElement.querySelectorAll('[data-verse-footnote] button');
        await expect(footnoteButtons.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const footnoteButtons = canvasElement.querySelectorAll('[data-verse-footnote] button');
    await expect(footnoteButtons.length).toBeGreaterThan(0);
    await expect(footnoteButtons[0]?.closest('[data-yv-theme="light"]')).toBeInTheDocument();

    await userEvent.click(footnoteButtons[0]!);

    await waitFor(async () => {
      const popover = document.querySelector('[data-slot="popover-content"]');
      await expect(popover).toBeInTheDocument();
      await expect(popover?.closest('[data-yv-theme="light"]')).toBeInTheDocument();
    });
  },
};

export const FootnotePopoverThemeDark: Story = {
  args: {
    reference: 'JHN.1',
    versionId: 111,
    renderNotes: true,
    showVerseNumbers: true,
  },
  globals: {
    theme: 'dark',
  },
  tags: ['integration'],
  render: (args) => <BibleTextView {...args} />,
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        const verseContainer = canvasElement.querySelector('[data-slot="yv-bible-renderer"]');
        await expect(verseContainer).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    await waitFor(
      async () => {
        const footnoteButtons = canvasElement.querySelectorAll('[data-verse-footnote] button');
        await expect(footnoteButtons.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const footnoteButtons = canvasElement.querySelectorAll('[data-verse-footnote] button');
    await expect(footnoteButtons.length).toBeGreaterThan(0);
    await expect(footnoteButtons[0]?.closest('[data-yv-theme="dark"]')).toBeInTheDocument();

    await userEvent.click(footnoteButtons[0]!);

    await waitFor(async () => {
      const popover = document.querySelector('[data-slot="popover-content"]');
      await expect(popover).toBeInTheDocument();
      await expect(popover?.closest('[data-yv-theme="dark"]')).toBeInTheDocument();
    });
  },
};

function VerseSelectionDemo(props: BibleTextViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Captured as state (not a ref) so the popover's docking observer re-subscribes
  // once the scroll container mounts.
  const [scrollEl, setScrollEl] = React.useState<HTMLElement | null>(null);
  const [selectedVerses, setSelectedVerses] = React.useState<number[]>([]);
  const [highlightedVerses, setHighlightedVerses] = React.useState<Record<number, string>>({});
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [anchorElement, setAnchorElement] = React.useState<HTMLElement | null>(null);
  const lastSelectionRef = React.useRef<number[]>([]);

  const activeHighlights = React.useMemo(
    () =>
      new Set(
        selectedVerses
          .map((verse) => highlightedVerses[verse])
          .filter((color): color is string => Boolean(color)),
      ),
    [selectedVerses, highlightedVerses],
  );

  const closeAndClear = () => {
    setPopoverOpen(false);
    setSelectedVerses([]);
    setAnchorElement(null);
    lastSelectionRef.current = [];
  };

  const handleVerseSelect = (verses: number[]) => {
    const added = verses.find((verse) => !lastSelectionRef.current.includes(verse));
    lastSelectionRef.current = verses;
    setSelectedVerses(verses);
    if (verses.length === 0) {
      setPopoverOpen(false);
      setAnchorElement(null);
      return;
    }
    const anchorVerse = added ?? Math.max(...verses);
    const wrappers = containerRef.current?.querySelectorAll(`.yv-v[v="${anchorVerse}"]`);
    const anchor = wrappers?.[wrappers.length - 1];
    setAnchorElement(anchor instanceof HTMLElement ? anchor : null);
    setPopoverOpen(true);
  };

  const handleHighlight = (color: string) => {
    setHighlightedVerses((prev) => {
      const next = { ...prev };
      for (const verse of selectedVerses) next[verse] = color;
      return next;
    });
    closeAndClear();
  };

  const handleClearHighlight = (color: string) => {
    setHighlightedVerses((prev) => {
      const next = { ...prev };
      for (const verse of selectedVerses) {
        if (next[verse] === color) delete next[verse];
      }
      return next;
    });
    const hasRemaining = selectedVerses.some((verse) => {
      const current = highlightedVerses[verse];
      return current && current !== color;
    });
    if (!hasRemaining) closeAndClear();
  };

  const buildText = () => {
    const container = containerRef.current;
    if (!container) return '';
    const textByVerse: Record<number, string> = {};
    for (const verse of selectedVerses) textByVerse[verse] = getCleanVerseText(container, verse);
    return buildVerseShareText({
      verses: selectedVerses,
      textByVerse,
      bookName: 'John',
      chapter: 1,
      versionAbbreviation: 'NIV',
    });
  };

  const handleCopy = () => {
    void navigator.clipboard?.writeText(buildText());
    closeAndClear();
  };

  const handleShare = () => {
    const text = buildText();
    if (globalThis.navigator?.share instanceof Function) {
      navigator
        .share({ text })
        .then(() => closeAndClear())
        .catch(() => {
          // Cancelled or failed — keep open.
        });
      return;
    }
    void navigator.clipboard?.writeText(text);
    closeAndClear();
  };

  return (
    <div
      ref={containerRef}
      data-yv-sdk
      className="yv:grid yv:grid-rows-[auto_1fr] yv:gap-4 yv:max-w-lg yv:h-svh yv:max-h-svh yv:overflow-hidden"
    >
      <div className="yv:flex yv:items-center yv:gap-2 yv:bg-secondary yv:py-2 yv:px-4 yv:rounded-sm yv:sticky yv:text-sm yv:text-muted-foreground">
        <p className="yv:flex-1">
          Selected: {selectedVerses.length > 0 ? selectedVerses.join(', ') : 'None'}
        </p>
        <Button
          disabled={!selectedVerses.length}
          type="button"
          size="icon"
          variant="outline"
          onClick={closeAndClear}
          className="yv:text-primary"
        >
          <XIcon className="yv:size-4" />
        </Button>
      </div>

      <div ref={setScrollEl} className="yv:h-full yv:overflow-y-auto">
        <BibleTextView
          renderNotes={true}
          {...props}
          selectedVerses={selectedVerses}
          onVerseSelect={handleVerseSelect}
          highlightedVerses={highlightedVerses}
        />
      </div>

      <VerseActionPopover
        open={popoverOpen && selectedVerses.length > 0}
        onOpenChange={(open) => (open ? setPopoverOpen(true) : closeAndClear())}
        activeHighlights={activeHighlights}
        selectedVerses={selectedVerses}
        highlightedVerses={highlightedVerses}
        anchorElement={anchorElement}
        scrollRoot={scrollEl}
        onHighlight={handleHighlight}
        onClearHighlight={handleClearHighlight}
        onCopy={handleCopy}
        onShare={handleShare}
      />
    </div>
  );
}

export const VerseSelection: Story = {
  args: {
    reference: 'JHN.1',
    versionId: 111,
    renderNotes: true,
  },
  argTypes: {
    theme: {
      table: {
        disable: true,
      },
    },
    selectedVerses: {
      table: {
        disable: true,
      },
    },
    onVerseSelect: {
      table: {
        disable: true,
      },
    },
    highlightedVerses: {
      table: {
        disable: true,
      },
    },
  },
  render: (props) => <VerseSelectionDemo {...props} />,
};
