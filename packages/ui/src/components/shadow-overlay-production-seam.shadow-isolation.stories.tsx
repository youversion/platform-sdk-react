import type { Meta, StoryObj } from '@storybook/react-vite';
/* oxlint-disable typescript/await-thenable -- Vitest browser assertions are runtime-async. */

import { http, HttpResponse } from 'msw';
import { useCallback, useEffect, useRef, useState } from 'react';
import { spyOn, userEvent } from 'storybook/test';
import { expect } from 'vitest';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { waitFor, waitForElement, waitForShadowRoot } from '../test/storybook-dom';
import { HighlightPermissionDialog } from './highlight-permission-dialog';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { VerseActionPopover } from './verse-action-popover';

interface IsolatedProductionOverlaySeamProps {
  enableRapidReopen?: boolean;
  manualInstructions?: string;
}

function IsolatedProductionOverlaySeam({
  enableRapidReopen = false,
  manualInstructions,
}: IsolatedProductionOverlaySeamProps): React.ReactNode {
  const [primaryMounted, setPrimaryMounted] = useState(true);
  const [verseOpen, setVerseOpen] = useState(false);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [independentOpen, setIndependentOpen] = useState(false);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [noteActionCount, setNoteActionCount] = useState(0);
  const [closeAllRequests, setCloseAllRequests] = useState(0);
  const [unmountRequests, setUnmountRequests] = useState(0);
  const rapidTimers = useRef<number[]>([]);

  const clearRapidTimers = useCallback((): void => {
    for (const timer of rapidTimers.current) window.clearTimeout(timer);
    rapidTimers.current = [];
  }, []);

  useEffect(() => clearRapidTimers, [clearRapidTimers]);

  const closeAllOverlays = (): void => {
    clearRapidTimers();
    setCloseAllRequests((count) => count + 1);
    setVerseOpen(false);
    setPermissionOpen(false);
    setNotesOpen(false);
    setIndependentOpen(false);
    setSecondaryOpen(false);
  };

  const runRapidCloseReopen = (): void => {
    clearRapidTimers();
    setPermissionOpen(true);
    rapidTimers.current.push(
      window.setTimeout(() => {
        setPermissionOpen(false);
        rapidTimers.current.push(window.setTimeout(() => setPermissionOpen(true), 650));
      }, 300),
    );
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {manualInstructions ? (
        <p data-testid="manual-instructions" style={{ maxWidth: 560, margin: 0 }}>
          <strong>Manual workflow:</strong> {manualInstructions}
        </p>
      ) : null}
      <button
        type="button"
        data-testid="unmount-primary"
        onClick={() => {
          setUnmountRequests((count) => count + 1);
          setPrimaryMounted(false);
        }}
      >
        Unmount primary island
      </button>
      <output data-testid="unmount-requests" data-count={unmountRequests} />
      <output data-testid="note-action-count" data-count={noteActionCount} />
      <button type="button" data-testid="close-all-overlays" onClick={closeAllOverlays}>
        Close all overlays
      </button>
      <output data-testid="close-all-requests" data-count={closeAllRequests} />

      {primaryMounted ? (
        <div data-testid="primary-island">
          <ShadowRootHost portalStrategy="local-top-layer">
            <button type="button" data-testid="prior-control">
              Prior control
            </button>
            {enableRapidReopen ? (
              <button
                type="button"
                data-testid="run-rapid-close-reopen"
                onClick={runRapidCloseReopen}
              >
                Run rapid close/reopen
              </button>
            ) : null}
            <span
              ref={(element) => {
                element?.setAttribute('v', '1');
              }}
              className="yv-v"
              data-testid="verse-1"
              onClick={(event) => {
                setAnchorElement(event.currentTarget);
                setVerseOpen(true);
              }}
            >
              First verse
            </span>
            <button
              type="button"
              data-testid="open-permission-dialog"
              onClick={() => setPermissionOpen(true)}
            >
              Open permission dialog
            </button>
            <button
              type="button"
              data-testid="open-notes-dialog"
              onClick={() => setNotesOpen(true)}
            >
              Open notes dialog
            </button>
            <Popover open={independentOpen} onOpenChange={setIndependentOpen}>
              <PopoverTrigger data-testid="independent-popover-trigger">
                Independent overlay
              </PopoverTrigger>
              <PopoverContent
                data-testid="independent-popover"
                showHeader
                heading="Independent overlay"
              >
                Independent panel
              </PopoverContent>
            </Popover>
            <VerseActionPopover
              open={verseOpen}
              onOpenChange={setVerseOpen}
              activeHighlights={new Set()}
              selectedVerses={verseOpen ? [1] : []}
              highlightedVerses={{}}
              anchorElement={anchorElement}
              onHighlight={() => setPermissionOpen(true)}
              onClearHighlight={() => undefined}
              onCopy={() => setVerseOpen(false)}
              onShare={() => setVerseOpen(false)}
            />
            <HighlightPermissionDialog
              open={permissionOpen}
              onOpenChange={setPermissionOpen}
              onConfirm={() => setPermissionOpen(false)}
              onCancel={() => setPermissionOpen(false)}
            />
            <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
              <DialogContent data-testid="notes-dialog" aria-describedby={undefined}>
                <DialogTitle>Notes</DialogTitle>
                <Popover>
                  <PopoverTrigger data-testid="notes-popover-trigger">Open note</PopoverTrigger>
                  <PopoverContent data-testid="notes-popover" showHeader heading="Note">
                    <button
                      type="button"
                      data-testid="notes-popover-action"
                      onClick={() => setNoteActionCount((count) => count + 1)}
                    >
                      Keep note
                    </button>
                  </PopoverContent>
                </Popover>
              </DialogContent>
            </Dialog>
          </ShadowRootHost>
        </div>
      ) : null}

      <div data-testid="secondary-island">
        <ShadowRootHost portalStrategy="local-top-layer">
          <Popover open={secondaryOpen} onOpenChange={setSecondaryOpen}>
            <PopoverTrigger data-testid="secondary-popover-trigger">Second island</PopoverTrigger>
            <PopoverContent data-testid="secondary-popover" showHeader heading="Second island">
              Second island panel
            </PopoverContent>
          </Popover>
        </ShadowRootHost>
      </div>
    </div>
  );
}

