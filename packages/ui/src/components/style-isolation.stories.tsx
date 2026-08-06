/**
 * Hostile-host regression stories.
 *
 * Every story here renders one exported component inside a page whose global CSS
 * is actively trying to break it, measures the damage, and asserts on the
 * measurement. The assertions currently document the leak that exists today.
 * Later phases tighten them until they assert zero.
 *
 * These stories are also the visual evidence. Open one in Storybook and the
 * component should look wrong. A fixture that produces a diff but still looks
 * fine is measuring the wrong properties.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { INTER_FONT } from '@/lib/verse-html-utils';
import { BibleCard } from './bible-card';
import { BibleChapterPicker } from './bible-chapter-picker';
import { BibleReader, BibleThemeSettingsContent } from './bible-reader';
import { BibleVersionPicker } from './bible-version-picker';
import { BibleTextView, FootnoteContent } from './verse';
import { VerseActionPopover } from './verse-action-popover';
import { VerseOfTheDay } from './verse-of-the-day';
import { YouVersionAuthButton } from './YouVersionAuthButton';
import { ALL_HOSTILE_GROUPS, injectHostileCss, removeHostileCss } from '../test/hostile-host';
import type { HostileGroup } from '../test/hostile-host';
import {
  diffSnapshots,
  formatLeakReport,
  leakedProperties,
  snapshotComputedStyles,
} from '../test/style-diff';
import type { StyleLeak, StyleSnapshot } from '../test/style-diff';

/**
 * Properties every component leaks today, one per leak channel.
 *
 * `font-family` arrives by inheritance from the host `body`, because the SDK
 * reset sets a font on descendants of `[data-yv-sdk]` but not on the marked
 * element itself. `box-sizing` and `padding-top` arrive by direct match, because
 * the SDK's rules sit in a cascade layer and unlayered author CSS outranks every
 * layer no matter its specificity.
 *
 * Phase 3 removes the inherited ones. Phase 4 removes the direct-match ones.
 */
const KNOWN_LEAKED_PROPERTIES = ['box-sizing', 'font-family', 'padding-top'];

/**
 * The inheritance channel for a component whose root already pins `font-family`.
 *
 * `VerseOfTheDay` is the only exported component whose root carries
 * `yv:font-sans` (`verse-of-the-day.tsx:181`), so the host `body` font cannot
 * reach it. Every other inherited property still gets through, which is the
 * point: pinning one font by hand is not isolation. Phase 3 pins the whole set
 * for every component and this override goes away.
 */
const LEAKED_PROPERTIES_WITH_PINNED_FONT = ['box-sizing', 'letter-spacing', 'padding-top'];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SETTLE_INTERVAL_MS = 100;
const SETTLE_MAX_ATTEMPTS = 30;

/**
 * Snapshots once the subtree stops moving.
 *
 * Adding or removing a stylesheet starts every CSS transition the new values
 * touch, and SDK components transition colour and spacing. A snapshot taken a
 * frame later catches interpolated values, which then show up as leaks that no
 * amount of scoping would fix. Polling until two consecutive reads agree is what
 * separates a real leak from an animation frame.
 */
async function stableSnapshot(root: Element): Promise<StyleSnapshot> {
  let previous = snapshotComputedStyles(root);

  for (let attempt = 0; attempt < SETTLE_MAX_ATTEMPTS; attempt += 1) {
    await wait(SETTLE_INTERVAL_MS);
    const current = snapshotComputedStyles(root);
    if (diffSnapshots(previous, current).length === 0) return current;
    previous = current;
  }

  throw new Error(
    `Computed styles never settled after ${String(
      SETTLE_MAX_ATTEMPTS * SETTLE_INTERVAL_MS,
    )}ms. A tracked property is being animated, so the diff cannot be trusted.`,
  );
}

type LeakReport = {
  /** Leaks under every hostile group at once. */
  total: StyleLeak[];
  /** Leaks attributable to each group on its own. The residual report reads this. */
  byGroup: Record<HostileGroup, StyleLeak[]>;
};

/**
 * Measures how far the host CSS moves a rendered subtree.
 *
 * Hostile CSS is document-global, so a clean tree and a hostile tree cannot
 * coexist. The harness separates them in time instead of in space: it strips the
 * hostile styles, snapshots, then re-adds them one group at a time and snapshots
 * again. Measuring the same nodes throughout is what makes the structural path
 * keys line up.
 *
 * Leaves every group injected on the way out, so the story stays visibly broken
 * for manual inspection.
 */
