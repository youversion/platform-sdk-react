import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import i18n from '../i18n';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { requireShadowRoot } from '../test/dom-stubs';
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
    setSelectedVerses([verse]);
    setOpen(true);
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
                  className="yv-v"
                  data-testid="verse-1"
                  onClick={(event) => selectVerse(1, event.currentTarget)}
                >
                  First verse
                </span>
                <span
                  ref={(element) => {
                    element?.setAttribute('v', '2');
                  }}
                  className="yv-v"
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
                setTimeout(() => setOpen(false), 25);
                return;
              }
              setOpen(nextOpen);
            }}
            activeHighlights={new Set()}
            selectedVerses={selectedVerses}
            highlightedVerses={{}}
            anchorElement={anchorElement}
            scrollRoot={readerScrollRoot}
            onHighlight={() => setOpen(false)}
            onClearHighlight={() => setOpen(false)}
            onCopy={() => setOpen(false)}
            onShare={() => setOpen(false)}
          />
        </ShadowRootHost>
      </div>
    </div>
  );
}

const meta = {
  title: 'Spikes/VerseActionPopover Shadow DOM isolation',
  component: IsolatedVerseActionPopover,
  tags: ['integration'],
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

async function waitForElement<ElementType extends Element>(
  container: ParentNode,
  selector: string,
  message: string,
): Promise<ElementType> {
  return waitFor(() => {
    const element = container.querySelector<ElementType>(selector);
    if (!element) throw new Error(message);
    return element;
  });
}

async function waitForClosed(topLayer: HTMLElement): Promise<void> {
  await waitFor(() => {
    void expect(topLayer.querySelector('[role="dialog"]')).toBeNull();
    void expect(topLayer.matches(':popover-open')).toBe(false);
  });
}

function getCopyButton(dialog: HTMLElement): HTMLButtonElement {
  return within(dialog).getByRole('button', { name: i18n.t('copy') });
}

export const PortalPlacementDockingReanchoringAndFocusRestoration: Story = {
  play: async ({ canvasElement }) => {
    const shadowRoot = await waitFor(() => requireShadowRoot(canvasElement));
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

    await waitFor(() => void expect(topLayer.matches(':popover-open')).toBe(true));
    void expect(topLayer.getRootNode()).toBe(shadowRoot);
    void expect(dialog.getRootNode()).toBe(shadowRoot);
    void expect(canvasElement.ownerDocument.body.querySelector('[role="dialog"]')).toBeNull();
    void expect(dialog).toHaveAccessibleName(/.+/);
    void expect(dialog.querySelector('[role="group"]')).toHaveAccessibleName(/.+/);
    await waitFor(() => void expect(shadowRoot.activeElement).toBe(dialog));

    const clippingRect = clippingContainer.getBoundingClientRect();
    const firstDialogRect = dialog.getBoundingClientRect();
    const escapesAbove = firstDialogRect.top < clippingRect.top - 1;
    const escapesBelow = firstDialogRect.bottom > clippingRect.bottom + 1;
    void expect(escapesAbove || escapesBelow).toBe(true);
    const sampleX = firstDialogRect.left + firstDialogRect.width / 2;
    const sampleY = escapesBelow
      ? Math.max(firstDialogRect.top + 2, clippingRect.bottom + 2)
      : Math.min(firstDialogRect.bottom - 2, clippingRect.top - 2);
    if (sampleY <= firstDialogRect.top || sampleY >= firstDialogRect.bottom)
      throw new Error('popover did not escape clipping bounds');
    const hit = shadowRoot.elementFromPoint(sampleX, sampleY);
    void expect(hit === dialog || (hit !== null && dialog.contains(hit))).toBe(true);

    readerScrollRoot.scrollTop = readerScrollRoot.scrollHeight;
    await waitFor(() => {
      const readerRect = readerScrollRoot.getBoundingClientRect();
      const dockedRect = dialog.getBoundingClientRect();
      void expect(Math.abs(dockedRect.top - (readerRect.top + 24))).toBeLessThan(12);
      void expect(
        Math.abs(dockedRect.left + dockedRect.width / 2 - (readerRect.left + readerRect.width / 2)),
      ).toBeLessThan(2);
    });
    readerScrollRoot.scrollTop = 0;
    await waitFor(() => {
      const returnedRect = dialog.getBoundingClientRect();
      void expect(Math.abs(returnedRect.left - firstDialogRect.left)).toBeLessThan(8);
      void expect(Math.abs(returnedRect.top - firstDialogRect.top)).toBeLessThan(12);
    });

    await userEvent.click(secondVerse);
    await waitFor(() => {
      const nextRect = dialog.getBoundingClientRect();
      void expect(nextRect.left).toBeGreaterThan(firstDialogRect.left + 20);
    });
    void expect(
      shadowRoot.querySelector('[data-testid="close-requests"]')?.getAttribute('data-count'),
    ).toBe('0');
    void expect(topLayer).toContainElement(dialog);

    await userEvent.keyboard('{Escape}');
    await waitForClosed(topLayer);
    void expect(shadowRoot.activeElement).toBe(priorControl);

    priorControl.focus();
    await userEvent.click(firstVerse);
    dialog = await waitForElement(topLayer, '[role="dialog"]', 'popover did not reopen');
    await userEvent.click(getCopyButton(dialog));
    await waitForClosed(topLayer);
    void expect(shadowRoot.activeElement).toBe(priorControl);

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
      () =>
        void expect(Number(closeRequestOutput.getAttribute('data-count'))).toBe(
          closeRequestsBeforeRejection + 1,
        ),
    );
    void expect(topLayer).toContainElement(dialog);
    void expect(canvasElement.ownerDocument.activeElement).toBe(rejectedOutsideControl);
    await userEvent.click(getCopyButton(dialog));
    await waitForClosed(topLayer);
    void expect(shadowRoot.activeElement).toBe(priorControl);

    priorControl.focus();
    await userEvent.click(firstVerse);
    await waitForElement(topLayer, '[role="dialog"]', 'popover did not reopen for delayed close');
    await userEvent.click(delayedOutsideControl);
    await waitForClosed(topLayer);
    void expect(canvasElement.ownerDocument.activeElement).toBe(delayedOutsideControl);

    priorControl.focus();
    await userEvent.click(firstVerse);
    await waitForElement(topLayer, '[role="dialog"]', 'popover did not reopen for outside click');
    await userEvent.click(outsideControl);
    await waitForClosed(topLayer);
    void expect(canvasElement.ownerDocument.activeElement).toBe(outsideControl);
  },
};