const meta = {
  title: 'Spikes/Nested concurrent overlays production seam',
  component: IsolatedProductionOverlaySeam,
  tags: ['integration'],
  parameters: {
    layout: 'centered',
    includeAuth: false,
    msw: {
      handlers: [
        http.get('*/v1/fonts/1/stylesheet', () =>
          HttpResponse.text('', { headers: { 'Content-Type': 'text/css' } }),
        ),
      ],
    },
  },
} satisfies Meta<typeof IsolatedProductionOverlaySeam>;

export default meta;
type Story = StoryObj<typeof meta>;

const productionWaitOptions = { timeout: 5_000 } as const;

function getPermissionDialog(topLayer: HTMLElement): HTMLElement | null {
  return topLayer.querySelector<HTMLElement>(
    '[role="dialog"]:not([data-slot="verse-action-popover"]):not([data-testid="notes-dialog"])',
  );
}

async function expectOverlayAboveAtOverlap(
  root: ShadowRoot,
  expectedTop: HTMLElement,
  underneath: HTMLElement,
): Promise<void> {
  const topRect = expectedTop.getBoundingClientRect();
  const underneathRect = underneath.getBoundingClientRect();
  const overlapLeft = Math.max(topRect.left, underneathRect.left);
  const overlapRight = Math.min(topRect.right, underneathRect.right);
  const overlapTop = Math.max(topRect.top, underneathRect.top);
  const overlapBottom = Math.min(topRect.bottom, underneathRect.bottom);

  await expect(overlapRight).toBeGreaterThan(overlapLeft);
  await expect(overlapBottom).toBeGreaterThan(overlapTop);

  const hit = root.elementFromPoint(
    overlapLeft + (overlapRight - overlapLeft) / 2,
    overlapTop + (overlapBottom - overlapTop) / 2,
  );
  await expect(hit === expectedTop || (hit !== null && expectedTop.contains(hit))).toBe(true);
}

function placeOverlayCenterUnderneath(
  underneath: HTMLElement,
  expectedTop: HTMLElement,
): () => void {
  const positionedElement = underneath.parentElement?.hasAttribute(
    'data-radix-popper-content-wrapper',
  )
    ? underneath.parentElement
    : underneath;
  const originalStyle = positionedElement.getAttribute('style');
  const expectedTopRect = expectedTop.getBoundingClientRect();
  positionedElement.style.setProperty('position', 'fixed', 'important');
  positionedElement.style.setProperty('inset', 'auto', 'important');
  positionedElement.style.setProperty(
    'left',
    `${expectedTopRect.left + expectedTopRect.width / 2}px`,
    'important',
  );
  positionedElement.style.setProperty(
    'top',
    `${expectedTopRect.top + expectedTopRect.height / 2}px`,
    'important',
  );
  positionedElement.style.setProperty('margin', '0', 'important');
  positionedElement.style.setProperty('translate', 'none', 'important');
  positionedElement.style.setProperty('transform', 'translate(-50%, -50%)', 'important');

  return () => {
    if (originalStyle === null) {
      positionedElement.removeAttribute('style');
    } else {
      positionedElement.setAttribute('style', originalStyle);
    }
  };
}

