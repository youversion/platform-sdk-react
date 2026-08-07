/**
 * Consumer-host regression stories.
 *
 * Each story renders one exported component in a page whose global CSS tries to
 * break it. The story then measures the damage, and asserts on the measurement.
 *
 * Every consumer CSS group must now report zero on every component:
 *
 * - `inheritedTypography` closed when `theme.css` started to declare the whole
 *   inherited set on `[data-yv-sdk]`. Cascade rank cannot stop inheritance. Only
 *   a declaration of the property can stop it.
 * - `preflight`, `bareElements` and `aggressiveReset` closed when SDK CSS left
 *   its `yv-sdk-*` cascade layers, and every selector gained a
 *   `:is([data-yv-sdk], [data-yv-sdk] …)` gate. The gate adds 0,2,0. That
 *   overrides a bare element selector at 0,0,1, and a universal selector at
 *   0,0,0.
 * - `important` and `highSpecificity` closed when the sheet moved into a
 *   declared `@layer yv` and its declarations became `!important`. Layer order
 *   reverses for important declarations, and unlayered-important ranks last, so
 *   a layered important SDK rule beats both. Importance also outranks
 *   specificity, which is why the id selector at 1,0,1 loses too.
 * - `remRebase` closed when the build started to convert every `rem` length in
 *   the sheet to `px`, and `src/styles/global.css` started to declare a
 *   `font-size` on the SDK root. That leak is in the unit and in inheritance,
 *   not in the cascade, so no selector, layer or `!important` could reach it.
 *
 * These stories are also the visual evidence. Open one in Storybook. The
 * component now looks correct, under CSS built to break it.
 *
 * See docs/adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md and
 * docs/adr/0006-layer-and-importantize-the-sdk-sheet.md.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

import { INTER_FONT } from '@/lib/verse-html-utils';
import { BibleCard } from './bible-card';
import { BibleChapterPicker } from './bible-chapter-picker';
import { BibleReader, BibleThemeSettingsContent } from './bible-reader';
import {
  BibleLanguagePickerContent,
  BibleVersionPicker,
  BibleVersionPickerLanguageTrigger,
} from './bible-version-picker';
import { ProfileAvatar } from './profile-avatar';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { BibleTextView, FootnoteContent } from './verse';
import { VerseActionPopover } from './verse-action-popover';
import { VerseOfTheDay } from './verse-of-the-day';
import { YouVersionAuthButton } from './YouVersionAuthButton';
import {
  ALL_CONSUMER_CSS_GROUPS,
  CONSUMER_CONTENT_CLASS,
  CONSUMER_HOST_ROOT_ID,
  injectConsumerContentCss,
  injectConsumerCss,
  removeConsumerCss,
} from '../test/consumer-host';
import type { ConsumerCssGroup } from '../test/consumer-host';
import {
  diffPlacements,
  diffSnapshots,
  formatLeakReport,
  snapshotComputedStyles,
} from '../test/style-diff';
import type { StyleLeak, StyleSnapshot } from '../test/style-diff';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SETTLE_INTERVAL_MS = 100;
const SETTLE_MAX_ATTEMPTS = 30;

/**
 * Takes a snapshot after the subtree becomes stable.
 *
 * A new or a removed stylesheet starts every CSS transition that the new values
 * touch, and SDK components transition color and spacing. A snapshot taken one
 * frame later reads interpolated values, which then appear as leaks that no
 * amount of scoping corrects. This function polls until two reads in a row
 * agree, which separates a real leak from an animation frame.
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
  /** Leaks under every consumer CSS group at once. */
  total: StyleLeak[];
  /** Leaks from each group on its own. The residual report reads this record. */
  byGroup: Record<ConsumerCssGroup, StyleLeak[]>;
};

/**
 * Measures how far the host CSS moves a rendered subtree.
 *
 * Consumer CSS is document-global, so a clean tree and a consumer tree cannot
 * exist together. The harness separates them in time, not in space. It removes
 * the consumer styles and takes a snapshot. Then it adds them back one consumer
 * CSS group at a time, and takes another snapshot. The structural path keys line
 * up because the harness measures the same nodes every time.
 *
 * The function leaves every group injected at the end, so the story stays
 * visibly broken for a manual inspection.
 */