async function measureLeaks(label: string, root: Element): Promise<LeakReport> {
  removeHostileCss();
  const clean = await stableSnapshot(root);

  const byGroup = {} as Record<HostileGroup, StyleLeak[]>;

  for (const group of ALL_HOSTILE_GROUPS) {
    removeHostileCss();
    const cleanup = injectHostileCss([group]);
    byGroup[group] = diffSnapshots(clean, await stableSnapshot(root));
    cleanup();
  }

  removeHostileCss();
  injectHostileCss('all');
  const total = diffSnapshots(clean, await stableSnapshot(root));

  const perGroup = ALL_HOSTILE_GROUPS.map(
    (group) => `  ${group}: ${byGroup[group].length} leak(s)`,
  ).join('\n');
  console.info(`${formatLeakReport(label, total)}\nby group:\n${perGroup}`);

  return { total, byGroup };
}

type IsolationStoryConfig = {
  /** Names the component in the console report. */
  label: string;
  render: () => ReactElement;
  /**
   * Waits for the component to finish loading, then returns the element to
   * snapshot. Return the SDK's own root, never the Storybook canvas: the canvas
   * is consumer DOM, and reporting leaks on it would be a false positive.
   */
  ready: (canvasElement: HTMLElement) => Promise<Element>;
  /** Defaults to {@link KNOWN_LEAKED_PROPERTIES}. */
  expectedLeaks?: string[];
};

type Story = StoryObj<Meta>;

function isolationStory(config: IsolationStoryConfig): Story {
  const expected = config.expectedLeaks ?? KNOWN_LEAKED_PROPERTIES;

  return {
    render: config.render,
    play: async ({ canvasElement }) => {
      const root = await config.ready(canvasElement);
      const report = await measureLeaks(config.label, root);

      await expect(report.total.length).toBeGreaterThan(0);
      await expect(leakedProperties(report.total)).toEqual(expect.arrayContaining(expected));
    },
  };
}

/** Waits for a selector to appear anywhere in the document and returns it. */
async function findIn(scope: ParentNode, selector: string): Promise<Element> {
  let found: Element | null = null;

  await waitFor(
    async () => {
      found = scope.querySelector(selector);
      await expect(found).not.toBeNull();
    },
    { timeout: 10000 },
  );

  return found as unknown as Element;
}

const meta = {
  title: 'Style Isolation/Hostile Host',
  parameters: {
    layout: 'fullscreen',
    // Every story in this file runs inside an adversarial page.
    hostileHost: 'all',
  },
  tags: ['integration'],
} satisfies Meta;

export default meta;

export const BibleCardInHostileHost: Story = isolationStory({
  label: 'BibleCard',
  render: () => (
    <div className="yv:w-full yv:p-8">
      <BibleCard reference="LUK.1.39-45" versionId={111} />
    </div>
  ),
  ready: async (canvasElement) => {
    await findIn(canvasElement, '[data-slot="yv-bible-renderer"]');
    return findIn(canvasElement, 'section[data-yv-sdk]');
  },
});

export const VerseOfTheDayInHostileHost: Story = isolationStory({
  label: 'VerseOfTheDay',
  expectedLeaks: LEAKED_PROPERTIES_WITH_PINNED_FONT,
  render: () => (
    <div className="yv:w-full yv:p-8">
      <VerseOfTheDay versionId={111} showSunIcon showBibleAppAttribution showShareButton />
    </div>
  ),
  ready: async (canvasElement) => {
    await findIn(canvasElement, '[data-slot="yv-bible-renderer"]');
    return findIn(canvasElement, '[data-yv-sdk]');
  },
});

export const BibleTextViewInHostileHost: Story = isolationStory({
  label: 'BibleTextView',
  render: () => (
    <div className="yv:w-full yv:p-8">
      <BibleTextView reference="JHN.1" versionId={111} renderNotes showVerseNumbers />
    </div>
  ),
  ready: async (canvasElement) => {
    // The footnote buttons are what `bareElements` targets, so wait for one.
    await findIn(canvasElement, 'button');
    return findIn(canvasElement, '[data-yv-sdk]');
  },
});

export const FootnoteContentInHostileHost: Story = isolationStory({
  label: 'FootnoteContent',
  render: () => (
    <div className="yv:w-full yv:p-8">
      <FootnoteContent
        verseNum="51"
        reference="John 1:51"
        notes={['The Greek is plural.', 'Or: heaven opened.']}
        verseHtml='<span>He then added, "Very truly I tell you, you will see heaven open."</span>'
        hasVerseContext
      />
    </div>
  ),
  ready: (canvasElement) => findIn(canvasElement, '[data-yv-sdk]'),
});

