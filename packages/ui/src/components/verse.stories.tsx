import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import React from 'react';

import { BibleTextView } from './verse';

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
      description: 'Bible version ID (e.g., 111 for NLT)',
    },
    fontFamily: {
      control: 'text',
      description: 'Font family for the Bible text',
    },
    fontSize: {
      control: 'number',
      description: 'Font size in pixels',
    },
    lineHeight: {
      control: 'number',
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

function VerseSelectionDemo(props) {
  const [selectedVerses, setSelectedVerses] = React.useState<number[]>([]);

  return (
    <div
      data-yv-sdk
      className="yv:grid yv:grid-rows-[auto_1fr] yv:gap-4 yv:max-w-lg yv:h-svh yv:max-h-svh yv:overflow-hidden"
    >
      <div className="yv:bg-secondary yv:py-2 yv:px-4 yv:rounded-sm yv:sticky yv:text-sm yv:text-muted-foreground">
        Selected: {selectedVerses.length > 0 ? selectedVerses.join(', ') : 'None'}
        {selectedVerses.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedVerses([])}
            className="yv:ml-2 yv:text-primary yv:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="yv:h-full yv:overflow-y-auto">
        <BibleTextView
          reference="JHN.1"
          versionId={111}
          renderNotes={true}
          {...props}
          selectedVerses={selectedVerses}
          onVerseSelect={setSelectedVerses}
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
  render: (props) => <VerseSelectionDemo {...props} />,
};