async function measureLeaks(label: string, root: Element): Promise<LeakReport> {
  removeConsumerCss();
  const clean = await stableSnapshot(root);

  const byGroup = {} as Record<ConsumerCssGroup, StyleLeak[]>;

  for (const group of ALL_CONSUMER_CSS_GROUPS) {
    removeConsumerCss();
    const cleanup = injectConsumerCss([group]);
    byGroup[group] = diffSnapshots(clean, await stableSnapshot(root));
    cleanup();
  }

  removeConsumerCss();
  injectConsumerCss('all');
  const total = diffSnapshots(clean, await stableSnapshot(root));

  const perGroup = ALL_CONSUMER_CSS_GROUPS.map(
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
   * Waits for the component to finish its load, then returns the element to
   * snapshot. Return the SDK root, never the Storybook canvas. The canvas is
   * consumer DOM, and a leak report on it is a false positive.
   */
  ready: (canvasElement: HTMLElement) => Promise<Element>;
};

type Story = StoryObj<Meta>;

/**
 * The assertions are per group, never on the combined total.
 *
 * Groups can cancel each other. `preflight` sets `box-sizing: border-box` on
 * `*`, and `aggressiveReset` sets `content-box` on `*`. With both groups
 * injected, the later sheet wins, and the value returns to its start value.
 * `Separator` measures zero combined leaks for that reason, and `preflight`
 * alone still moves it. A read of the combined total calls that component
 * isolated, and it is not.
 */
function isolationStory(config: IsolationStoryConfig): Story {
  return {
    render: config.render,
    play: async ({ canvasElement }) => {
      const root = await config.ready(canvasElement);
      const report = await measureLeaks(config.label, root);

      // The inheritance channel. Nine properties on `body`, and none of them
      // match an SDK element. Everything that this group moves thus arrived by
      // inheritance. Zero means that `theme.css` declares the whole inherited
      // set on `[data-yv-sdk]`.
      await expect(report.byGroup.inheritedTypography).toEqual([]);

      // The direct-match channel, with one adversary per specificity band:
      // `aggressiveReset` at 0,0,0, and `bareElements` and `preflight` at 0,0,1.
      // The gate puts every SDK rule at 0,1,0 or higher, so all three lose.
      await expect(report.byGroup.aggressiveReset).toEqual([]);
      await expect(report.byGroup.bareElements).toEqual([]);
      await expect(report.byGroup.preflight).toEqual([]);

      // The two channels that specificity alone cannot win. `important` is
      // 0,0,1 and important. `highSpecificity` is 1,0,1 and normal. Both lose to
      // a layered important declaration, and neither used to.
      await expect(report.byGroup.important).toEqual([]);
      await expect(report.byGroup.highSpecificity).toEqual([]);

      // The unit channel. `html { font-size: 62.5% }` rescales every `rem` in
      // the document, and no selector can stop it: `rem` resolves against the
      // document root. Zero means the build converted the sheet's `rem` lengths
      // to `px`, and that the SDK root declares its own `font-size`.
      await expect(report.byGroup.remRebase).toEqual([]);

      // The positive control for `remRebase`. A root font-size that never
      // applied would make the zero above meaningless. `measureLeaks` leaves
      // every group injected, so the fixture is in place here.
      await expect(getComputedStyle(document.documentElement).fontSize).toBe('10px');

      // The positive control for the two groups above. Both fixtures target
      // `button`, so on a component with no button they measure zero for the
      // uninteresting reason. Assert that the selectors really match before
      // reading the zero as a result. `measureLeaks` leaves every group
      // injected, so the body id is in place here.
      const button = root.matches('button') ? root : root.querySelector('button');

      if (button) {
        await expect(button.matches(`#${CONSUMER_HOST_ROOT_ID} button`)).toBe(true);
        await expect(document.querySelector(`style[data-yv-consumer-host="important"]`)).not.toBe(
          null,
        );
      }
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
  title: 'Style Isolation/Consumer Host',
  parameters: {
    layout: 'fullscreen',
    // Every story in this file runs inside a consumer page.
    consumerHost: 'all',
  },
  tags: ['integration'],
} satisfies Meta;

export default meta;

export const BibleCardInConsumerHost: Story = isolationStory({
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

export const VerseOfTheDayInConsumerHost: Story = isolationStory({
  label: 'VerseOfTheDay',
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

export const BibleTextViewInConsumerHost: Story = isolationStory({
  label: 'BibleTextView',
  render: () => (
    <div className="yv:w-full yv:p-8">
      <BibleTextView reference="JHN.1" versionId={111} renderNotes showVerseNumbers />
    </div>
  ),
  ready: async (canvasElement) => {
    // `bareElements` targets the footnote buttons. Wait for one of them.
    await findIn(canvasElement, 'button');
    return findIn(canvasElement, '[data-yv-sdk]');
  },
});

export const FootnoteContentInConsumerHost: Story = isolationStory({
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
    /* the harness measures layout, not behavior */
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

export const VerseActionPopoverInConsumerHost: Story = isolationStory({
  label: 'VerseActionPopover',
  render: () => <VerseActionPopoverHarness />,
  // The popover renders into document.body, so the canvas cannot reach it.
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

export const BibleChapterPickerInConsumerHost: Story = isolationStory({
  label: 'BibleChapterPicker',
  render: () => <ChapterPickerHarness />,
  // The closed trigger is two elements. Open the picker, so that the measurement
  // includes the book list. Almost all of the picker DOM is in that list.
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

export const BibleVersionPickerInConsumerHost: Story = isolationStory({
  label: 'BibleVersionPicker',
  render: () => <VersionPickerHarness />,
  // Same reason as the chapter picker: measure the open list, not the trigger.
  ready: async (canvasElement) => {
    await userEvent.click(await findIn(canvasElement, 'button'));
    await findIn(document.body, '[data-testid="version-list"] [role="listitem"]');
    return findIn(document.body, '[data-slot="popover-content"][data-yv-sdk]');
  },
});

function VersionPickerLanguageTriggerHarness(): ReactElement {
  const [versionId, setVersionId] = useState(111);

  return (
    <div className="yv:flex yv:justify-center yv:p-12">
      <BibleVersionPicker.Root versionId={versionId} onVersionChange={setVersionId}>
        <BibleVersionPickerLanguageTrigger />
      </BibleVersionPicker.Root>
    </div>
  );
}

export const BibleVersionPickerLanguageTriggerInConsumerHost: Story = isolationStory({
  label: 'BibleVersionPickerLanguageTrigger',
  render: () => <VersionPickerLanguageTriggerHarness />,
  // The trigger is itself a stamped public root (`button[data-yv-sdk]`).
  ready: (canvasElement) => findIn(canvasElement, 'button[data-yv-sdk]'),
});

function LanguagePickerContentHarness(): ReactElement {
  const [versionId, setVersionId] = useState(111);

  return (
    <div className="yv:flex yv:justify-center yv:p-12">
      <BibleVersionPicker.Root versionId={versionId} onVersionChange={setVersionId}>
        <BibleLanguagePickerContent open />
      </BibleVersionPicker.Root>
    </div>
  );
}

export const BibleLanguagePickerContentInConsumerHost: Story = isolationStory({
  label: 'BibleLanguagePickerContent',
  render: () => <LanguagePickerContentHarness />,
  // Standalone content stays in the tree; search `document.body` anyway so a
  // portal mount still resolves. Wait for a language row (or the tabs when the
  // suggested list is empty) before measuring.
  ready: async () => {
    await findIn(
      document.body,
      '[data-yv-sdk][data-open] [role="listitem"], [data-yv-sdk][data-open] [role="tab"]',
    );
    return findIn(document.body, '[data-yv-sdk][data-open]');
  },
});

export const BibleReaderInConsumerHost: Story = isolationStory({
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
    /* the harness measures layout, not behavior */
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

export const BibleThemeSettingsContentInConsumerHost: Story = isolationStory({
  label: 'BibleThemeSettingsContent',
  render: () => <ThemeSettingsHarness />,
  ready: async (canvasElement) => {
    await findIn(canvasElement, 'button');
    return findIn(canvasElement, '[data-yv-sdk]');
  },
});

export const YouVersionAuthButtonInConsumerHost: Story = isolationStory({
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

export const ProfileAvatarInConsumerHost: Story = isolationStory({
  label: 'ProfileAvatar',
  render: () => (
    <div className="yv:p-12">
      <ProfileAvatar name="Cam Anderson" className="yv:size-16" />
    </div>
  ),
  ready: (canvasElement) => findIn(canvasElement, '[data-yv-sdk]'),
});

export const SeparatorInConsumerHost: Story = isolationStory({
  label: 'Separator',
  render: () => (
    <div className="yv:w-full yv:p-12">
      <Separator />
    </div>
  ),
  ready: (canvasElement) => findIn(canvasElement, '[data-yv-sdk]'),
});

export const TextareaInConsumerHost: Story = isolationStory({
  label: 'Textarea',
  render: () => (
    <div className="yv:w-full yv:p-12">
      <Textarea defaultValue="For God so loved the world." />
    </div>
  ),
  ready: (canvasElement) => findIn(canvasElement, '[data-yv-sdk]'),
});

/** The one consumer override that the README promises, in the form a consumer writes. */
const CONSUMER_TOKEN_OVERRIDE = `
[data-yv-sdk] {
  --yv-primary: rgb(255, 0, 255);
}
`;

const OVERRIDDEN_PRIMARY = 'rgb(255, 0, 255)';

/**
 * The other half of the guarantee: the theme still works.
 *
 * The gate on every selector raised SDK specificity. A change that walls the
 * consumer out of their own theme is a regression, not a fix. The token block in
 * `theme.css` is `[data-yv-sdk]` at 0,1,0, and a consumer override is the same
 * selector at the same weight. The tie thus resolves on source order, and the
 * consumer sheet always loads after ours.
 *
 * `yv:bg-primary` is the whole chain in one class. `@theme inline` compiles it
 * to `background-color: var(--yv-primary)`, and not to a frozen literal. That is
 * what lets a runtime token override reach a build-time utility.
 *
 * Consumer CSS is off here on purpose. This story measures one channel.
 */
export const ConsumerTokenOverrideStillApplies: Story = {
  parameters: { consumerHost: [] },
  render: () => (
    <div data-yv-sdk className="yv:p-12">
      <div data-testid="primary-swatch" className="yv:size-16 yv:bg-primary" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const swatch = await findIn(canvasElement, '[data-testid="primary-swatch"]');

    // Without this assertion, a token that never resolved passes the next
    // assertion by accident.
    await expect(getComputedStyle(swatch).backgroundColor).not.toBe(OVERRIDDEN_PRIMARY);

    const style = document.createElement('style');
    style.textContent = CONSUMER_TOKEN_OVERRIDE;
    document.head.appendChild(style);

    try {
      // waitFor, not a direct read. A change to a token starts any transition on
      // background-color, and the first frame reports an interpolated value.
      await waitFor(async () => {
        await expect(getComputedStyle(swatch).backgroundColor).toBe(OVERRIDDEN_PRIMARY);
      });
    } finally {
      style.remove();
    }
  },
};

/* -------------------------------------------------------------------------- */
/* Reverse direction: SDK CSS reaching into consumer content                   */
/* -------------------------------------------------------------------------- */

/**
 * The other direction, and the one nothing measured before.
 *
 * Every story above asks whether consumer CSS moves SDK DOM. These stories ask
 * whether SDK CSS moves consumer DOM. An SDK component that renders `children`
 * or render-prop output puts consumer markup inside a `[data-yv-sdk]` subtree,
 * where the old `[data-yv-sdk] *` arm matched it. `theme.css` then recolored it
 * and reset its box model, and after the layered-important change those
 * declarations carried `!important` as well.
 *
 * The answer is `data-yv-slot`. An SDK component stamps it on the element that
 * holds consumer content, and the gate stops there:
 *
 *   :is([data-yv-sdk], [data-yv-sdk] *:not([data-yv-slot], [data-yv-slot] *))
 *
 * The baseline is a placement, not a sheet state. See `diffPlacements` in
 * `src/test/style-diff.ts` for why, and `CONSUMER_CONTENT_CSS` in
 * `src/test/consumer-host.ts` for how the inheritance channel is closed. The
 * short version: a slot child that declares nothing still inherits `font-size`,
 * `color` and `font-family` from its SDK ancestors. That is normal CSS, it
 * happens to consumer content anywhere else in their page too, and it is not a
 * leak. The slot boundary stops selector matching only.
 *
 * See docs/adr/0008-stop-sdk-css-at-consumer-slots.md.
 */

/** Injects the consumer's own sheet, so the story is also correct to look at. */
function ConsumerContentStyles(): null {
  useLayoutEffect(() => injectConsumerContentCss(), []);
  return null;
}

/**
 * Consumer markup, block level.
 *
 * Every element here is one that `theme.css` names: `h1`-`h6`, `a`, `b`/`strong`,
 * `code`, `small`, `sub`/`sup`, `table`, `ol`/`ul`, `hr`, `button`, `input` and
 * `textarea`. A fixture of plain `div`s would only exercise the `*` rule and
 * would call the rest of the reset isolated without testing it.
 */
function ConsumerBlockContent({ testId }: { testId: string }): ReactElement {
  return (
    <div className={CONSUMER_CONTENT_CLASS} data-testid={testId}>
      <h2>Consumer heading</h2>
      <p>
        Consumer copy with <strong>strong</strong>, <em>emphasis</em>, <code>code</code>,{' '}
        <small>small</small>, <sub>sub</sub>, <sup>sup</sup> and{' '}
        <a href="#consumer-content">a link</a>.
      </p>
      <ul>
        <li>First consumer item</li>
        <li>Second consumer item</li>
      </ul>
      <table>
        <tbody>
          <tr>
            <td>Consumer cell</td>
          </tr>
        </tbody>
      </table>
      <hr />
      <button type="button">Consumer button</button>
      <input readOnly value="Consumer input" />
      <textarea readOnly value="Consumer textarea" />
    </div>
  );
}

/**
 * Consumer markup, phrasing content only.
 *
 * The trigger slots render inside a `<button>`. An `<a>`, a nested `<button>` or
 * a `<div>` there is invalid HTML, and the two placements would then not hold
 * the same DOM.
 */
function ConsumerPhrasingContent({ testId }: { testId: string }): ReactElement {
  return (
    <span className={CONSUMER_CONTENT_CLASS} data-testid={testId}>
      <strong>Consumer strong</strong>
      <em>Consumer emphasis</em>
      <code>Consumer code</code>
      <small>Consumer small</small>
      <span>Consumer span</span>
    </span>
  );
}

const OUTSIDE_TEST_ID = 'reverse-outside';
const INSIDE_TEST_ID = 'reverse-inside';

type ReverseStoryConfig = {
  /** Names the component in the console report. */
  label: string;
  render: () => ReactElement;
  /** Waits for the SDK component around the slot to finish its load. */
  ready?: () => Promise<unknown>;
  /**
   * The positive control sets this. A story that measures zero proves nothing
   * unless another story, run the same way, measures more than zero.
   */
  expectLeaks?: boolean;
};

function reverseStory(config: ReverseStoryConfig): Story {
  return {
    // No host CSS. This direction measures the SDK sheet, and a hostile consumer
    // sheet on top of it would only add noise the story does not assert on.
    parameters: { consumerHost: [] },
    render: config.render,
    play: async () => {
      if (config.ready) await config.ready();

      const outside = await findIn(document.body, `[data-testid="${OUTSIDE_TEST_ID}"]`);
      const inside = await findIn(document.body, `[data-testid="${INSIDE_TEST_ID}"]`);

      // The placements have to be what their names say, or the diff is between
      // two copies of the same thing and reads zero for the wrong reason.
      await expect(outside.closest('[data-yv-sdk]')).toBe(null);
      await expect(inside.closest('[data-yv-sdk]')).not.toBe(null);

      const leaks = diffPlacements(await stableSnapshot(outside), await stableSnapshot(inside));
      console.info(formatLeakReport(`${config.label} (reverse)`, leaks));

      if (config.expectLeaks) {
        await expect(leaks.length).toBeGreaterThan(0);
        return;
      }

      // The slot boundary has to exist before a zero means anything.
      await expect(inside.closest('[data-yv-slot]')).not.toBe(null);
      await expect(leaks).toEqual([]);
    },
  };
}

/**
 * `BibleReader.Root` renders SDK compound children and consumer children into
 * the same stamped `<div>`. The SDK cannot stamp that container as a slot: it
 * would strip the styling from `BibleReader.Content` and `BibleReader.Toolbar`.
 * So the slot here is the consumer's own, and `data-yv-slot` is a documented
 * opt-in. This story is that documentation, executed.
 */
function BibleReaderSlotHarness(): ReactElement {
  return (
    <div>
      <ConsumerContentStyles />
      <ConsumerBlockContent testId={OUTSIDE_TEST_ID} />
      <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
        <div data-yv-slot>
          <ConsumerBlockContent testId={INSIDE_TEST_ID} />
        </div>
      </BibleReader.Root>
    </div>
  );
}

export const BibleReaderConsumerSlot: Story = reverseStory({
  label: 'BibleReader.Root children',
  render: () => <BibleReaderSlotHarness />,
});

/** The same markup in the same place, with no `data-yv-slot` on it. */
function BibleReaderUnmarkedHarness(): ReactElement {
  return (
    <div>
      <ConsumerContentStyles />
      <ConsumerBlockContent testId={OUTSIDE_TEST_ID} />
      <BibleReader.Root defaultVersionId={111} defaultBook="JHN" defaultChapter="1">
        <ConsumerBlockContent testId={INSIDE_TEST_ID} />
      </BibleReader.Root>
    </div>
  );
}

/**
 * The positive control. Consumer content with no slot marker still takes the SDK
 * reset, by design: the gate cannot tell it apart from SDK DOM. A zero here
 * would mean the harness measures nothing.
 */
export const BibleReaderUnmarkedConsumerContentStillLeaks: Story = reverseStory({
  label: 'BibleReader.Root children, unmarked',
  render: () => <BibleReaderUnmarkedHarness />,
  expectLeaks: true,
});

function ChapterPickerSlotHarness(): ReactElement {
  const [book, setBook] = useState('MAT');
  const [chapter, setChapter] = useState('5');

  return (
    <div>
      <ConsumerContentStyles />
      <ConsumerPhrasingContent testId={OUTSIDE_TEST_ID} />
      <BibleChapterPicker.Root
        book={book}
        onBookChange={setBook}
        chapter={chapter}
        onChapterChange={setChapter}
        versionId={111}
      >
        <BibleChapterPicker.Trigger asChild={false}>
          <ConsumerPhrasingContent testId={INSIDE_TEST_ID} />
        </BibleChapterPicker.Trigger>
      </BibleChapterPicker.Root>
    </div>
  );
}

export const BibleChapterPickerTriggerConsumerSlot: Story = reverseStory({
  label: 'BibleChapterPicker.Trigger children',
  render: () => <ChapterPickerSlotHarness />,
});

function VersionPickerSlotHarness(): ReactElement {
  const [versionId, setVersionId] = useState(111);

  return (
    <div>
      <ConsumerContentStyles />
      <ConsumerPhrasingContent testId={OUTSIDE_TEST_ID} />
      <BibleVersionPicker.Root versionId={versionId} onVersionChange={setVersionId}>
        <BibleVersionPicker.Trigger asChild={false}>
          <ConsumerPhrasingContent testId={INSIDE_TEST_ID} />
        </BibleVersionPicker.Trigger>
      </BibleVersionPicker.Root>
    </div>
  );
}

export const BibleVersionPickerTriggerConsumerSlot: Story = reverseStory({
  label: 'BibleVersionPicker.Trigger children',
  render: () => <VersionPickerSlotHarness />,
});
