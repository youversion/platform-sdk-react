import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import { tabbable } from 'tabbable';
import { requireShadowRoot } from '../test/dom-stubs';
import {
  ShadowOverlayOwnership,
  type ShadowOverlayFocusTarget,
  type ShadowOverlayKind,
} from './shadow-overlay-ownership';
import {
  getOwnShadowRoot,
  isElementFromOwnerDocument,
  ShadowRootHost,
} from './shadow-root-host';

const EXIT_DURATION_MS = 150;

function OwnershipProof(): React.ReactNode {
  const markerRef = useRef<HTMLDivElement | null>(null);
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  const rapidOpenerRef = useRef<HTMLButtonElement | null>(null);
  const ownershipRef = useRef(new ShadowOverlayOwnership());
  const exitTokensRef = useRef(new Map<string, number>());
  const pendingFocusTargetRef = useRef<ShadowOverlayFocusTarget>(null);
  const [topLayer, setTopLayer] = useState<HTMLElement | null>(null);
  const [revision, setRevision] = useState(0);
  const snapshot = ownershipRef.current.snapshot();

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  const mount = useCallback(
    (
      id: string,
      kind: ShadowOverlayKind,
      opener: HTMLElement,
      parentId?: string,
    ): void => {
      exitTokensRef.current.set(id, (exitTokensRef.current.get(id) ?? 0) + 1);
      ownershipRef.current.mount({ id, kind, opener, parentId });
      refresh();
    },
    [refresh],
  );

  const finishExit = useCallback(
    (id: string, token: number): void => {
      if (exitTokensRef.current.get(id) !== token) return;
      const layer = ownershipRef.current.snapshot().layers.find((candidate) => candidate.id === id);
      if (layer?.phase !== 'exiting') return;

      const focusTarget = ownershipRef.current.unmount(id);
      pendingFocusTargetRef.current = focusTarget;
      refresh();
    },
    [refresh],
  );

  const beginExit = useCallback(
    (id: string): void => {
      const exitingIds = ownershipRef.current.beginExit(id);
      refresh();
      for (const exitingId of exitingIds) {
        const token = (exitTokensRef.current.get(exitingId) ?? 0) + 1;
        exitTokensRef.current.set(exitingId, token);
        window.setTimeout(() => finishExit(exitingId, token), EXIT_DURATION_MS);
      }
    },
    [finishExit, refresh],
  );

  const dismissOwner = useCallback((): void => {
    const ownerId = ownershipRef.current.requestDismiss();
    if (ownerId) beginExit(ownerId);
  }, [beginExit]);

  useLayoutEffect(() => {
    const marker = markerRef.current;
    const root = marker ? getOwnShadowRoot(marker) : null;
    if (!marker || !root) return;

    const container = marker.ownerDocument.createElement('div');
    container.setAttribute('data-testid', 'ownership-top-layer');
    container.setAttribute('popover', 'manual');
    Object.assign(container.style, {
      background: 'transparent',
      border: '0',
      height: '100dvh',
      inset: '0',
      margin: '0',
      maxHeight: 'none',
      maxWidth: 'none',
      padding: '0',
      pointerEvents: 'none',
      width: '100dvw',
    });
    root.append(container);
    setTopLayer(container);
    return () => {
      if (container.matches(':popover-open')) container.hidePopover();
      container.remove();
    };
  }, []);

  useLayoutEffect(() => {
    if (!topLayer) return;
    backgroundRef.current!.inert = snapshot.backgroundInert;
    if (snapshot.layers.length > 0 && !topLayer.matches(':popover-open')) topLayer.showPopover();
    if (snapshot.layers.length === 0 && topLayer.matches(':popover-open')) topLayer.hidePopover();

    const pendingFocusTarget = pendingFocusTargetRef.current;
    pendingFocusTargetRef.current = null;
    if (pendingFocusTarget?.kind === 'element') {
      pendingFocusTarget.element.focus();
      return;
    }
    if (pendingFocusTarget?.kind === 'layer') {
      topLayer
        .querySelector<HTMLElement>(`[data-overlay-id="${pendingFocusTarget.id}"]`)
        ?.focus();
      return;
    }

    const owner = topLayer.querySelector<HTMLElement>(
      snapshot.ownerId ? `[data-overlay-id="${snapshot.ownerId}"]` : '[data-missing-owner]',
    );
    if (owner && snapshot.layers.find((layer) => layer.id === snapshot.ownerId)?.phase === 'active') {
      owner.focus();
    }
  }, [revision, snapshot.backgroundInert, snapshot.layers, snapshot.ownerId, topLayer]);

  useLayoutEffect(() => {
    if (!topLayer || !snapshot.modalOwnerId || !snapshot.ownerId) return;
    const owner = topLayer.querySelector<HTMLElement>(
      `[data-overlay-id="${snapshot.ownerId}"]`,
    );
    if (!owner) return;

    const handleFocusIn = (event: FocusEvent): void => {
      const [realTarget] = event.composedPath();
      if (!isElementFromOwnerDocument(realTarget, owner, 'Element')) return;
      if (!owner.contains(realTarget)) owner.focus();
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab' || event.defaultPrevented) return;
      const candidates = tabbable(owner);
      if (candidates.length === 0) {
        event.preventDefault();
        owner.focus();
        return;
      }

      const [realTarget] = event.composedPath();
      const currentIndex = candidates.findIndex((candidate) => candidate === realTarget);
      let nextIndex = 0;
      if (event.shiftKey) {
        nextIndex = currentIndex <= 0 ? candidates.length - 1 : currentIndex - 1;
      } else if (currentIndex !== -1 && currentIndex !== candidates.length - 1) {
        nextIndex = currentIndex + 1;
      }

      event.preventDefault();
      candidates[nextIndex]?.focus();
    };

    const ownerDocument = owner.ownerDocument;
    ownerDocument.addEventListener('focusin', handleFocusIn);
    owner.addEventListener('keydown', handleKeyDown);
    return () => {
      ownerDocument.removeEventListener('focusin', handleFocusIn);
      owner.removeEventListener('keydown', handleKeyDown);
    };
  }, [snapshot.modalOwnerId, snapshot.ownerId, topLayer]);

  useEffect(() => {
    const ownerDocument = topLayer?.ownerDocument;
    if (!ownerDocument) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (ownershipRef.current.snapshot().ownerId === null) return;
      event.preventDefault();
      dismissOwner();
    };
    ownerDocument.addEventListener('keydown', handleKeyDown);
    return () => ownerDocument.removeEventListener('keydown', handleKeyDown);
  }, [dismissOwner, topLayer]);

  return (
    <>
      <div ref={markerRef} />
      <div ref={backgroundRef} data-testid="proof-background">
        <button
          type="button"
          data-testid="open-popover-parent"
          onClick={(event) => mount('popover-parent', 'nonmodal', event.currentTarget)}
        >
          Open popover parent
        </button>
        <button
          type="button"
          data-testid="open-dialog-parent"
          onClick={(event) => mount('dialog-parent', 'modal', event.currentTarget)}
        >
          Open dialog parent
        </button>
        <button
          type="button"
          data-testid="open-first"
          onClick={(event) => mount('first', 'nonmodal', event.currentTarget)}
        >
          Open first overlay
        </button>
        <button
          type="button"
          data-testid="open-second"
          onClick={(event) => mount('second', 'nonmodal', event.currentTarget)}
        >
          Open second overlay
        </button>
        <button
          ref={rapidOpenerRef}
          type="button"
          data-testid="open-rapid-dialog"
          onClick={(event) => mount('rapid-dialog', 'modal', event.currentTarget)}
        >
          Open rapid dialog
        </button>
      </div>
      {topLayer
        ? createPortal(
            <>
              <button
                type="button"
                aria-label="Outside active overlay"
                data-testid="outside-layer"
                onClick={dismissOwner}
                tabIndex={-1}
                style={{
                  position: 'fixed',
                  insetBlockEnd: '16px',
                  insetInlineEnd: '16px',
                  border: '2px solid black',
                  background: 'white',
                  padding: '8px',
                  pointerEvents: 'auto',
                }}
              >
                Outside active overlay
              </button>
              {snapshot.layers.map((layer, index) => (
                <section
                  key={layer.id}
                  role={layer.kind === 'modal' ? 'dialog' : 'region'}
                  aria-label={layer.id}
                  aria-hidden={layer.id !== snapshot.ownerId}
                  data-overlay-id={layer.id}
                  data-owner={layer.id === snapshot.ownerId ? '' : undefined}
                  data-phase={layer.phase}
                  inert={layer.id !== snapshot.ownerId}
                  tabIndex={-1}
                  style={{
                    position: 'fixed',
                    insetBlockStart: `${80 + index * 40}px`,
                    insetInlineStart: `${80 + index * 40}px`,
                    padding: '16px',
                    pointerEvents: 'auto',
                    background: 'white',
                    border: '2px solid black',
                  }}
                >
                  <p>{layer.id}</p>
                  {layer.id === 'popover-parent' ? (
                    <button
                      type="button"
                      data-testid="popover-opens-dialog"
                      onClick={(event) =>
                        mount('popover-child-dialog', 'modal', event.currentTarget, layer.id)
                      }
                    >
                      Open child dialog
                    </button>
                  ) : null}
                  {layer.id === 'dialog-parent' ? (
                    <button
                      type="button"
                      data-testid="dialog-opens-popover"
                      onClick={(event) =>
                        mount('dialog-child-popover', 'nonmodal', event.currentTarget, layer.id)
                      }
                    >
                      Open child popover
                    </button>
                  ) : null}
                  {layer.id === 'rapid-dialog' ? (
                    <button
                      type="button"
                      data-testid="reopen-during-exit"
                      onClick={() => {
                        const opener = rapidOpenerRef.current;
                        if (opener) mount('rapid-dialog', 'modal', opener);
                      }}
                    >
                      Reopen during exit
                    </button>
                  ) : null}
                  <button
                    type="button"
                    data-testid={`close-${layer.id}`}
                    onClick={() => beginExit(layer.id)}
                  >
                    Close
                  </button>
                </section>
              ))}
            </>,
            topLayer,
          )
        : null}
    </>
  );
}

