import type { Meta, StoryObj } from '@storybook/react-vite';
import { YouVersionProvider } from '@youversion/platform-react-hooks';
import { http, HttpResponse } from 'msw';
import { expect, waitFor, within } from 'storybook/test';
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
  decorators: [
    (Story: React.ComponentType): React.ReactElement => (
      <YouVersionProvider
        appKey={import.meta.env.STORYBOOK_YOUVERSION_APP_KEY}
        apiHost={import.meta.env.STORYBOOK_YOUVERSION_API_HOST}
      >
        <Story />
      </YouVersionProvider>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
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
  },
} satisfies Meta<typeof BibleTextView>;

export default meta;

type Story = StoryObj<typeof meta>;

const hideArgs = {
  reference: {
    table: {
      disable: true,
    },
  },
  versionId: {
    table: {
      disable: true,
    },
  },
};

export const SingleVerse: Story = {
  args: {
    reference: 'JHN.3.16',
    versionId: 111,
  },
  argTypes: hideArgs,
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
  },
  argTypes: hideArgs,
};

export const FullChapter: Story = {
  args: {
    reference: 'JHN.3',
    versionId: 111,
  },
  argTypes: hideArgs,
};

export const RealAPI: Story = {
  render: (args) => <DebouncedBibleTextView {...args} />,
  args: {
    reference: 'JHN.3.16',
    versionId: 111,
  },
  parameters: {
    msw: {
      handlers: [],
    },
  },
};