function installUnequalExitDurations(
  root: ShadowRoot,
  durations: { dialog: number; overlay: number; popover: number },
): HTMLStyleElement {
  const style = root.ownerDocument.createElement('style');
  style.textContent = `
    [role='dialog'][data-state='closed'] { animation-duration: ${durations.dialog}ms !important; }
    [data-slot='dialog-overlay'][data-state='closed'] { animation-duration: ${durations.overlay}ms !important; }
    [data-slot='verse-action-popover'][data-state='closed'] { animation-duration: ${durations.popover}ms !important; }
    [data-slot='popover-content'][data-state='closed'] { animation-duration: ${durations.popover}ms !important; }
  `;
  root.append(style);
  return style;
}

function finishAnimations(element: HTMLElement): void {
  for (const animation of element.getAnimations()) animation.finish();
}

interface PrimaryHarness {
  contentWrapper: HTMLElement;
  primaryIsland: HTMLElement;
  root: ShadowRoot;
}

async function getPrimaryHarness(canvasElement: HTMLElement): Promise<PrimaryHarness> {
  const primaryIsland = await waitForElement<HTMLElement>(
    canvasElement,
    '[data-testid="primary-island"]',
    'primary island not rendered',
    productionWaitOptions,
  );
  const root = await waitForShadowRoot(primaryIsland);
  const contentWrapper = root.querySelector<HTMLElement>('[data-yv-shadow-content-wrapper]');
  if (!contentWrapper) throw new Error('shadow content wrapper not rendered');
  await expect(root.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();
  return { contentWrapper, primaryIsland, root };
}

async function openVerseActionPopover(
  root: ShadowRoot,
  verse: HTMLElement,
): Promise<{ topLayer: HTMLElement; versePopover: HTMLElement }> {
  await userEvent.click(verse);
  const topLayer = await waitForElement<HTMLElement>(
    root,
    '[data-yv-shadow-local-overlay]',
    'shadow-local top layer not created',
    productionWaitOptions,
  );
  const versePopover = await waitForElement<HTMLElement>(
    topLayer,
    '[data-slot="verse-action-popover"]',
    'verse action popover not rendered',
    productionWaitOptions,
  );
  await waitFor(async () => await expect(topLayer.matches(':popover-open')).toBe(true));
  return { topLayer, versePopover };
}

async function openPermissionDialogFromVerseAction(
  topLayer: HTMLElement,
  versePopover: HTMLElement,
): Promise<HTMLElement> {
  const swatch = versePopover.querySelector<HTMLButtonElement>('[role="group"] button');
  if (!swatch) throw new Error('highlight swatch not rendered');
  await userEvent.click(swatch);
  return waitFor(async () => {
    const dialog = getPermissionDialog(topLayer);
    if (!dialog) throw new Error('highlight permission dialog not rendered');
    return dialog;
  });
}

function manualWorkflow(
  name: string,
  manualInstructions: string,
  args: Partial<IsolatedProductionOverlaySeamProps> = {},
): Story {
  return {
    name,
    tags: ['!test'],
    args: { ...args, manualInstructions },
  };
}

export const PopoverOpensDialog = manualWorkflow(
  'Popover opens dialog — manual workflow',
  'Focus Prior control, click First verse, choose a highlight color, then press Escape twice. Confirm focus returns inside the popover after the first Escape and to Prior control after the second.',
);
export const DialogContainsPopover = manualWorkflow(
  'Dialog contains popover — manual workflow',
  'Click Open notes dialog, open its Note popover, then press Escape twice to verify one-level-at-a-time dismissal and focus restoration.',
);
export const TwoIndependentOverlays = manualWorkflow(
  'Two independent overlays — manual workflow',
  'Open one peer, then another in the same or separate component root to observe outside-interaction dismissal; unmount the primary island and confirm the secondary root can reopen.',
);
export const RapidCloseReopenDuringExit = manualWorkflow(
  'Rapid close/reopen during exit — manual workflow',
  'Focus Run rapid close/reopen and press Enter once. The dialog opens, closes, and reopens during retained exit presence. Press Escape after it reopens; confirm the page unlocks and focus returns to the Run button.',
  { enableRapidReopen: true },
);

/** YPE-5355 regression evidence with YPE-5889 final-focus coverage. */
export const PopoverOpensDialogEvidence: Story = {
  tags: ['!dev', 'shadow-dom'],
  play: async ({ canvasElement, step }) => {
    const { contentWrapper, root } = await getPrimaryHarness(canvasElement);
    const priorControl = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="prior-control"]',
      'prior focus control not rendered',
      productionWaitOptions,
    );
    const verse = await waitForElement<HTMLElement>(
      root,
      '[data-testid="verse-1"]',
      'verse not rendered',
      productionWaitOptions,
    );
    const closeAllOverlays = await waitForElement<HTMLButtonElement>(
      canvasElement,
      '[data-testid="close-all-overlays"]',
      'close-all control not rendered',
      productionWaitOptions,
    );
    const closeAllRequests = await waitForElement<HTMLOutputElement>(
      canvasElement,
      '[data-testid="close-all-requests"]',
      'close-all request count not rendered',
      productionWaitOptions,
    );
    const exitAnimationStyles: HTMLStyleElement[] = [];
    let topLayer!: HTMLElement;
    let versePopover!: HTMLElement;

    try {
      await step('Open the highlights permission dialog', async () => {
        priorControl.focus();
        const opened = await openVerseActionPopover(root, verse);
        topLayer = opened.topLayer;
        versePopover = opened.versePopover;
        const permissionDialog = await openPermissionDialogFromVerseAction(
          opened.topLayer,
          opened.versePopover,
        );
        await expect(opened.versePopover.getRootNode()).toBe(root);
        await expect(permissionDialog.getRootNode()).toBe(root);
        const restorePosition = placeOverlayCenterUnderneath(opened.versePopover, permissionDialog);
        try {
          await expectOverlayAboveAtOverlap(root, permissionDialog, opened.versePopover);
        } finally {
          restorePosition();
        }
        await waitFor(async () => {
          const focused = root.activeElement;
          await expect(focused !== null && permissionDialog.contains(focused)).toBe(true);
        }, productionWaitOptions);
        await expect(contentWrapper.inert).toBe(true);
        await expect(opened.versePopover).toHaveAttribute('data-state', 'open');
      });

      await step('Escape dismisses one nested overlay at a time', async () => {
        await userEvent.keyboard('{Escape}');
        await waitFor(async () => {
          await expect(getPermissionDialog(topLayer)).toBeNull();
          await expect(topLayer.querySelector('[data-slot="verse-action-popover"]')).not.toBeNull();
          await expect(contentWrapper.inert).toBe(false);
          const focused = root.activeElement;
          await expect(focused !== null && versePopover.contains(focused)).toBe(true);
        }, productionWaitOptions);
        await userEvent.keyboard('{Escape}');
        await waitFor(async () => {
          await expect(topLayer.querySelector('[data-slot="verse-action-popover"]')).toBeNull();
          await expect(topLayer.matches(':popover-open')).toBe(false);
          await expect(root.activeElement).toBe(priorControl);
        }, productionWaitOptions);
      });

      await step('Keep modal ownership when the popover exits first', async () => {
        exitAnimationStyles.push(
          installUnequalExitDurations(root, {
            dialog: 40_000,
            overlay: 50_000,
            popover: 30_000,
          }),
        );
        const opened = await openVerseActionPopover(root, verse);
        const permissionDialog = await openPermissionDialogFromVerseAction(
          opened.topLayer,
          opened.versePopover,
        );
        const dialogOverlay = opened.topLayer.querySelector<HTMLElement>(
          '[data-slot="dialog-overlay"]',
        );
        if (!dialogOverlay) throw new Error('dialog overlay not rendered');
        closeAllOverlays.click();
        closeAllOverlays.click();
        await waitFor(async () => {
          await expect(opened.versePopover).toHaveAttribute('data-state', 'closed');
          await expect(permissionDialog).toHaveAttribute('data-state', 'closed');
        }, productionWaitOptions);
        finishAnimations(opened.versePopover);
        await waitFor(async () => {
          await expect(
            opened.topLayer.querySelector('[data-slot="verse-action-popover"]'),
          ).toBeNull();
          await expect(getPermissionDialog(opened.topLayer)).toBe(permissionDialog);
          await expect(contentWrapper.inert).toBe(true);
        }, productionWaitOptions);
        finishAnimations(permissionDialog);
        finishAnimations(dialogOverlay);
        await waitFor(async () => {
          await expect(getPermissionDialog(opened.topLayer)).toBeNull();
          await expect(contentWrapper.inert).toBe(false);
          await expect(opened.topLayer.matches(':popover-open')).toBe(false);
        }, productionWaitOptions);
        await expect(closeAllRequests.getAttribute('data-count')).toBe('2');
      });

      await step('Finish teardown when the dialog exits first', async () => {
        exitAnimationStyles.at(-1)?.remove();
        exitAnimationStyles.push(
          installUnequalExitDurations(root, {
            dialog: 30_000,
            overlay: 40_000,
            popover: 50_000,
          }),
        );
        const opened = await openVerseActionPopover(root, verse);
        const permissionDialog = await openPermissionDialogFromVerseAction(
          opened.topLayer,
          opened.versePopover,
        );
        const dialogOverlay = opened.topLayer.querySelector<HTMLElement>(
          '[data-slot="dialog-overlay"]',
        );
        if (!dialogOverlay) throw new Error('dialog overlay not rendered');
        closeAllOverlays.click();
        await waitFor(async () => {
          await expect(opened.versePopover).toHaveAttribute('data-state', 'closed');
          await expect(permissionDialog).toHaveAttribute('data-state', 'closed');
        }, productionWaitOptions);
        finishAnimations(permissionDialog);
        finishAnimations(dialogOverlay);
        await waitFor(async () => {
          await expect(getPermissionDialog(opened.topLayer)).toBeNull();
          await expect(
            opened.topLayer.querySelector('[data-slot="verse-action-popover"]'),
          ).not.toBeNull();
        }, productionWaitOptions);
        finishAnimations(opened.versePopover);
        await waitFor(async () => {
          await expect(
            opened.topLayer.querySelector('[data-slot="verse-action-popover"]'),
          ).toBeNull();
          await expect(contentWrapper.inert).toBe(false);
          await expect(opened.topLayer.matches(':popover-open')).toBe(false);
        }, productionWaitOptions);
        await expect(closeAllRequests.getAttribute('data-count')).toBe('3');
      });
    } finally {
      for (const style of exitAnimationStyles) style.remove();
    }
  },
};

