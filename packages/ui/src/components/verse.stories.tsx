import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import React from 'react';

import { type BibleTextViewProps, BibleTextView } from './verse';
import { Button } from './ui/button';
import { XIcon } from '@/components/icons/x';
import { VerseActionPopover } from './verse-action-popover';

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

    await expect(await canvas.findByText('Loading...')).toBeInTheDocument();

    void waitFor(async () => {
      // The text loading indicates that the passages API
      // was called and the text is being rendered.
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
        const footnoteButton = canvasElement.querySelector('[data-verse-footnote] button');
        await expect(footnoteButton).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const footnoteButton = canvasElement.querySelector('[data-verse-footnote] button');
    await userEvent.click(footnoteButton!);

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

export const DarkMode: Story = {
  args: {
    reference: 'JHN.3.16',
    versionId: 111,
    renderNotes: true,
    theme: 'dark',
  },
  argTypes: {
    // The `theme` control is disabled across all of the Bible verse text
    // components, stories, except the dark mode one.
    theme: {
      table: {
        disable: false,
      },
    },
  },
  render: (args) => (
    <section className="yv:flex yv:flex-col yv:gap-4 yv:max-w-lg">
      <p className="yv:text-muted-foreground yv:font-sm">
        Important: The background and padding for this Story was added manually to showcase the text
        being influenced by the theme prop for the BibleTextView component. Otherwise, the text on a
        light theme would be white on white (aka unreadable)
      </p>
      <div className="yv:[&>div]:bg-background yv:[&>div]:p-4 yv:[&>div]:rounded-[8px]">
        <BibleTextView {...args} />
      </div>
    </section>
  ),
};

export const FootnotePopoverThemeLight: Story = {
  args: {
    reference: 'JHN.1',
    versionId: 111,
    renderNotes: true,
    showVerseNumbers: true,
    theme: 'light',
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

export const FootnotePopoverThemeDark: Story = {
  args: {
    reference: 'JHN.1',
    versionId: 111,
    renderNotes: true,
    showVerseNumbers: true,
    theme: 'dark',
  },
  tags: ['integration'],
  render: (args) => (
    <div className="yv:dark">
      <BibleTextView {...args} />
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

    await waitFor(
      async () => {
        const footnoteButton = canvasElement.querySelector('[data-verse-footnote] button');
        await expect(footnoteButton).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    const footnoteButton = canvasElement.querySelector('[data-verse-footnote] button');
    await expect(footnoteButton?.closest('[data-yv-theme="dark"]')).toBeInTheDocument();

    await userEvent.click(footnoteButton!);

    await waitFor(async () => {
      const popover = document.querySelector('[data-slot="popover-content"]');
      await expect(popover).toBeInTheDocument();
      await expect(popover?.closest('[data-yv-theme="dark"]')).toBeInTheDocument();
    });
  },
};

function VerseSelectionDemo(props: BibleTextViewProps) {
  const [selectedVerses, setSelectedVerses] = React.useState<number[]>([]);
  const [highlightedVerses, setHighlightedVerses] = React.useState<Record<number, string>>({});

  const handleHighlight = () => {
    setHighlightedVerses((prev) => {
      const next = { ...prev };
      for (const verse of selectedVerses) {
        next[verse] = 'e6d163'; // yellow
      }
      return next;
    });
    setSelectedVerses([]);
  };

  const handleClearHighlights = () => {
    setHighlightedVerses((prev) => {
      const next = { ...prev };
      for (const verse of selectedVerses) {
        delete next[verse];
      }
      return next;
    });
    setSelectedVerses([]);
  };

  return (
    <div
      data-yv-sdk
      className="yv:grid yv:grid-rows-[auto_1fr] yv:gap-4 yv:max-w-lg yv:h-svh yv:max-h-svh yv:overflow-hidden"
    >
      <div className="yv:flex yv:items-center yv:gap-2 yv:bg-secondary yv:py-2 yv:px-4 yv:rounded-sm yv:sticky yv:text-sm yv:text-muted-foreground">
        <p className="yv:flex-1">
          Selected: {selectedVerses.length > 0 ? selectedVerses.join(', ') : 'None'}
        </p>
        <Button
          onClick={handleHighlight}
          disabled={!selectedVerses.length}
          variant="outline"
          size="sm"
        >
          Highlight
        </Button>
        <Button
          onClick={handleClearHighlights}
          disabled={!selectedVerses.length}
          variant="outline"
          size="sm"
        >
          Clear
        </Button>
        <Button
          disabled={!selectedVerses.length}
          type="button"
          size="icon"
          variant="outline"
          onClick={() => setSelectedVerses([])}
          className="yv:text-primary"
        >
          <XIcon className="yv:size-4" />
        </Button>
      </div>

      <div className="yv:h-full yv:overflow-y-auto">
        <BibleTextView
          renderNotes={true}
          {...props}
          selectedVerses={selectedVerses}
          onVerseSelect={setSelectedVerses}
          highlightedVerses={highlightedVerses}
        />
      </div>
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

function VerseActionPopoverDemo(props: BibleTextViewProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [selectedVerses, setSelectedVerses] = React.useState<number[]>([]);
  const [highlightedVerses, setHighlightedVerses] = React.useState<Record<number, string>>({});
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [popoverPosition, setPopoverPosition] = React.useState({ x: 0, y: 0 });

  const handleVerseSelect = React.useCallback((verses: number[]) => {
    setSelectedVerses(verses);

    if (verses.length === 0) {
      setPopoverOpen(false);
      return;
    }

    // Position popover below last selected verse
    const lastVerse = Math.max(...verses);
    const verseEl = containerRef.current?.querySelector(`.yv-v[v="${lastVerse}"]`);
    if (verseEl) {
      const rect = verseEl.getBoundingClientRect();
      setPopoverPosition({
        x: rect.left + rect.width / 2,
        y: rect.bottom + 8,
      });
    }
    setPopoverOpen(true);
  }, []);

  // Derive activeHighlights from selected verses
  const activeHighlights = React.useMemo(() => {
    return new Set(
      selectedVerses.map((v) => highlightedVerses[v]).filter((c): c is string => Boolean(c)),
    );
  }, [selectedVerses, highlightedVerses]);

  const handleHighlight = React.useCallback(
    (color: string) => {
      setHighlightedVerses((prev) => {
        const next = { ...prev };
        for (const verse of selectedVerses) {
          next[verse] = color;
        }
        return next;
      });
      setPopoverOpen(false);
      setSelectedVerses([]);
    },
    [selectedVerses],
  );

  const handleClearHighlights = React.useCallback(() => {
    setHighlightedVerses((prev) => {
      const next = { ...prev };
      for (const verse of selectedVerses) {
        delete next[verse];
      }
      return next;
    });
    setPopoverOpen(false);
    setSelectedVerses([]);
  }, [selectedVerses]);

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
          onClick={() => {
            setSelectedVerses([]);
            setPopoverOpen(false);
          }}
          className="yv:text-primary"
        >
          <XIcon className="yv:size-4" />
        </Button>
      </div>

      <div className="yv:h-full yv:overflow-y-auto">
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
        onOpenChange={setPopoverOpen}
        activeHighlights={activeHighlights}
        selectedVerses={selectedVerses}
        highlightedVerses={highlightedVerses}
        position={popoverPosition}
        onHighlight={handleHighlight}
        onClearHighlights={handleClearHighlights}
        onCopy={() => {
          // Do nothing at this second
        }}
        onShare={() => {
          // Do nothing at this second
        }}
      />
    </div>
  );
}

export const VerseActionPopoverStory: Story = {
  name: 'Verse Action Popover',
  args: {
    reference: 'JHN.1',
    versionId: 111,
    renderNotes: true,
  },
  argTypes: {
    theme: { table: { disable: true } },
    selectedVerses: { table: { disable: true } },
    onVerseSelect: { table: { disable: true } },
    highlightedVerses: { table: { disable: true } },
  },
  render: (props) => <VerseActionPopoverDemo {...props} />,
};