function VerseActionPopoverHarness(): ReactElement {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const noop = useRef(() => {
    /* the harness measures layout, not behaviour */
  }).current;

  return (
    <div data-yv-sdk className="yv:p-24">
      <p ref={setAnchor}>Selected verse</p>
      <VerseActionPopover
        open={anchor !== null}
        onOpenChange={noop}
        activeHighlights={new Set<string>()}
        selectedVerses={[16]}
        highlightedVerses={{}}
        anchorElement={anchor}
        onHighlight={noop}
        onClearHighlight={noop}
        onCopy={noop}
        onShare={noop}
      />
    </div>
  );
}

export const VerseActionPopoverInHostileHost: Story = isolationStory({
  label: 'VerseActionPopover',
  render: () => <VerseActionPopoverHarness />,
  // Portalled to document.body, so the canvas cannot reach it.
  ready: () => findIn(document.body, '[data-yv-sdk][role="dialog"]'),
});

function ChapterPickerHarness(): ReactElement {
  const [book, setBook] = useState('MAT');
  const [chapter, setChapter] = useState('5');

  return (
    <div data-yv-sdk className="yv:flex yv:justify-center yv:p-12">
      <BibleChapterPicker.Root
        book={book}
        onBookChange={setBook}
        chapter={chapter}
        onChapterChange={setChapter}
        versionId={111}
      >
        <BibleChapterPicker.Trigger />
      </BibleChapterPicker.Root>
    </div>
  );
}

export const BibleChapterPickerInHostileHost: Story = isolationStory({
  label: 'BibleChapterPicker',
  render: () => <ChapterPickerHarness />,
  // The closed trigger is two elements. Open the picker so the measurement sees
  // the book list, which is where nearly all of the picker's DOM lives.
  ready: async (canvasElement) => {
    await userEvent.click(await findIn(canvasElement, 'button'));
    await findIn(document.body, '[data-slot="accordion-trigger"]');
    return findIn(document.body, '[data-slot="popover-content"][data-yv-sdk]');
  },
});

function VersionPickerHarness(): ReactElement {
  const [versionId, setVersionId] = useState(111);

  return (
    <div data-yv-sdk className="yv:flex yv:justify-center yv:p-12">
      <BibleVersionPicker.Root versionId={versionId} onVersionChange={setVersionId}>
        <BibleVersionPicker.Trigger />
        <BibleVersionPicker.Content />
      </BibleVersionPicker.Root>
    </div>
  );
}

export const BibleVersionPickerInHostileHost: Story = isolationStory({
  label: 'BibleVersionPicker',
  render: () => <VersionPickerHarness />,
  // Same reasoning as the chapter picker: measure the open list, not the trigger.
  ready: async (canvasElement) => {
    await userEvent.click(await findIn(canvasElement, 'button'));
    await findIn(document.body, '[data-testid="version-list"] [role="listitem"]');
    return findIn(document.body, '[data-slot="popover-content"][data-yv-sdk]');
  },
});

export const BibleReaderInHostileHost: Story = isolationStory({
  label: 'BibleReader',
  render: () => (
    <div className="yv:h-screen yv:bg-background">
      <BibleReader.Root
        defaultVersionId={111}
        defaultBook="JHN"
        defaultChapter="1"
        fontFamily={INTER_FONT}
        lineSpacing={1.7}
        showVerseNumbers
      >
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>
    </div>
  ),
  ready: async (canvasElement) => {
    await findIn(canvasElement, '[data-slot="yv-bible-renderer"]');
    return findIn(canvasElement, '[data-yv-sdk]');
  },
});

function ThemeSettingsHarness(): ReactElement {
  const noop = useRef(() => {
    /* the harness measures layout, not behaviour */
  }).current;

  return (
    <div className="yv:p-12">
      <BibleThemeSettingsContent
        theme="light"
        fontSize={16}
        fontFamily={INTER_FONT}
        lineSpacing={1.7}
        onFontSelected={noop}
        onFontIncreased={noop}
        onFontDecreased={noop}
        onChangeLineSpacing={noop}
      />
    </div>
  );
}

export const BibleThemeSettingsContentInHostileHost: Story = isolationStory({
  label: 'BibleThemeSettingsContent',
  render: () => <ThemeSettingsHarness />,
  ready: async (canvasElement) => {
    await findIn(canvasElement, 'button');
    return findIn(canvasElement, '[data-yv-sdk]');
  },
});

export const YouVersionAuthButtonInHostileHost: Story = isolationStory({
  label: 'YouVersionAuthButton',
  render: () => (
    <div className="yv:p-12">
      <YouVersionAuthButton mode="signIn" />
    </div>
  ),
  ready: async (canvasElement) => {
    await findIn(canvasElement, 'button');
    return findIn(canvasElement, '[data-yv-sdk]');
  },
});