export const DialogContainsPopoverEvidence: Story = {
  tags: ['!dev', 'shadow-dom'],
  play: async ({ canvasElement, step }) => {
    const { contentWrapper, root } = await getPrimaryHarness(canvasElement);
    const openNotes = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="open-notes-dialog"]',
      'notes opener not rendered',
      productionWaitOptions,
    );
    const noteActionCount = await waitForElement<HTMLOutputElement>(
      canvasElement,
      '[data-testid="note-action-count"]',
      'note action count not rendered',
      productionWaitOptions,
    );

    let notesDialog!: HTMLElement;
    let notesPopover!: HTMLElement;
    let notesTrigger!: HTMLButtonElement;
    let topLayer!: HTMLElement;
    await step('Open a popover inside the dialog', async () => {
      await userEvent.click(openNotes);
      topLayer = await waitForElement<HTMLElement>(
        root,
        '[data-yv-shadow-local-overlay]',
        'shadow-local top layer not created',
        productionWaitOptions,
      );
      notesDialog = await waitForElement<HTMLElement>(
        topLayer,
        '[data-testid="notes-dialog"]',
        'notes dialog not rendered',
        productionWaitOptions,
      );
      notesTrigger = await waitForElement<HTMLButtonElement>(
        notesDialog,
        '[data-testid="notes-popover-trigger"]',
        'notes popover trigger not rendered',
        productionWaitOptions,
      );
      await userEvent.click(notesTrigger);
      notesPopover = await waitForElement<HTMLElement>(
        topLayer,
        '[data-testid="notes-popover"]',
        'notes popover not rendered',
        productionWaitOptions,
      );
      const restorePosition = placeOverlayCenterUnderneath(notesDialog, notesPopover);
      try {
        await expectOverlayAboveAtOverlap(root, notesPopover, notesDialog);
      } finally {
        restorePosition();
      }
      const notesAction = await waitForElement<HTMLButtonElement>(
        notesPopover,
        '[data-testid="notes-popover-action"]',
        'notes popover action not rendered',
        productionWaitOptions,
      );
      await userEvent.click(notesAction);
      await waitFor(async () => await expect(noteActionCount.getAttribute('data-count')).toBe('1'));
      await waitFor(async () => {
        const focused = root.activeElement;
        await expect(focused !== null && notesPopover.contains(focused)).toBe(true);
      });
    });

    await step('Escape closes only the popover and restores its trigger', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => await expect(notesPopover.isConnected).toBe(false));
      await expect(topLayer).toContainElement(notesDialog);
      await waitFor(async () => await expect(root.activeElement).toBe(notesTrigger));
      await expect(contentWrapper.inert).toBe(true);
    });

    await step('The next Escape closes the dialog and restores its opener', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => await expect(notesDialog.isConnected).toBe(false));
      await waitFor(async () => await expect(contentWrapper.inert).toBe(false));
      await waitFor(async () => await expect(topLayer.matches(':popover-open')).toBe(false));
      await waitFor(async () => await expect(root.activeElement).toBe(openNotes));
    });
  },
};

