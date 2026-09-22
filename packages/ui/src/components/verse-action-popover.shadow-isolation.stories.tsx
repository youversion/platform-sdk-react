import type { Meta, StoryObj } from '@storybook/react-vite';
/* oxlint-disable typescript/await-thenable -- Vitest browser assertions are runtime-async. */

import { http, HttpResponse } from 'msw';
import { useRef, useState } from 'react';
import { userEvent, waitFor, within } from 'storybook/test';
import { expect } from 'vitest';
import i18n from '../i18n';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { waitForElement, waitForShadowRoot } from '../test/storybook-dom';
import { VerseActionPopover } from './verse-action-popover';

function IsolatedVerseActionPopover(): React.ReactNode {
  const [open, setOpen] = useState(false);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [readerScrollRoot, setReaderScrollRoot] = useState<HTMLDivElement | null>(null);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [closeRequests, setCloseRequests] = useState(0);
  const rejectNextCloseRef = useRef(false);
  const deferNextCloseRef = useRef(false);

  const selectVerse = (verse: number, element: HTMLElement): void => {
    setAnchorElement(element);
    setSelectedVerses((selected) => (selected.includes(verse) ? selected : [...selected, verse]));
    setOpen(true);
  };

  const closeAndClearSelection = (): void => {
    setOpen(false);
    setAnchorElement(null);
    setSelectedVerses([]);
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <button type="button" data-testid="outside-control">
        Outside control
      </button>
      <button
        type="button"
        data-testid="rejected-outside-control"
        onPointerDown={() => {
          rejectNextCloseRef.current = true;
        }}
      >
        Reject outside close
      </button>
      <button
        type="button"
        data-testid="delayed-outside-control"
        onPointerDown={() => {
          deferNextCloseRef.current = true;
        }}
      >
        Delay outside close
      </button>
      <div
        data-testid="clipping-container"
        style={{ inlineSize: 800, blockSize: 72, overflow: 'hidden' }}
      >
        <ShadowRootHost portalStrategy="local-top-layer">
          <div
            ref={setReaderScrollRoot}
            data-testid="reader-scroll-root"
            style={{ blockSize: 64, overflowBlock: 'auto' }}
          >
            <div style={{ display: 'grid', gap: 8 }}>
              <button type="button" data-testid="prior-control">
                Prior control
              </button>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span
                  ref={(element) => {
                    element?.setAttribute('v', '1');
                  }}
                  className={selectedVerses.includes(1) ? 'yv-v yv-v-selected' : 'yv-v'}
                  data-testid="verse-1"
                  onClick={(event) => selectVerse(1, event.currentTarget)}
                >
                  First verse
                </span>
                <span
                  ref={(element) => {
                    element?.setAttribute('v', '2');
                  }}
                  className={selectedVerses.includes(2) ? 'yv-v yv-v-selected' : 'yv-v'}
                  data-testid="verse-2"
                  onClick={(event) => selectVerse(2, event.currentTarget)}
                >
                  Second verse
                </span>
              </div>
              <output data-testid="close-requests" data-count={closeRequests} />
              <div aria-hidden="true" style={{ blockSize: 280 }} />
            </div>
          </div>
          <VerseActionPopover
            open={open}
            onOpenChange={(nextOpen) => {
              if (!nextOpen) setCloseRequests((count) => count + 1);
              if (!nextOpen && rejectNextCloseRef.current) {
                rejectNextCloseRef.current = false;
                return;
              }
              if (!nextOpen && deferNextCloseRef.current) {
                deferNextCloseRef.current = false;
                setTimeout(closeAndClearSelection, 25);
                return;
              }
              if (nextOpen) setOpen(true);
              else closeAndClearSelection();
            }}
            activeHighlights={new Set()}
            selectedVerses={selectedVerses}
            highlightedVerses={{}}
            anchorElement={anchorElement}
            scrollRoot={readerScrollRoot}
            onHighlight={closeAndClearSelection}
            onClearHighlight={closeAndClearSelection}
            onCopy={closeAndClearSelection}
            onShare={closeAndClearSelection}
          />
        </ShadowRootHost>
      </div>
    </div>
  );
}

const meta = {
  title: 'Spikes/VerseActionPopover Shadow DOM isolation',
  component: IsolatedVerseActionPopover,
  tags: ['integration', 'shadow-dom'],
  parameters: {
    layout: 'centered',
    msw: {
      handlers: [
        http.get('*/v1/fonts/1/stylesheet', () =>
          HttpResponse.text('', { headers: { 'Content-Type': 'text/css' } }),
        ),
      ],
    },
  },
} satisfies Meta<typeof IsolatedVerseActionPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

