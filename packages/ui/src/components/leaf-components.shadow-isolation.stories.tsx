import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { waitFor } from '@/test/storybook-dom';
import { FootnoteContent } from './verse';
import { ProfileAvatar } from './profile-avatar';
import { Separator } from './ui/separator';

const HOSTILE_CSS = `
  [data-leaf-fixture] span,
  [data-leaf-fixture] button,
  [data-leaf-fixture] [role="separator"] {
    box-sizing: content-box;
    background: rgb(255, 0, 128);
    color: rgb(0, 128, 0);
    font: 24px cursive;
    inline-size: 7px;
    block-size: 7px;
    padding: 19px;
  }
`;

function LeafIsolationFixture(): React.ReactNode {
  return (
    <>
      <style>{HOSTILE_CSS}</style>
      <main data-leaf-fixture style={{ display: 'grid', gap: 24, inlineSize: 360 }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: 8, inlineSize: 180 }}>
          <span data-testid="row-start">Start</span>
          <ProfileAvatar name="Cam Anderson" />
          <span data-testid="row-end">End</span>
        </div>
        <div style={{ display: 'grid', inlineSize: 180 }}>
          <Separator data-testid="horizontal-separator" decorative={false} />
        </div>
        <div style={{ alignItems: 'stretch', blockSize: 48, display: 'flex' }}>
          <Separator data-testid="vertical-separator" decorative={false} orientation="vertical" />
        </div>
        <FootnoteContent
          verseNum="16"
          notes={['A representative note']}
          verseHtml="For God so loved the world."
          reference="John 3"
          scriptureDirection="rtl"
          theme="dark"
        />
      </main>
    </>
  );
}

const meta = {
  title: 'Components/Leaf Shadow Isolation',
  component: LeafIsolationFixture,
  parameters: { includeAuth: false, layout: 'padded' },
  tags: ['integration', 'shadow-dom', 'cross-browser'],
} satisfies Meta<typeof LeafIsolationFixture>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HostileCssAndCompactGeometry: Story = {
  play: async ({ canvasElement }) => {
    const hosts = await waitFor(() => {
      const candidates = Array.from(
        canvasElement.querySelectorAll<HTMLElement>('[data-yv-shadow-host]'),
      );
      if (candidates.length !== 4 || candidates.some((host) => !host.shadowRoot)) {
        throw new Error('leaf component shadow roots not mounted');
      }
      return candidates;
    });
    const roots = hosts.map((host) => host.shadowRoot!);
    const [avatarRoot, horizontalRoot, verticalRoot, footnoteRoot] = roots;
    if (!avatarRoot || !horizontalRoot || !verticalRoot || !footnoteRoot) {
      throw new Error('leaf component root inventory incomplete');
    }
    const avatar = avatarRoot.querySelector<HTMLElement>('[data-slot="avatar"]')!;
    const avatarFallback = avatarRoot.querySelector<HTMLElement>('[data-slot="avatar-fallback"]')!;
    const horizontal = horizontalRoot.querySelector<HTMLElement>(
      '[data-testid="horizontal-separator"]',
    )!;
    const vertical = verticalRoot.querySelector<HTMLElement>('[data-testid="vertical-separator"]')!;
    const footnote = footnoteRoot
      .querySelector<HTMLElement>('[data-slot="yv-bible-note"]')!
      .closest<HTMLElement>('[data-yv-sdk]')!;

    await waitFor(async () => {
      const avatarRect = avatar.getBoundingClientRect();
      await expect(avatarRect.width).toBe(32);
      await expect(avatarRect.height).toBe(32);
      const startRect = canvasElement
        .querySelector<HTMLElement>('[data-testid="row-start"]')!
        .getBoundingClientRect();
      const endRect = canvasElement
        .querySelector<HTMLElement>('[data-testid="row-end"]')!
        .getBoundingClientRect();
      await expect(avatarRect.left).toBeGreaterThan(startRect.right);
      await expect(avatarRect.right).toBeLessThan(endRect.left);

      const horizontalRect = horizontal.getBoundingClientRect();
      await expect(horizontalRect.width).toBe(180);
      await expect(horizontalRect.height).toBe(1);
      const verticalRect = vertical.getBoundingClientRect();
      await expect(verticalRect.width).toBe(1);
      await expect(verticalRect.height).toBe(48);
    });

    await expect(getComputedStyle(avatar).backgroundColor).not.toBe('rgb(255, 0, 128)');
    await expect(getComputedStyle(avatarFallback).backgroundColor).toBe('rgb(255, 255, 255)');
    await expect(getComputedStyle(avatarFallback).borderColor).toBe('rgb(18, 18, 18)');
    await expect(getComputedStyle(horizontal).backgroundColor).toBe('rgb(221, 219, 219)');
    await expect(footnote).toHaveAttribute('data-yv-theme', 'dark');
    await expect(footnote).toHaveAttribute('dir', 'rtl');
    await expect(getComputedStyle(footnote).direction).toBe('rtl');
  },
};