/** YPE-5355 stable regression evidence; peer-dismissal observations remain in the docs. */
export const TwoIndependentOverlaysEvidence: Story = {
  tags: ['!dev', 'shadow-dom'],
  play: async ({ canvasElement, step }) => {
    const { contentWrapper, primaryIsland, root } = await getPrimaryHarness(canvasElement);
    const verse = await waitForElement<HTMLElement>(
      root,
      '[data-testid="verse-1"]',
      'verse not rendered',
      productionWaitOptions,
    );
    const independentTrigger = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="independent-popover-trigger"]',
      'independent popover trigger not rendered',
      productionWaitOptions,
    );
    const closeAllOverlays = await waitForElement<HTMLButtonElement>(
      canvasElement,
      '[data-testid="close-all-overlays"]',
      'close-all control not rendered',
      productionWaitOptions,
    );

    await step('Open a second same-root peer and tear down cleanly', async () => {
      const { topLayer } = await openVerseActionPopover(root, verse);
      await userEvent.click(independentTrigger);
      const independentPopover = await waitForElement<HTMLElement>(
        topLayer,
        '[data-testid="independent-popover"]',
        'independent popover not rendered',
        productionWaitOptions,
      );
      await waitFor(async () => {
        const focused = root.activeElement;
        await expect(focused !== null && independentPopover.contains(focused)).toBe(true);
      });
      await expect(contentWrapper.inert).toBe(false);
      await userEvent.keyboard('{Escape}');
      await waitFor(async () => await expect(independentPopover.isConnected).toBe(false));
      await expect(root.activeElement).toBe(independentTrigger);
      closeAllOverlays.click();
      await waitFor(async () => await expect(topLayer.matches(':popover-open')).toBe(false));
    });

    await step('Keep the secondary root usable through primary teardown', async () => {
      const secondaryIsland = await waitForElement<HTMLElement>(
        canvasElement,
        '[data-testid="secondary-island"]',
        'secondary island not rendered',
        productionWaitOptions,
      );
      const secondaryRoot = await waitForShadowRoot(secondaryIsland);
      const secondaryTrigger = await waitForElement<HTMLButtonElement>(
        secondaryRoot,
        '[data-testid="secondary-popover-trigger"]',
        'secondary popover trigger not rendered',
        productionWaitOptions,
      );
      await userEvent.click(secondaryTrigger);
      const secondaryTopLayer = await waitForElement<HTMLElement>(
        secondaryRoot,
        '[data-yv-shadow-local-overlay]',
        'secondary island top layer not created',
        productionWaitOptions,
      );
      const secondaryPopover = await waitForElement<HTMLElement>(
        secondaryTopLayer,
        '[data-testid="secondary-popover"]',
        'secondary popover not rendered',
        productionWaitOptions,
      );

      const opened = await openVerseActionPopover(root, verse);
      await expect(opened.topLayer).not.toBe(secondaryTopLayer);
      await openPermissionDialogFromVerseAction(opened.topLayer, opened.versePopover);
      const unmountPrimary = await waitForElement<HTMLButtonElement>(
        canvasElement,
        '[data-testid="unmount-primary"]',
        'primary island unmount control not rendered',
        productionWaitOptions,
      );
      unmountPrimary.click();
      await waitFor(async () => await expect(primaryIsland.isConnected).toBe(false));
      closeAllOverlays.click();
      await waitFor(async () => await expect(secondaryPopover.isConnected).toBe(false));
      await waitFor(
        async () => await expect(secondaryTopLayer.matches(':popover-open')).toBe(false),
      );
      await expect(secondaryIsland.isConnected).toBe(true);

      await userEvent.click(secondaryTrigger);
      const reopenedSecondaryPopover = await waitForElement<HTMLElement>(
        secondaryTopLayer,
        '[data-testid="secondary-popover"]',
        'secondary popover did not reopen after primary teardown',
        productionWaitOptions,
      );
      await expect(reopenedSecondaryPopover).toHaveAttribute('data-state', 'open');
      await expect(secondaryTopLayer.matches(':popover-open')).toBe(true);
    });
  },
};

