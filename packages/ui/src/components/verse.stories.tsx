import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';
import React from 'react';

import { transformBibleHtml } from '@youversion/platform-core/browser';
import { useTheme } from '@youversion/platform-react-hooks';

import {
  type BibleTextViewProps,
  BibleTextView,
  FootnoteContent,
  Verse,
  getCleanVerseText,
} from './verse';
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

const SWIFT_PHASE_TWO_FIXTURE_HTML = `
  <div class="imt1">The Gospel According to John</div><div class="imt2">The Word Became Flesh</div>
  <div class="imte2">Introduction ending</div><div class="imt3">The witness of John</div><div class="is1">Jesus, the Lamb of God</div>
  <div class="imq">“Look, the Lamb of God, who takes away the sin of the world!”</div><div class="lh">The first disciples</div>
  <div class="li">Andrew followed Jesus.</div><div class="lim">Simon was called Peter.</div><div class="lf">They stayed with him that day.</div>
  <div class="mt1">John</div><div class="mt2">The Good News</div>
  <div class="p">An indented paragraph before a heading.</div><div class="r yv-h">See also Genesis 1:1</div><div class="sr">John 1:1–5</div>
  <div class="yv-h r">John 1:1–5</div><div class="cls">Grace be with you.</div>
  <div class="is1"><span class="rq">(Genesis 1:1)</span><span class="va">1a</span></div>
  <div><span class="rq"><span class="pn">(Genesis 1:1)</span></span> <span class="em"><span class="bd">Word</span></span>
    <span class="qac">A</span> <span class="sig">John</span> <span class="litl">Selah</span>
    <span class="ref">John 1:1</span> <span class="wg">λόγος</span> <span class="wh">דָּבָר</span> <span class="ior">1–5</span> <span class="xta">Gen 1:1</span></div>
  <div><span class="rq"><span class="it">Nested italic</span></span> <span class="is1"><span class="bdit">Nested medium italic</span></span>
    <span class="bd"><span class="bk">Book</span> <span class="add">addition</span></span>
    <span class="tl">logos</span> <span class="fq">quoted</span> <span class="fqa">alternate</span> <span class="qt">quotation</span> <span class="qs">Selah</span>
    <span class="rq"><span class="ord">th</span></span> <span class="is1"><span class="sup">sup</span></span> <span class="fv">a</span></div>
  <div class="p" data-indent-fixture>
    Indented ancestor: each heading below clears this first-line indent.
    <div class="cl">cl: Chapter label</div><div class="d">d: Descriptive title</div>
    <div class="imt">imt: Introduction title</div><div class="imt1">imt1: Introduction title 1</div>
    <div class="imt2">imt2: Introduction title 2</div><div class="imt3">imt3: Introduction title 3</div>
    <div class="imt4">imt4: Introduction title 4</div><div class="imte">imte: Introduction ending</div>
    <div class="imte1">imte1: Introduction ending 1</div><div class="imte2">imte2: Introduction ending 2</div>
    <div class="iot">iot: Introduction outline</div><div class="is">is: Introduction section</div>
    <div class="is1">is1: Introduction section 1</div><div class="is2">is2: Introduction section 2</div>
    <div class="mr">mr: Major section reference</div><div class="ms">ms: Major section</div>
    <div class="ms1">ms1: Major section 1</div><div class="ms2">ms2: Major section 2</div>
    <div class="ms3">ms3: Major section 3</div><div class="ms4">ms4: Major section 4</div>
    <div class="mt1">mt1: Main title 1</div><div class="mt2">mt2: Main title 2</div>
    <div class="pc">pc: Centered paragraph</div><div class="qc">qc: Centered poetry</div>
    <div class="r">r: Parallel reference</div><div class="s">s: Section heading</div>
    <div class="s1">s1: Section heading 1</div><div class="s2">s2: Section heading 2</div>
    <div class="s3">s3: Section heading 3</div><div class="s4">s4: Section heading 4</div>
    <div class="sr">sr: Section reference</div>
  </div>
  <div class="po">Dear children,</div><div class="p"><span class="yv-v" v="2"></span><span class="va">2a</span>
    In the beginning was the Word, and the Word was with God.
  </div>
`;

