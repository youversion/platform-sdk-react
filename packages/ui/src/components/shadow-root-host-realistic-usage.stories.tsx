import type { Meta, StoryObj } from '@storybook/react-vite';
import type { BibleBook, BibleVersion } from '@youversion/platform-core';
import { YouVersionContext, type HookOverrides } from '@youversion/platform-react-hooks';
import { http, HttpResponse } from 'msw';
import { StrictMode, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { spyOn, userEvent, waitFor } from 'storybook/test';
import { expect } from 'vitest';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { BibleCard } from './bible-card';
import { BibleReader } from './bible-reader';
import { ProfileAvatar } from './profile-avatar';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { VerseOfTheDay } from './verse-of-the-day';

const EXPECTED_COMPONENT_IDS = [
  'reader',
  'card-luke',
  'card-john',
  'votd-default',
  'votd-large',
  'avatar-primary',
  'avatar-secondary',
  'notes-primary',
  'notes-secondary',
  'notes-tertiary',
  'separator-primary',
  'separator-secondary',
];

const meta = {
  title: 'Spikes/Shadow DOM realistic usage',
  tags: ['integration', 'shadow-dom'],
  parameters: {
    includeAuth: false,
    layout: 'fullscreen',
    msw: {
      handlers: [
        http.get('*/v1/fonts/1/stylesheet', () =>
          HttpResponse.text('', { headers: { 'Content-Type': 'text/css' } }),
        ),
      ],
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const FIXTURE_BOOKS: BibleBook[] = [
  {
    id: 'JHN',
    title: 'John',
    full_title: 'The Gospel According to John',
    canon: 'new_testament',
    abbreviation: 'John',
    chapters: [{ id: '1', title: '1', passage_id: 'JHN.1' }],
  },
];

const FIXTURE_VERSION: BibleVersion = {
  id: 111,
  title: 'New International Version',
  abbreviation: 'NIV',
  localized_title: 'New International Version',
  localized_abbreviation: 'NIV',
  language_tag: 'en',
  books: ['JHN'],
  youversion_deep_link: 'https://bible.com/versions/111',
};

function fixturePassageContent(usfm: string): string {
  return `<div class="p"><span class="yv-v" v="1"></span><span class="yv-vlbl">1</span>Fixture scripture content for ${usfm}.</div>`;
}

const HOOK_OVERRIDES = {
  useBooks: () => ({
    books: { data: FIXTURE_BOOKS, next_page_token: null },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  usePassage: ({ usfm }) => ({
    passage: { id: usfm, content: fixturePassageContent(usfm), reference: usfm },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useVersion: () => ({
    version: FIXTURE_VERSION,
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useVerseOfTheDay: () => ({
    data: { day: 1, passage_id: 'JHN.3.16' },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
} satisfies HookOverrides;

function FixtureProviders({ children }: { children: ReactNode }): ReactNode {
  const parentContext = useContext(YouVersionContext);
  const value = parentContext
    ? { ...parentContext, hookOverrides: HOOK_OVERRIDES }
    : { appKey: 'test', hookOverrides: HOOK_OVERRIDES };

  return <YouVersionContext.Provider value={value}>{children}</YouVersionContext.Provider>;
}

interface FixtureItemProps {
  children: ReactNode;
  id: string;
}

function FixtureItem({ children, id }: FixtureItemProps): ReactNode {
  const content = <div data-realistic-component={id}>{children}</div>;

  return <ShadowRootHost>{content}</ShadowRootHost>;
}

function RealisticComponentMix(): ReactNode {
  return (
    <div
      data-testid="realistic-component-mix"
      style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
    >
      <FixtureItem id="reader">
        <BibleReader.Root
          defaultBook="JHN"
          defaultChapter="1"
          defaultVersionId={111}
          highlights={[]}
        >
          <BibleReader.Content />
        </BibleReader.Root>
      </FixtureItem>
      <FixtureItem id="card-luke">
        <BibleCard reference="LUK.1.39-45" versionId={111} highlights={[]} />
      </FixtureItem>
      <FixtureItem id="card-john">
        <BibleCard reference="JHN.3.16" versionId={111} highlights={[]} />
      </FixtureItem>
      <FixtureItem id="votd-default">
        <VerseOfTheDay versionId={111} dayOfYear={1} highlights={[]} />
      </FixtureItem>
      <FixtureItem id="votd-large">
        <VerseOfTheDay versionId={111} dayOfYear={1} size="lg" highlights={[]} />
      </FixtureItem>
      <FixtureItem id="avatar-primary">
        <ProfileAvatar name="SDK Reader" />
      </FixtureItem>
      <FixtureItem id="avatar-secondary">
        <ProfileAvatar name="Bible Partner" />
      </FixtureItem>
      <FixtureItem id="notes-primary">
        <Textarea defaultValue="Primary notes" />
      </FixtureItem>
      <FixtureItem id="notes-secondary">
        <Textarea defaultValue="Secondary notes" />
      </FixtureItem>
      <FixtureItem id="notes-tertiary">
        <Textarea defaultValue="Tertiary notes" />
      </FixtureItem>
      <FixtureItem id="separator-primary">
        <Separator decorative={false} />
      </FixtureItem>
      <FixtureItem id="separator-secondary">
        <Separator decorative={false} />
      </FixtureItem>
    </div>
  );
}

type EffectPhase = 'setup' | 'cleanup';

function EffectLifecycleProbe({
  recordEffectPhase,
}: {
  recordEffectPhase: (phase: EffectPhase) => void;
}): null {
  useEffect(() => {
    recordEffectPhase('setup');
    return () => recordEffectPhase('cleanup');
  }, [recordEffectPhase]);

  return null;
}

function LifecycleHarness({ strict }: { strict: boolean }): ReactNode {
  const [mounted, setMounted] = useState(false);
  const [effectCounts, setEffectCounts] = useState({ setup: 0, cleanup: 0 });
  const recordEffectPhase = useCallback((phase: EffectPhase): void => {
    setEffectCounts((current) => ({ ...current, [phase]: current[phase] + 1 }));
  }, []);
  const mix = mounted ? (
    <>
      <EffectLifecycleProbe recordEffectPhase={recordEffectPhase} />
      <RealisticComponentMix />
    </>
  ) : null;

  return (
    <main data-yv-sdk style={{ padding: '1.5rem' }}>
      <button type="button" onClick={() => setMounted((current) => !current)}>
        Toggle component mix
      </button>
      <span
        data-testid="effect-lifecycle-counts"
        data-effect-setup={effectCounts.setup}
        data-effect-cleanup={effectCounts.cleanup}
        hidden
      />
      {strict ? <StrictMode>{mix}</StrictMode> : mix}
    </main>
  );
}

interface MountedFixture {
  hosts: HTMLElement[];
  sheet: CSSStyleSheet;
}

function requireMountedFixture(canvasElement: HTMLElement): MountedFixture {
  const hosts = Array.from(
    canvasElement.ownerDocument.querySelectorAll<HTMLElement>('[data-yv-shadow-host]'),
  );
  expect(hosts).toHaveLength(EXPECTED_COMPONENT_IDS.length);

  const roots = hosts.map((host) => {
    if (!host.shadowRoot) throw new Error('shadow root not attached');
    return host.shadowRoot;
  });
  const componentIds = roots.map(
    (root) =>
      root.querySelector<HTMLElement>('[data-realistic-component]')?.dataset.realisticComponent,
  );
  expect(componentIds).toEqual(EXPECTED_COMPONENT_IDS);

  const components = new Map(
    roots.map((root, index) => [
      componentIds[index],
      root.querySelector<HTMLElement>('[data-realistic-component]'),
    ]),
  );
  const expectedPassages = new Map([
    ['reader', 'JHN.1'],
    ['card-luke', 'LUK.1.39-45'],
    ['card-john', 'JHN.3.16'],
    ['votd-default', 'JHN.3.16'],
    ['votd-large', 'JHN.3.16'],
  ]);
  for (const [id, usfm] of expectedPassages) {
    void expect(components.get(id)).toHaveTextContent(`Fixture scripture content for ${usfm}.`);
  }
  expect(
    components.get('avatar-primary')?.querySelector('[aria-label="SDK Reader"]'),
  ).not.toBeNull();
  expect(
    components.get('avatar-secondary')?.querySelector('[aria-label="Bible Partner"]'),
  ).not.toBeNull();
  void expect(components.get('notes-primary')?.querySelector('textarea')).toHaveValue(
    'Primary notes',
  );
  void expect(components.get('notes-secondary')?.querySelector('textarea')).toHaveValue(
    'Secondary notes',
  );
  void expect(components.get('notes-tertiary')?.querySelector('textarea')).toHaveValue(
    'Tertiary notes',
  );
  expect(components.get('separator-primary')?.querySelector('[role="separator"]')).not.toBeNull();
  expect(components.get('separator-secondary')?.querySelector('[role="separator"]')).not.toBeNull();

  const sheet = roots[0]?.adoptedStyleSheets[0];
  if (!sheet) throw new Error('shared SDK stylesheet not adopted');
  for (const root of roots) {
    expect(root.adoptedStyleSheets).toHaveLength(1);
    expect(root.adoptedStyleSheets[0]).toBe(sheet);
  }

  return { hosts, sheet };
}

interface ExpectedEffectCounts {
  firstMount: [setup: number, cleanup: number];
  removal: [setup: number, cleanup: number];
  secondMount: [setup: number, cleanup: number];
}

const NORMAL_EFFECT_COUNTS: ExpectedEffectCounts = {
  firstMount: [1, 0],
  removal: [1, 1],
  secondMount: [2, 1],
};

const STRICT_EFFECT_COUNTS: ExpectedEffectCounts = import.meta.env.DEV
  ? {
      firstMount: [2, 1],
      removal: [2, 2],
      secondMount: [4, 3],
    }
  : NORMAL_EFFECT_COUNTS;

function requireEffectCounts(
  canvasElement: HTMLElement,
  [setup, cleanup]: [setup: number, cleanup: number],
): void {
  const counts = canvasElement.querySelector('[data-testid="effect-lifecycle-counts"]');
  void expect(counts).toHaveAttribute('data-effect-setup', String(setup));
  void expect(counts).toHaveAttribute('data-effect-cleanup', String(cleanup));
}

async function exerciseLifecycle(
  canvasElement: HTMLElement,
  expectedEffectCounts: ExpectedEffectCounts,
): Promise<void> {
  const toggle = canvasElement.querySelector<HTMLButtonElement>('button');
  if (!toggle) throw new Error('lifecycle toggle not rendered');
  const consoleError = spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    await userEvent.click(toggle);
    const firstMount = await waitFor(() => {
      const fixture = requireMountedFixture(canvasElement);
      requireEffectCounts(canvasElement, expectedEffectCounts.firstMount);
      return fixture;
    });

    await userEvent.click(toggle);
    expect(canvasElement.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(0);
    expect(canvasElement.querySelector('[data-testid="realistic-component-mix"]')).toBeNull();
    requireEffectCounts(canvasElement, expectedEffectCounts.removal);

    await userEvent.click(toggle);
    const secondMount = await waitFor(() => {
      const fixture = requireMountedFixture(canvasElement);
      requireEffectCounts(canvasElement, expectedEffectCounts.secondMount);
      return fixture;
    });
    for (const host of secondMount.hosts) {
      expect(host.shadowRoot?.adoptedStyleSheets[0]).toBe(firstMount.sheet);
    }
    expect(consoleError).not.toHaveBeenCalled();
  } finally {
    consoleError.mockRestore();
  }
}

export const NormalLifecycle: Story = {
  render: () => (
    <FixtureProviders>
      <LifecycleHarness strict={false} />
    </FixtureProviders>
  ),
  play: async ({ canvasElement }) => {
    await exerciseLifecycle(canvasElement, NORMAL_EFFECT_COUNTS);
  },
};

export const StrictModeLifecycle: Story = {
  render: () => (
    <FixtureProviders>
      <LifecycleHarness strict />
    </FixtureProviders>
  ),
  play: async ({ canvasElement }) => {
    await exerciseLifecycle(canvasElement, STRICT_EFFECT_COUNTS);
  },
};