async function waitForClosed(topLayer: HTMLElement): Promise<void> {
  await waitFor(async () => {
    await expect(topLayer.querySelector('[role="dialog"]')).toBeNull();
    await expect(topLayer.matches(':popover-open')).toBe(false);
  });
}

function getCopyButton(dialog: HTMLElement): HTMLButtonElement {
  return within(dialog).getByRole('button', { name: i18n.t('copy') });
}

export const PortalPlacementDockingReanchoringAndFocusRestoration: Story = {
  play: async ({ canvasElement }) => {
    const shadowRoot = await waitForShadowRoot(canvasElement);
    const priorControl = await waitForElement<HTMLButtonElement>(
      shadowRoot,
      '[data-testid="prior-control"]',
      'prior focus control not rendered',
    );
    const firstVerse = await waitForElement<HTMLElement>(
      shadowRoot,
      '[data-testid="verse-1"]',
      'first verse not rendered',
    );
    const secondVerse = await waitForElement<HTMLElement>(
      shadowRoot,
      '[data-testid="verse-2"]',
      'second verse not rendered',
    );
    const clippingContainer = canvasElement.querySelector<HTMLElement>(
      '[data-testid="clipping-container"]',
    );
    const readerScrollRoot = await waitForElement<HTMLElement>(
      shadowRoot,
      '[data-testid="reader-scroll-root"]',
      'reader scroll root not rendered',
    );
    const outsideControl = canvasElement.querySelector<HTMLButtonElement>(
      '[data-testid="outside-control"]',
    );
    const rejectedOutsideControl = canvasElement.querySelector<HTMLButtonElement>(
      '[data-testid="rejected-outside-control"]',
    );
    const delayedOutsideControl = canvasElement.querySelector<HTMLButtonElement>(
      '[data-testid="delayed-outside-control"]',
    );
    if (!clippingContainer || !outsideControl || !rejectedOutsideControl || !delayedOutsideControl)
      throw new Error('light DOM controls not rendered');

    priorControl.focus();
    await userEvent.click(firstVerse);
    const topLayer = await waitForElement<HTMLElement>(
      shadowRoot,
      '[data-yv-shadow-local-overlay]',
      'shadow-local top layer not created',
    );
    let dialog = await waitForElement<HTMLElement>(
      topLayer,
      '[role="dialog"]',
      'verse action popover not rendered',
    );

    await waitFor(async () => await expect(topLayer.matches(':popover-open')).toBe(true));
    await expect(topLayer.getRootNode()).toBe(shadowRoot);
    await expect(dialog.getRootNode()).toBe(shadowRoot);
    await expect(canvasElement.ownerDocument.body.querySelector('[role="dialog"]')).toBeNull();
    await expect(dialog).toHaveAccessibleName(/.+/);
    await expect(dialog.querySelector('[role="group"]')).toHaveAccessibleName(/.+/);
    await waitFor(async () => await expect(shadowRoot.activeElement).toBe(dialog));

    const clippingRect = clippingContainer.getBoundingClientRect();
    const firstDialogRect = dialog.getBoundingClientRect();
    const escapesAbove = firstDialogRect.top < clippingRect.top - 1;
    const escapesBelow = firstDialogRect.bottom > clippingRect.bottom + 1;
    await expect(escapesAbove || escapesBelow).toBe(true);
    const sampleX = firstDialogRect.left + firstDialogRect.width / 2;
    const sampleY = escapesBelow
      ? Math.max(firstDialogRect.top + 2, clippingRect.bottom + 2)
      : Math.min(firstDialogRect.bottom - 2, clippingRect.top - 2);
    if (sampleY <= firstDialogRect.top || sampleY >= firstDialogRect.bottom)
      throw new Error('popover did not escape clipping bounds');
    const hit = shadowRoot.elementFromPoint(sampleX, sampleY);
    await expect(hit === dialog || (hit !== null && dialog.contains(hit))).toBe(true);

    readerScrollRoot.scrollTop = readerScrollRoot.scrollHeight;
    await waitFor(async () => {
      const readerRect = readerScrollRoot.getBoundingClientRect();
      const dockedRect = dialog.getBoundingClientRect();
      await expect(Math.abs(dockedRect.top - (readerRect.top + 24))).toBeLessThan(12);
      await expect(
        Math.abs(dockedRect.left + dockedRect.width / 2 - (readerRect.left + readerRect.width / 2)),
      ).toBeLessThan(2);
    });
    readerScrollRoot.scrollTop = 0;
    await waitFor(async () => {
      const returnedRect = dialog.getBoundingClientRect();
      await expect(Math.abs(returnedRect.left - firstDialogRect.left)).toBeLessThan(12);
      await expect(Math.abs(returnedRect.top - firstDialogRect.top)).toBeLessThan(12);
    });

    await userEvent.click(secondVerse);
    await waitFor(async () => {
      const nextRect = dialog.getBoundingClientRect();
      await expect(nextRect.left).toBeGreaterThan(firstDialogRect.left + 20);
    });
    await expect(
      shadowRoot.querySelector('[data-testid="close-requests"]')?.getAttribute('data-count'),
    ).toBe('0');
    await expect(topLayer).toContainElement(dialog);

    await userEvent.keyboard('{Escape}');
    await waitForClosed(topLayer);
    await expect(shadowRoot.activeElement).toBe(priorControl);

    priorControl.focus();
    await userEvent.click(firstVerse);
    dialog = await waitForElement(topLayer, '[role="dialog"]', 'popover did not reopen');
    await userEvent.click(getCopyButton(dialog));
    await waitForClosed(topLayer);
    await expect(shadowRoot.activeElement).toBe(priorControl);

    priorControl.focus();
    await userEvent.click(firstVerse);
    dialog = await waitForElement(
      topLayer,
      '[role="dialog"]',
      'popover did not reopen for rejected outside close',
    );
    const closeRequestOutput = shadowRoot.querySelector<HTMLOutputElement>(
      '[data-testid="close-requests"]',
    );
    if (!closeRequestOutput) throw new Error('close request output missing');
    const closeRequestsBeforeRejection = Number(closeRequestOutput.getAttribute('data-count'));
    await userEvent.click(rejectedOutsideControl);
    await waitFor(
      async () =>
        await expect(Number(closeRequestOutput.getAttribute('data-count'))).toBe(
          closeRequestsBeforeRejection + 1,
        ),
    );
    await expect(topLayer).toContainElement(dialog);
    await expect(canvasElement.ownerDocument.activeElement).toBe(rejectedOutsideControl);
    await userEvent.click(getCopyButton(dialog));
    await waitForClosed(topLayer);
    await expect(shadowRoot.activeElement).toBe(priorControl);

    priorControl.focus();
    await userEvent.click(firstVerse);
    await waitForElement(topLayer, '[role="dialog"]', 'popover did not reopen for delayed close');
    await userEvent.click(delayedOutsideControl);
    await waitForClosed(topLayer);
    await expect(canvasElement.ownerDocument.activeElement).toBe(delayedOutsideControl);

    priorControl.focus();
    await userEvent.click(firstVerse);
    await waitForElement(topLayer, '[role="dialog"]', 'popover did not reopen for outside click');
    await userEvent.click(outsideControl);
    await waitForClosed(topLayer);
    await expect(canvasElement.ownerDocument.activeElement).toBe(outsideControl);

    const closeRequestsBeforeTouch = Number(closeRequestOutput.getAttribute('data-count'));
    const touchUser = userEvent.setup({ document: canvasElement.ownerDocument });
    await touchUser.pointer({ keys: '[TouchA]', target: firstVerse });
    dialog = await waitForElement(topLayer, '[role="dialog"]', 'popover did not open for touch');
    const touchDialogRect = dialog.getBoundingClientRect();
    await touchUser.pointer({ keys: '[TouchA]', target: secondVerse });
    await expect(firstVerse).toHaveClass('yv-v-selected');
    await expect(secondVerse).toHaveClass('yv-v-selected');
    await expect(dialog).toHaveAttribute('data-state', 'open');
    await expect(Number(closeRequestOutput.getAttribute('data-count'))).toBe(
      closeRequestsBeforeTouch,
    );
    await waitFor(async () => {
      await expect(dialog.getBoundingClientRect().left).toBeGreaterThan(touchDialogRect.left + 20);
    });
    await touchUser.pointer({ keys: '[TouchA>]', target: outsideControl });
    await expect(dialog).toHaveAttribute('data-state', 'open');
    await touchUser.pointer({ keys: '[/TouchA]', target: outsideControl });
    await waitForClosed(topLayer);
    await expect(Number(closeRequestOutput.getAttribute('data-count'))).toBe(
      closeRequestsBeforeTouch + 1,
    );
    await expect(canvasElement.ownerDocument.activeElement).toBe(outsideControl);
  },
};
/* oxlint-disable typescript/await-thenable -- Vitest browser assertions are runtime-async. */
/* oxlint-disable typescript/await-thenable -- Vitest browser assertions are runtime-async. */