const SWIFT_PHASE_TWO_RTL_HTML = `
  <div class="mt1">בְּרֵאשִׁית</div><div class="p"><span class="yv-v" v="1"><span class="yv-vlbl">1</span><span class="va">1א</span>
  בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃</span></div>
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

export const SwiftPhaseTwoTypographyFixture: Story = {
  args: { reference: 'GEN.1', versionId: 111 },
  render: () => (
    <div data-yv-sdk data-yv-theme="light" className="yv:grid yv:gap-8 yv:lg:grid-cols-3">
      <section dir="ltr" className="yv:min-w-0">
        <h2 className="yv:font-sans yv:font-bold yv:mb-3">LTR</h2>
        <Verse.Html
          html={SWIFT_PHASE_TWO_FIXTURE_HTML}
          renderNotes={true}
          highlightedVerses={{ 2: '#f19c33' }}
        />
        <FootnoteContent
          verseNum="2"
          verseHtml="Deterministic verse context."
          notes={[
            '<span class="ft">The Greek is plural.</span><span class="fq">quoted text</span> <span class="fqa">alternate translation</span><span class="fp"><span class="fk">Word</span> <span class="fl">label</span> continues without an indent.</span>',
          ]}
        />
      </section>
      <section dir="rtl" className="yv:min-w-0">
        <h2 className="yv:font-sans yv:font-bold yv:mb-3">RTL</h2>
        <Verse.Html html={SWIFT_PHASE_TWO_RTL_HTML} showVerseNumbers={false} />
      </section>
      <section className="yv:min-w-0">
        <h2 className="yv:font-sans yv:font-bold yv:mb-3">Standalone HTML/CSS</h2>
        <div
          data-yv-sdk-bible-reader=""
          style={
            // SAFETY: CSSProperties omits custom properties; this is a valid CSS length variable.
            { '--yv-reader-font-size': '24px' } as React.CSSProperties
          }
          dangerouslySetInnerHTML={{ __html: SWIFT_PHASE_TWO_FIXTURE_HTML }}
        />
      </section>
    </div>
  ),
  parameters: { layout: 'padded' },
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const readers = canvasElement.querySelectorAll<HTMLElement>('[data-slot="yv-bible-renderer"]');
    const ltr = readers[0]!;
    const rtl = readers[1]!;
    const style = (selector: string) => getComputedStyle(ltr.querySelector<HTMLElement>(selector)!);

    await expect(style('.imt1').fontSize).toBe('23.4px');
    await expect(style('.imt1').marginTop).toBe('20px');
    await expect(style('.imte2').marginBottom).toBe('5px');
    await expect(style('.r.yv-h').textIndent).toBe('0px');
    await expect(style('.r.yv-h').marginTop).toBe('0px');
    await expect(style('.imq').paddingInlineStart).toBe('20px');
    await expect(style('.li').paddingInlineStart).toBe('20px');
    await expect(style('.lf').marginTop).toBe('10px');
    await expect(style('.rq').fontSize).toBe('16.6px');
    await expect(style('.is1 .rq').fontWeight).toBe('400');
    await expect(style('.is1 .va').fontSize).toBe('13px');
    await expect(style('.rq .pn').fontSize).toBe('20px');
    await expect(style('.rq .pn').fontStyle).toBe('normal');
    await expect(style('.em .bd').fontStyle).toBe('normal');
    await expect(style('.em .bd').fontWeight).toBe('700');
    await expect(style('.rq .it').fontSize).toBe('20px');
    await expect(style('.is1 .bdit').fontSize).toBe('20px');
    await expect(style('.is1 .bdit').fontWeight).toBe('500');
    await expect(style('.bd .bk').fontWeight).toBe('400');
    await expect(style('.bd .add').fontWeight).toBe('400');
    await expect(style('.rq .ord').fontSize).toBe('13px');
    await expect(style('.is1 .sup').fontSize).toBe('13px');
    await expect(style('.fv').fontSize).toBe('13px');
    await expect(style('.qac').fontSize).toBe('20px');
    await expect(style('.ref').fontStyle).toBe(style('.p').fontStyle);
    await expect(style('.va').display).toBe('inline');
    await expect(style('.yv-v .va').color).toBe(style('.yv-v').color);
    await expect(getComputedStyle(rtl.querySelector<HTMLElement>('.yv-vlbl')!).display).toBe(
      'none',
    );
    await expect(getComputedStyle(rtl).direction).toBe('rtl');
    await expect(getComputedStyle(rtl.querySelector<HTMLElement>('.va')!).display).toBe('none');
    await expect(style('.cls').textAlign).toBe('end');
    const references = ltr.querySelectorAll('.r.yv-h');
    await expect(getComputedStyle(references[0]!).fontWeight).toBe('500');
    await expect(getComputedStyle(references[1]!).fontWeight).toBe('500');

    const standalone = canvasElement.querySelector('[data-yv-sdk-bible-reader]')!;
    await expect(getComputedStyle(standalone.querySelector('.imt1')!).fontSize).toBe('28.08px');
    await expect(getComputedStyle(standalone.querySelector('.imt1')!).marginTop).toBe('24px');
    await expect(getComputedStyle(standalone.querySelector('.is1 .rq')!).fontSize).toBe('19.92px');
    await expect(getComputedStyle(standalone.querySelector('.is1 .va')!).fontSize).toBe('15.6px');

    // Highlighting changes the fill, not the inline box geometry at a wrap.
    await expect(style('.yv-v[v="2"]').backgroundColor).not.toBe(
      getComputedStyle(standalone.querySelector('.yv-v[v="2"]')!).backgroundColor,
    );
    for (const reader of [ltr, standalone]) {
      const verse = getComputedStyle(reader.querySelector('.yv-v[v="2"]')!);
      await expect(verse.paddingInlineStart).toBe('2px');
      await expect(verse.paddingInlineEnd).toBe('2px');
      await expect(verse.boxDecorationBreak).toBe('clone');
    }

    for (const reader of [ltr, standalone]) {
      const indented = reader.querySelector('[data-indent-fixture]')!;
      await expect(parseFloat(getComputedStyle(indented).textIndent)).toBeGreaterThan(0);
      await expect(indented.children.length).toBe(31);
      for (const heading of indented.children) {
        await expect(getComputedStyle(heading).textIndent).toBe('0px');
      }
    }

    const note = canvasElement.querySelector<HTMLElement>('[data-slot="yv-bible-note"]')!;
    const noteStyle = getComputedStyle(note);
    const fpStyle = getComputedStyle(note.querySelector<HTMLElement>('.fp')!);
    await expect(noteStyle.fontSize).toBe('12px');
    await expect(noteStyle.userSelect).not.toBe('none');
    await expect(fpStyle.textIndent).toBe('0px');
    await expect(fpStyle.marginTop).toBe('0px');
    await expect(getComputedStyle(note.querySelector<HTMLElement>('.fk')!).fontWeight).toBe('500');
    await expect(getComputedStyle(note.querySelector<HTMLElement>('.fq')!).fontStyle).toBe(
      'italic',
    );
    await expect(getComputedStyle(note.querySelector<HTMLElement>('.fqa')!).fontWeight).toBe('400');
  },
};

export const MixedVerseLabelSpacing: Story = {
  args: { reference: 'GEN.1', versionId: 111 },
  tags: ['integration'],
  render: () => {
    const raw =
      '<div><span class="yv-vlbl">1</span>Raw verse <span class="va">1a</span>Alternate label</div>';
    const transformed = transformBibleHtml(
      '<div><span class="yv-vlbl">2</span>Transformed verse <span class="va">2a</span>Alternate label</div>',
    ).html;
    const transformedLabels = transformBibleHtml(
      '<span class="yv-vlbl">3</span><span class="va">3a</span>',
    ).html;

    return (
      <div data-yv-sdk data-yv-sdk-bible-reader="">
        <div data-testid="raw-before" dangerouslySetInnerHTML={{ __html: raw }} />
        <div data-testid="transformed" dangerouslySetInnerHTML={{ __html: transformed }} />
        <div data-testid="raw-after" dangerouslySetInnerHTML={{ __html: raw }} />
        <div
          data-testid="transformed-labels"
          dangerouslySetInnerHTML={{ __html: transformedLabels }}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByTestId('raw-before');
    for (const fragment of ['raw-before', 'raw-after']) {
      const labels = canvasElement.querySelectorAll(
        `[data-testid="${fragment}"] :is(.yv-vlbl, .va)`,
      );
      await expect(labels.length).toBe(2);
      for (const label of labels) {
        await expect(label.textContent).not.toContain('\u00a0');
        await expect(getComputedStyle(label, '::after').content).toBe('"\u00a0"');
      }
    }
    for (const fragment of ['transformed', 'transformed-labels']) {
      const labels = canvasElement.querySelectorAll(
        `[data-testid="${fragment}"] :is(.yv-vlbl, .va)`,
      );
      await expect(labels.length).toBe(2);
      for (const label of labels) {
        await expect(label.textContent?.endsWith('\u00a0')).toBe(true);
        await expect(getComputedStyle(label, '::after').content).toBe('none');
      }
    }
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
  const providerTheme = useTheme();
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
        theme={props.theme ?? providerTheme}
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
