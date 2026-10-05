import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { requireShadowContent, waitFor, waitForShadowRoot } from '@/test/storybook-dom';
import { ScriptureStoryDataProvider } from '@/test/scripture-story-data';
import { BibleCard } from './bible-card';
import { BibleTextView } from './verse';
import { VerseOfTheDay } from './verse-of-the-day';

const HOSTILE_CSS = `
  [data-scripture-fixture] div,
  [data-scripture-fixture] section,
  [data-scripture-fixture] span,
  [data-scripture-fixture] button {
    box-sizing: content-box !important;
    background: rgb(255, 0, 128) !important;
    color: rgb(0, 128, 0) !important;
    font: 37px cursive !important;
  }
`;

function ScripturePresentationIsolationFixture(): React.ReactNode {
  return (
    <ScriptureStoryDataProvider>
      <style>{HOSTILE_CSS}</style>
      <main data-scripture-fixture style={{ display: 'grid', gap: 24, inlineSize: 900 }}>
        <div data-testid="standalone-scripture">
          <BibleTextView
            reference="JHN.3.16"
            versionId={111}
            fontFamily="Georgia"
            fontSize={18}
            lineHeight={1.7}
            showVerseNumbers={false}
            theme="dark"
            scriptureDirection="rtl"
            highlights={[]}
          />
        </div>
        <div data-testid="votd-default">
          <VerseOfTheDay dayOfYear={1} versionId={111} size="default" highlights={[]} />
        </div>
        <div data-testid="votd-large">
          <VerseOfTheDay dayOfYear={1} versionId={111} size="lg" highlights={[]} />
        </div>
        <div data-testid="card-default">
          <BibleCard reference="LUK.1.39-45" versionId={111} highlights={[]} />
        </div>
        <div data-testid="card-full-bleed">
          <BibleCard reference="LUK.1.39-45" versionId={111} maxWidth="100%" highlights={[]} />
        </div>
      </main>
    </ScriptureStoryDataProvider>
  );
}

const meta = {
  title: 'Components/Scripture presentation/Shadow isolation',
  component: ScripturePresentationIsolationFixture,
  parameters: {
    includeAuth: false,
    layout: 'padded',
  },
  tags: ['integration', 'shadow-dom', 'cross-browser'],
} satisfies Meta<typeof ScripturePresentationIsolationFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

async function fixtureRoot(canvasElement: HTMLElement, testId: string): Promise<ShadowRoot> {
  const fixture = within(canvasElement).getByTestId(testId);
  return waitForShadowRoot(fixture);
}

export const HostileCssAndRepresentativeLayouts: Story = {
  render: () => <ScripturePresentationIsolationFixture />,
  play: async ({ canvasElement }) => {
    const [scriptureRoot, defaultVotdRoot, largeVotdRoot, defaultCardRoot, fullCardRoot] =
      await Promise.all([
        fixtureRoot(canvasElement, 'standalone-scripture'),
        fixtureRoot(canvasElement, 'votd-default'),
        fixtureRoot(canvasElement, 'votd-large'),
        fixtureRoot(canvasElement, 'card-default'),
        fixtureRoot(canvasElement, 'card-full-bleed'),
      ]);
    const roots = [scriptureRoot, defaultVotdRoot, largeVotdRoot, defaultCardRoot, fullCardRoot];

    await waitFor(async () => {
      await expect(
        within(requireShadowContent(scriptureRoot)).getByText(/for God so loved the world/i),
      ).toBeVisible();
      await expect(
        within(requireShadowContent(defaultVotdRoot)).getByText(
          /for I am about to do something new/i,
        ),
      ).toBeVisible();
      await expect(
        within(requireShadowContent(largeVotdRoot)).getByText(
          /for I am about to do something new/i,
        ),
      ).toBeVisible();
      await expect(
        within(requireShadowContent(defaultCardRoot)).getByText(/at that time mary got ready/i),
      ).toBeVisible();
      await expect(
        within(requireShadowContent(fullCardRoot)).getByText(/at that time mary got ready/i),
      ).toBeVisible();
    });

    for (const root of roots) {
      await expect(root.querySelector('[data-yv-shadow-host]')).toBeNull();
      const sdkRoot = root.querySelector<HTMLElement>(
        '[data-yv-shadow-content-wrapper] > [data-yv-sdk]',
      );
      if (!sdkRoot) throw new Error('SDK content missing from scripture presentation root');
      await expect(getComputedStyle(sdkRoot).color).not.toBe('rgb(0, 128, 0)');
      await expect(getComputedStyle(sdkRoot).fontFamily).not.toContain('cursive');
    }

    const scripture = scriptureRoot.querySelector<HTMLElement>('[data-slot="yv-bible-renderer"]');
    await expect(scripture).toHaveAttribute('dir', 'rtl');
    await expect(scripture).toHaveAttribute('data-show-verse-numbers', 'false');
    await expect(scripture).toHaveStyle({
      '--yv-reader-font-family': 'Georgia',
      '--yv-reader-font-size': '18px',
      '--yv-reader-line-height': '1.7',
    });
    await expect(scriptureRoot.querySelector('[data-yv-theme="dark"]')).toBeInTheDocument();
  },
};