function OwnershipProofStory(): React.ReactNode {
  return (
    <>
      <button type="button" data-testid="host-page-control">
        Host page control
      </button>
      <ShadowRootHost>
        <OwnershipProof />
      </ShadowRootHost>
    </>
  );
}

const meta = {
  title: 'Spikes/Shadow overlay ownership',
  component: OwnershipProofStory,
  tags: ['integration'],
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/fonts/1/stylesheet', () =>
          HttpResponse.text('', { headers: { 'Content-Type': 'text/css' } }),
        ),
      ],
    },
  },
} satisfies Meta<typeof OwnershipProofStory>;

export default meta;
type Story = StoryObj<typeof meta>;

function requireElement<ElementType extends Element>(
  root: ParentNode,
  selector: string,
): ElementType {
  const element = root.querySelector<ElementType>(selector);
  if (!element) throw new Error(`Missing proof element: ${selector}`);
  return element;
}

async function expectOwner(root: ShadowRoot, id: string): Promise<HTMLElement> {
  return waitFor(() => {
    const owner = requireElement<HTMLElement>(root, '[data-owner]');
    void expect(owner).toHaveAttribute('data-overlay-id', id);
    return owner;
  });
}

async function expectUnmounted(root: ShadowRoot, id: string): Promise<void> {
  await waitFor(() =>
    void expect(root.querySelector(`[data-overlay-id="${id}"]`)).toBeNull(),
  );
}