/** YPE-5355 lifecycle evidence with YPE-5889 final-focus coverage. */
export const RapidCloseReopenDuringExitEvidence: Story = {
  tags: ['!dev', 'shadow-dom'],
  args: { enableRapidReopen: true },
  play: async ({ canvasElement, step }) => {
    const { contentWrapper, root } = await getPrimaryHarness(canvasElement);
    const runRapidCloseReopen = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="run-rapid-close-reopen"]',
      'rapid close/reopen control not rendered',
      productionWaitOptions,
    );
    const exitAnimationStyle = installUnequalExitDurations(root, {
      dialog: 400,
      overlay: 800,
      popover: 180,
    });
    let firstDialog!: HTMLElement;
    let topLayer!: HTMLElement;

    try {
      await step('Start the controlled close/reopen sequence', async () => {
        await userEvent.click(runRapidCloseReopen);
        topLayer = await waitForElement<HTMLElement>(
          root,
          '[data-yv-shadow-local-overlay]',
          'shadow-local top layer not created',
          productionWaitOptions,
        );
        firstDialog = await waitFor(async () => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog) throw new Error('permission dialog did not open');
          return dialog;
        });
      });

      await step('Retain modal ownership while the dialog starts exiting', async () => {
        await waitFor(
          async () => await expect(firstDialog).toHaveAttribute('data-state', 'closed'),
        );
        await expect(firstDialog.isConnected).toBe(true);
        await expect(topLayer).toContainElement(firstDialog);
        await expect(contentWrapper.inert).toBe(true);
      });

      await step('Preserve modal focus after the first dialog unmounts', async () => {
        await waitFor(async () => {
          await expect(firstDialog.isConnected).toBe(false);
          const overlay = topLayer.querySelector<HTMLElement>('[data-slot="dialog-overlay"]');
          if (!overlay) throw new Error('dialog overlay did not remain during content exit');
          const currentDialog = getPermissionDialog(topLayer);
          const focused = root.activeElement;
          await expect(
            focused === overlay ||
              (focused !== null && currentDialog !== null && currentDialog.contains(focused)),
          ).toBe(true);
          await expect(contentWrapper.inert).toBe(true);
          await expect(topLayer.matches(':popover-open')).toBe(true);
        });
      });

      await step('Reopen from overlay-only retained presence', async () => {
        const reopenedDialog = await waitFor(async () => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog || dialog.getAttribute('data-state') === 'closed') {
            throw new Error('permission dialog did not reopen during exit');
          }
          return dialog;
        });
        await expect(reopenedDialog).not.toBe(firstDialog);
        await waitFor(async () => {
          const focused = root.activeElement;
          await expect(focused !== null && reopenedDialog.contains(focused)).toBe(true);
          await expect(contentWrapper.inert).toBe(true);
          await expect(topLayer.matches(':popover-open')).toBe(true);
        });
      });

      await step('Release modal ownership after the final close', async () => {
        await userEvent.keyboard('{Escape}');
        await waitFor(async () => {
          await expect(getPermissionDialog(topLayer)).toBeNull();
          await expect(contentWrapper.inert).toBe(false);
          await expect(topLayer.matches(':popover-open')).toBe(false);
          await expect(root.activeElement).toBe(runRapidCloseReopen);
        });
      });
    } finally {
      exitAnimationStyle.remove();
    }
  },
};

