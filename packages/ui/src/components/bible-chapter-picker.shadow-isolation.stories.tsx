import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { waitFor, waitForElement, waitForShadowRoot } from '../test/storybook-dom';
import { BibleChapterPicker } from './bible-chapter-picker';

function AutomaticBibleChapterPicker(): React.ReactNode {
  const [book, setBook] = useState('MAT');
  const [chapter, setChapter] = useState('5');

  return (
    <BibleChapterPicker.Root
      book={book}
      onBookChange={setBook}
      chapter={chapter}
      onChapterChange={setChapter}
      versionId={111}
    >
      <BibleChapterPicker.Trigger />
    </BibleChapterPicker.Root>
  );
}

const meta = {
  title: 'Components/BibleChapterPicker/Shadow isolation',
  component: AutomaticBibleChapterPicker,
  tags: ['integration', 'shadow-dom'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof AutomaticBibleChapterPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PublicRootJourney: Story = {
  render: () => (
    <div
      data-testid="clipping-container"
      style={{ inlineSize: 180, blockSize: 56, overflow: 'hidden', transform: 'translateZ(0)' }}
    >
      <AutomaticBibleChapterPicker />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const clippingContainer = await waitForElement<HTMLElement>(
      canvasElement,
      '[data-testid="clipping-container"]',
      'clipping container not rendered',
    );
    const root = await waitForShadowRoot(clippingContainer);
    await expect(canvasElement.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(1);
    await expect(root.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(0);

    const trigger = await waitForElement<HTMLElement>(
      root,
      '[data-slot="popover-trigger"]',
      'chapter picker trigger not rendered',
    );
    await userEvent.click(trigger);

    const topLayer = await waitForElement<HTMLElement>(
      root,
      '[data-yv-shadow-local-overlay]',
      'local top-layer container not created',
    );
    const panel = await waitForElement<HTMLElement>(
      topLayer,
      '[data-slot="popover-content"]',
      'chapter picker panel not rendered',
    );
    await expect(trigger.getRootNode()).toBe(root);
    await expect(panel.getRootNode()).toBe(root);
    await expect(topLayer.matches(':popover-open')).toBe(true);
    await expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    // SAFETY: The reflected-ARIA property is still a draft; verify browser support before use.
    const reflectedControls = (
      trigger as HTMLElement & { ariaControlsElements?: readonly Element[] }
    ).ariaControlsElements;
    if (!reflectedControls) throw new Error('browser did not expose ariaControlsElements');
    await expect(reflectedControls).toEqual([panel]);

    const panelQueries = within(panel);
    const search = panelQueries.getByPlaceholderText(/search/i);
    await userEvent.type(search, 'gen');
    await waitFor(async () => {
      await expect(search).toHaveValue('gen');
      await expect(panelQueries.getByRole('button', { name: /genesis/i })).toBeVisible();
    });
    await userEvent.click(panelQueries.getByRole('button', { name: /genesis/i }));
    await userEvent.click(await panelQueries.findByRole('button', { name: '11' }));

    await waitFor(async () => {
      await expect(trigger).toHaveTextContent(/genesis 11/i);
      await expect(topLayer.querySelector('[data-slot="popover-content"]')).toBeNull();
      await expect(root.activeElement).toBe(trigger);
    });
  },
};