async function expectActiveElement(root: ShadowRoot, element: Element): Promise<void> {
  await waitFor(() => void expect(root.activeElement).toBe(element));
}

async function expectFocusedOwner(root: ShadowRoot, id: string): Promise<HTMLElement> {
  const owner = await expectOwner(root, id);
  await expectActiveElement(root, owner);
  return owner;
}

export const ExercisesNestedConcurrentAndRapidReopenOwnership: Story = {
  play: async ({ canvasElement }) => {
    const hostPageControl = await waitFor(() =>
      requireElement<HTMLButtonElement>(canvasElement, '[data-testid="host-page-control"]'),
    );
    const root = await waitFor(() => requireShadowRoot(canvasElement));
    const topLayer = await waitFor(() =>
      requireElement<HTMLElement>(root, '[data-testid="ownership-top-layer"]'),
    );
    const outsideLayer = requireElement<HTMLElement>(topLayer, '[data-testid="outside-layer"]');
    void expect(outsideLayer.tabIndex).toBe(-1);
    const background = requireElement<HTMLElement>(root, '[data-testid="proof-background"]');
    const unownedEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    canvasElement.ownerDocument.dispatchEvent(unownedEscape);
    void expect(unownedEscape.defaultPrevented).toBe(false);

    const popoverParentOpener = requireElement<HTMLButtonElement>(
      root,
      '[data-testid="open-popover-parent"]',
    );
    await userEvent.click(popoverParentOpener);
    const popoverParent = await expectFocusedOwner(root, 'popover-parent');
    await userEvent.click(
      requireElement<HTMLButtonElement>(popoverParent, '[data-testid="popover-opens-dialog"]'),
    );
    await expectFocusedOwner(root, 'popover-child-dialog');
    void expect(background.inert).toBe(true);
    void expect(popoverParent.inert).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expectUnmounted(root, 'popover-child-dialog');
    await expectOwner(root, 'popover-parent');
    await expectActiveElement(
      root,
      requireElement(popoverParent, '[data-testid="popover-opens-dialog"]'),
    );
    void expect(background.inert).toBe(false);
    await userEvent.click(outsideLayer);
    await expectUnmounted(root, 'popover-parent');
    await expectActiveElement(root, popoverParentOpener);

    const dialogParentOpener = requireElement<HTMLButtonElement>(
      root,
      '[data-testid="open-dialog-parent"]',
    );
    await userEvent.click(dialogParentOpener);
    const dialogParent = await expectFocusedOwner(root, 'dialog-parent');
    const dialogOpensPopover = requireElement<HTMLButtonElement>(
      dialogParent,
      '[data-testid="dialog-opens-popover"]',
    );
    const closeDialogParent = requireElement<HTMLButtonElement>(
      dialogParent,
      '[data-testid="close-dialog-parent"]',
    );
    closeDialogParent.focus();
    await userEvent.keyboard('{Tab}');
    await expectActiveElement(root, dialogOpensPopover);
    dialogOpensPopover.focus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expectActiveElement(root, closeDialogParent);
    hostPageControl.focus();
    await expectActiveElement(root, dialogParent);
    await userEvent.click(dialogOpensPopover);
    await expectFocusedOwner(root, 'dialog-child-popover');
    void expect(background.inert).toBe(true);
    void expect(dialogParent.inert).toBe(true);
    await userEvent.click(outsideLayer);
    await expectUnmounted(root, 'dialog-child-popover');
    await expectOwner(root, 'dialog-parent');
    await expectActiveElement(
      root,
      requireElement(dialogParent, '[data-testid="dialog-opens-popover"]'),
    );
    await userEvent.keyboard('{Escape}');
    await expectUnmounted(root, 'dialog-parent');
    await expectActiveElement(root, dialogParentOpener);

    const firstOpener = requireElement<HTMLButtonElement>(root, '[data-testid="open-first"]');
    const secondOpener = requireElement<HTMLButtonElement>(root, '[data-testid="open-second"]');
    await userEvent.click(firstOpener);
    const secondOpenerBounds = secondOpener.getBoundingClientRect();
    void expect(
      root.elementFromPoint(
        secondOpenerBounds.left + secondOpenerBounds.width / 2,
        secondOpenerBounds.top + secondOpenerBounds.height / 2,
      ),
    ).toBe(secondOpener);
    await userEvent.click(secondOpener);
    const second = await expectFocusedOwner(root, 'second');
    const first = requireElement<HTMLElement>(topLayer, '[data-overlay-id="first"]');
    void expect(first.inert).toBe(true);
    void expect(second.inert).toBe(false);
    void expect(
      Array.from(topLayer.querySelectorAll('[data-overlay-id]'), (element) =>
        element.getAttribute('data-overlay-id'),
      ),
    ).toEqual(['first', 'second']);
    await userEvent.click(outsideLayer);
    await expectUnmounted(root, 'second');
    await expectOwner(root, 'first');
    void expect(first.inert).toBe(false);
    await expectActiveElement(root, secondOpener);
    await userEvent.keyboard('{Escape}');
    await expectUnmounted(root, 'first');
    await expectActiveElement(root, firstOpener);

    const rapidOpener = requireElement<HTMLButtonElement>(
      root,
      '[data-testid="open-rapid-dialog"]',
    );
    await userEvent.click(rapidOpener);
    const rapidDialog = await expectFocusedOwner(root, 'rapid-dialog');
    await userEvent.click(
      requireElement<HTMLButtonElement>(rapidDialog, '[data-testid="close-rapid-dialog"]'),
    );
    void expect(rapidDialog).toHaveAttribute('data-phase', 'exiting');
    void expect(background.inert).toBe(true);
    const exitingEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    canvasElement.ownerDocument.dispatchEvent(exitingEscape);
    void expect(exitingEscape.defaultPrevented).toBe(true);
    await userEvent.click(
      requireElement<HTMLButtonElement>(rapidDialog, '[data-testid="reopen-during-exit"]'),
    );
    await waitFor(() => void expect(rapidDialog).toHaveAttribute('data-phase', 'active'));
    await new Promise((resolve) => window.setTimeout(resolve, EXIT_DURATION_MS + 50));
    await expectOwner(root, 'rapid-dialog');
    void expect(topLayer.matches(':popover-open')).toBe(true);
    await userEvent.keyboard('{Escape}');
    await expectUnmounted(root, 'rapid-dialog');
    void expect(background.inert).toBe(false);
    await expectActiveElement(root, rapidOpener);
    await waitFor(() => void expect(topLayer.matches(':popover-open')).toBe(false));
  },
};