export const RapidCloseReopenIgnoresInvalidOpenerEvidence: Story = {
  tags: ['!dev'],
  args: { enableRapidReopen: true },
  play: async ({ canvasElement, step }) => {
    const { contentWrapper, root } = await getPrimaryHarness(canvasElement);
    const runRapidCloseReopen = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="run-rapid-close-reopen"]',
      'rapid close/reopen control not rendered',
    );
    const secondaryIsland = await waitForElement<HTMLElement>(
      canvasElement,
      '[data-testid="secondary-island"]',
      'secondary island not rendered',
    );
    const secondaryRoot = await waitForShadowRoot(secondaryIsland);
    const exitAnimationStyle = installUnequalExitDurations(root, {
      dialog: 400,
      overlay: 800,
      popover: 180,
    });
    let topLayer!: HTMLElement;

    try {
      await step('Reopen the dialog before its retained exit completes', async () => {
        await userEvent.click(runRapidCloseReopen);
        topLayer = await waitForElement<HTMLElement>(
          root,
          '[data-yv-shadow-local-overlay]',
          'shadow-local top layer not created',
        );
        const firstDialog = await waitFor(async () => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog) throw new Error('permission dialog did not open');
          return dialog;
        });
        await waitFor(
          async () => await expect(firstDialog).toHaveAttribute('data-state', 'closed'),
        );
        await waitFor(async () => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog || dialog.getAttribute('data-state') === 'closed') {
            throw new Error('permission dialog did not reopen during exit');
          }
          await expect(contentWrapper.inert).toBe(true);
        });
      });

      await step('Ignore the opener after it moves to another shadow root', async () => {
        secondaryRoot.append(runRapidCloseReopen);
        await expect(runRapidCloseReopen.getRootNode()).toBe(secondaryRoot);

        await userEvent.keyboard('{Escape}');
        await waitFor(async () => {
          await expect(getPermissionDialog(topLayer)).toBeNull();
          await expect(contentWrapper.inert).toBe(false);
          await expect(topLayer.matches(':popover-open')).toBe(false);
        });
        await expect(secondaryRoot.activeElement).not.toBe(runRapidCloseReopen);
      });

      await step('Ignore the opener after it moves into the light DOM', async () => {
        contentWrapper.append(runRapidCloseReopen);
        await userEvent.click(runRapidCloseReopen);
        const firstDialog = await waitFor(async () => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog) throw new Error('permission dialog did not reopen for light-DOM target');
          return dialog;
        });
        await waitFor(
          async () => await expect(firstDialog).toHaveAttribute('data-state', 'closed'),
        );
        await waitFor(async () => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog || dialog.getAttribute('data-state') === 'closed') {
            throw new Error('permission dialog did not rapidly reopen for light-DOM target');
          }
        });

        const focus = spyOn(runRapidCloseReopen, 'focus');
        try {
          canvasElement.ownerDocument.body.append(runRapidCloseReopen);
          await expect(runRapidCloseReopen.getRootNode()).toBe(canvasElement.ownerDocument);
          await userEvent.keyboard('{Escape}');
          await waitFor(async () => {
            await expect(getPermissionDialog(topLayer)).toBeNull();
            await expect(contentWrapper.inert).toBe(false);
            await expect(topLayer.matches(':popover-open')).toBe(false);
          });
          await expect(focus).not.toHaveBeenCalled();
          await expect(canvasElement.ownerDocument.activeElement).not.toBe(runRapidCloseReopen);
        } finally {
          focus.mockRestore();
        }
      });

      await step('Ignore the opener after it disconnects', async () => {
        contentWrapper.append(runRapidCloseReopen);
        await userEvent.click(runRapidCloseReopen);
        const firstDialog = await waitFor(async () => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog) throw new Error('permission dialog did not reopen for disconnected target');
          return dialog;
        });
        await waitFor(
          async () => await expect(firstDialog).toHaveAttribute('data-state', 'closed'),
        );
        await waitFor(async () => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog || dialog.getAttribute('data-state') === 'closed') {
            throw new Error('permission dialog did not rapidly reopen for disconnected target');
          }
        });

        const focus = spyOn(runRapidCloseReopen, 'focus');
        try {
          runRapidCloseReopen.remove();
          await expect(runRapidCloseReopen.isConnected).toBe(false);
          await userEvent.keyboard('{Escape}');
          await waitFor(async () => {
            await expect(getPermissionDialog(topLayer)).toBeNull();
            await expect(contentWrapper.inert).toBe(false);
            await expect(topLayer.matches(':popover-open')).toBe(false);
          });
          await expect(focus).not.toHaveBeenCalled();
          await expect(root.activeElement).not.toBe(runRapidCloseReopen);
        } finally {
          focus.mockRestore();
        }
      });

      await step('Ignore the opener after it moves to another document', async () => {
        contentWrapper.append(runRapidCloseReopen);
        await userEvent.click(runRapidCloseReopen);
        const firstDialog = await waitFor(async () => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog)
            throw new Error('permission dialog did not reopen for cross-document target');
          return dialog;
        });
        await waitFor(
          async () => await expect(firstDialog).toHaveAttribute('data-state', 'closed'),
        );
        await waitFor(async () => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog || dialog.getAttribute('data-state') === 'closed') {
            throw new Error('permission dialog did not rapidly reopen for cross-document target');
          }
        });

        const secondaryDocument = canvasElement.ownerDocument.implementation.createHTMLDocument();
        const focus = spyOn(runRapidCloseReopen, 'focus');
        try {
          secondaryDocument.body.append(runRapidCloseReopen);
          await expect(runRapidCloseReopen.isConnected).toBe(true);
          await expect(runRapidCloseReopen.ownerDocument).toBe(secondaryDocument);
          await userEvent.keyboard('{Escape}');
          await waitFor(async () => {
            await expect(getPermissionDialog(topLayer)).toBeNull();
            await expect(contentWrapper.inert).toBe(false);
            await expect(topLayer.matches(':popover-open')).toBe(false);
          });
          await expect(focus).not.toHaveBeenCalled();
        } finally {
          focus.mockRestore();
        }
      });
    } finally {
      exitAnimationStyle.remove();
    }
  },
};
/* oxlint-disable typescript/await-thenable -- Vitest browser assertions are runtime-async. */
/* oxlint-disable typescript/await-thenable -- Vitest browser assertions are runtime-async. */
