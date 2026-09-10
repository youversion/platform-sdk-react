import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useCallback, useEffect, useRef, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { requireShadowRoot } from '../test/dom-stubs';
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
        rapidTimers.current.push(window.setTimeout(() => setPermissionOpen(true), 75));
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

async function waitForElement<ElementType extends Element>(
  container: ParentNode,
  selector: string,
  message: string,
): Promise<ElementType> {
  return waitFor(
    () => {
      const element = container.querySelector<ElementType>(selector);
      if (!element) throw new Error(message);
      return element;
    },
    { timeout: 5_000 },
  );
}

function getPermissionDialog(topLayer: HTMLElement): HTMLElement | null {
  return topLayer.querySelector<HTMLElement>(
    '[role="dialog"]:not([data-slot="verse-action-popover"]):not([data-testid="notes-dialog"])',
  );
}

function expectOverlayAboveAtOverlap(
  root: ShadowRoot,
  expectedTop: HTMLElement,
  underneath: HTMLElement,
): void {
  const topRect = expectedTop.getBoundingClientRect();
  const underneathRect = underneath.getBoundingClientRect();
  const overlapLeft = Math.max(topRect.left, underneathRect.left);
  const overlapRight = Math.min(topRect.right, underneathRect.right);
  const overlapTop = Math.max(topRect.top, underneathRect.top);
  const overlapBottom = Math.min(topRect.bottom, underneathRect.bottom);

  void expect(overlapRight).toBeGreaterThan(overlapLeft);
  void expect(overlapBottom).toBeGreaterThan(overlapTop);

  const hit = root.elementFromPoint(
    overlapLeft + (overlapRight - overlapLeft) / 2,
    overlapTop + (overlapBottom - overlapTop) / 2,
  );
  void expect(hit === expectedTop || (hit !== null && expectedTop.contains(hit))).toBe(true);
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
  );
  const root = await waitFor(() => requireShadowRoot(primaryIsland));
  const contentWrapper = root.querySelector<HTMLElement>('[data-yv-shadow-content-wrapper]');
  if (!contentWrapper) throw new Error('shadow content wrapper not rendered');
  void expect(root.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();
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
  );
  const versePopover = await waitForElement<HTMLElement>(
    topLayer,
    '[data-slot="verse-action-popover"]',
    'verse action popover not rendered',
  );
  await waitFor(() => void expect(topLayer.matches(':popover-open')).toBe(true));
  return { topLayer, versePopover };
}

async function openPermissionDialogFromVerseAction(
  topLayer: HTMLElement,
  versePopover: HTMLElement,
): Promise<HTMLElement> {
  const swatch = versePopover.querySelector<HTMLButtonElement>('[role="group"] button');
  if (!swatch) throw new Error('highlight swatch not rendered');
  await userEvent.click(swatch);
  return waitFor(() => {
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
  'Focus Prior control, click First verse, choose a highlight color, then press Escape twice. Focus returns inside the popover after the first Escape; after the second, confirm it does not return to Prior control.',
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
  'Focus Run rapid close/reopen and press Enter once. The dialog opens, closes, and reopens during retained exit presence. Press Escape after it reopens; confirm the page unlocks but focus does not return to the Run button.',
  { enableRapidReopen: true },
);

/** YPE-5355 stable regression evidence; unsupported observations remain in the decision docs. */
export const PopoverOpensDialogEvidence: Story = {
  tags: ['!dev'],
  play: async ({ canvasElement, step }) => {
    const { contentWrapper, root } = await getPrimaryHarness(canvasElement);
    const priorControl = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="prior-control"]',
      'prior focus control not rendered',
    );
    const verse = await waitForElement<HTMLElement>(
      root,
      '[data-testid="verse-1"]',
      'verse not rendered',
    );
    const closeAllOverlays = await waitForElement<HTMLButtonElement>(
      canvasElement,
      '[data-testid="close-all-overlays"]',
      'close-all control not rendered',
    );
    const closeAllRequests = await waitForElement<HTMLOutputElement>(
      canvasElement,
      '[data-testid="close-all-requests"]',
      'close-all request count not rendered',
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
        void expect(opened.versePopover.getRootNode()).toBe(root);
        void expect(permissionDialog.getRootNode()).toBe(root);
        const restorePosition = placeOverlayCenterUnderneath(opened.versePopover, permissionDialog);
        try {
          expectOverlayAboveAtOverlap(root, permissionDialog, opened.versePopover);
        } finally {
          restorePosition();
        }
        await waitFor(() => {
          const focused = root.activeElement;
          void expect(focused !== null && permissionDialog.contains(focused)).toBe(true);
        });
        void expect(contentWrapper.inert).toBe(true);
        void expect(opened.versePopover).toHaveAttribute('data-state', 'open');
      });

      await step('Escape dismisses one nested overlay at a time', async () => {
        await userEvent.keyboard('{Escape}');
        await waitFor(() => {
          void expect(getPermissionDialog(topLayer)).toBeNull();
          void expect(topLayer.querySelector('[data-slot="verse-action-popover"]')).not.toBeNull();
          void expect(contentWrapper.inert).toBe(false);
          const focused = root.activeElement;
          void expect(focused !== null && versePopover.contains(focused)).toBe(true);
        });
        await userEvent.keyboard('{Escape}');
        await waitFor(() => {
          void expect(topLayer.querySelector('[data-slot="verse-action-popover"]')).toBeNull();
          void expect(topLayer.matches(':popover-open')).toBe(false);
          const focused = root.activeElement;
          void expect(focused === null || !topLayer.contains(focused)).toBe(true);
        });
      });

      await step('Keep modal ownership when the popover exits first', async () => {
        exitAnimationStyles.push(
          installUnequalExitDurations(root, {
            dialog: 400,
            overlay: 800,
            popover: 180,
          }),
        );
        const opened = await openVerseActionPopover(root, verse);
        await openPermissionDialogFromVerseAction(opened.topLayer, opened.versePopover);
        closeAllOverlays.click();
        closeAllOverlays.click();
        await waitFor(
          () => {
            void expect(
              opened.topLayer.querySelector('[data-slot="verse-action-popover"]'),
            ).toBeNull();
            void expect(getPermissionDialog(opened.topLayer)).not.toBeNull();
            void expect(contentWrapper.inert).toBe(true);
          },
          { timeout: 2_000 },
        );
        await waitFor(
          () => {
            void expect(getPermissionDialog(opened.topLayer)).toBeNull();
            void expect(contentWrapper.inert).toBe(false);
            void expect(opened.topLayer.matches(':popover-open')).toBe(false);
          },
          { timeout: 2_000 },
        );
        void expect(closeAllRequests.getAttribute('data-count')).toBe('2');
      });

      await step('Finish teardown when the dialog exits first', async () => {
        exitAnimationStyles.at(-1)?.remove();
        exitAnimationStyles.push(
          installUnequalExitDurations(root, {
            dialog: 120,
            overlay: 160,
            popover: 800,
          }),
        );
        const opened = await openVerseActionPopover(root, verse);
        await openPermissionDialogFromVerseAction(opened.topLayer, opened.versePopover);
        closeAllOverlays.click();
        await waitFor(
          () => {
            void expect(getPermissionDialog(opened.topLayer)).toBeNull();
            void expect(
              opened.topLayer.querySelector('[data-slot="verse-action-popover"]'),
            ).not.toBeNull();
          },
          { timeout: 2_000 },
        );
        await waitFor(
          () => {
            void expect(
              opened.topLayer.querySelector('[data-slot="verse-action-popover"]'),
            ).toBeNull();
            void expect(contentWrapper.inert).toBe(false);
            void expect(opened.topLayer.matches(':popover-open')).toBe(false);
          },
          { timeout: 2_000 },
        );
        void expect(closeAllRequests.getAttribute('data-count')).toBe('3');
      });
    } finally {
      for (const style of exitAnimationStyles) style.remove();
    }
  },
};

export const DialogContainsPopoverEvidence: Story = {
  tags: ['!dev'],
  play: async ({ canvasElement, step }) => {
    const { contentWrapper, root } = await getPrimaryHarness(canvasElement);
    const openNotes = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="open-notes-dialog"]',
      'notes opener not rendered',
    );
    const noteActionCount = await waitForElement<HTMLOutputElement>(
      canvasElement,
      '[data-testid="note-action-count"]',
      'note action count not rendered',
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
      );
      notesDialog = await waitForElement<HTMLElement>(
        topLayer,
        '[data-testid="notes-dialog"]',
        'notes dialog not rendered',
      );
      notesTrigger = await waitForElement<HTMLButtonElement>(
        notesDialog,
        '[data-testid="notes-popover-trigger"]',
        'notes popover trigger not rendered',
      );
      await userEvent.click(notesTrigger);
      notesPopover = await waitForElement<HTMLElement>(
        topLayer,
        '[data-testid="notes-popover"]',
        'notes popover not rendered',
      );
      const restorePosition = placeOverlayCenterUnderneath(notesDialog, notesPopover);
      try {
        expectOverlayAboveAtOverlap(root, notesPopover, notesDialog);
      } finally {
        restorePosition();
      }
      const notesAction = await waitForElement<HTMLButtonElement>(
        notesPopover,
        '[data-testid="notes-popover-action"]',
        'notes popover action not rendered',
      );
      await userEvent.click(notesAction);
      await waitFor(() => void expect(noteActionCount.getAttribute('data-count')).toBe('1'));
      await waitFor(() => {
        const focused = root.activeElement;
        void expect(focused !== null && notesPopover.contains(focused)).toBe(true);
      });
    });

    await step('Escape closes only the popover and restores its trigger', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(() => void expect(notesPopover.isConnected).toBe(false));
      void expect(topLayer).toContainElement(notesDialog);
      void expect(root.activeElement).toBe(notesTrigger);
      void expect(contentWrapper.inert).toBe(true);
    });

    await step('The next Escape closes the dialog and restores its opener', async () => {
      await userEvent.keyboard('{Escape}');
      await waitFor(() => void expect(notesDialog.isConnected).toBe(false));
      await waitFor(() => void expect(contentWrapper.inert).toBe(false));
      await waitFor(() => void expect(topLayer.matches(':popover-open')).toBe(false));
      void expect(root.activeElement).toBe(openNotes);
    });
  },
};

/** YPE-5355 stable regression evidence; peer-dismissal observations remain in the docs. */
export const TwoIndependentOverlaysEvidence: Story = {
  tags: ['!dev'],
  play: async ({ canvasElement, step }) => {
    const { contentWrapper, primaryIsland, root } = await getPrimaryHarness(canvasElement);
    const verse = await waitForElement<HTMLElement>(
      root,
      '[data-testid="verse-1"]',
      'verse not rendered',
    );
    const independentTrigger = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="independent-popover-trigger"]',
      'independent popover trigger not rendered',
    );
    const closeAllOverlays = await waitForElement<HTMLButtonElement>(
      canvasElement,
      '[data-testid="close-all-overlays"]',
      'close-all control not rendered',
    );

    await step('Open a second same-root peer and tear down cleanly', async () => {
      const { topLayer } = await openVerseActionPopover(root, verse);
      await userEvent.click(independentTrigger);
      const independentPopover = await waitForElement<HTMLElement>(
        topLayer,
        '[data-testid="independent-popover"]',
        'independent popover not rendered',
      );
      await waitFor(() => {
        const focused = root.activeElement;
        void expect(focused !== null && independentPopover.contains(focused)).toBe(true);
      });
      void expect(contentWrapper.inert).toBe(false);
      await userEvent.keyboard('{Escape}');
      await waitFor(() => void expect(independentPopover.isConnected).toBe(false));
      void expect(root.activeElement).toBe(independentTrigger);
      closeAllOverlays.click();
      await waitFor(() => void expect(topLayer.matches(':popover-open')).toBe(false));
    });

    await step('Keep the secondary root usable through primary teardown', async () => {
      const secondaryIsland = await waitForElement<HTMLElement>(
        canvasElement,
        '[data-testid="secondary-island"]',
        'secondary island not rendered',
      );
      const secondaryRoot = await waitFor(() => requireShadowRoot(secondaryIsland));
      const secondaryTrigger = await waitForElement<HTMLButtonElement>(
        secondaryRoot,
        '[data-testid="secondary-popover-trigger"]',
        'secondary popover trigger not rendered',
      );
      await userEvent.click(secondaryTrigger);
      const secondaryTopLayer = await waitForElement<HTMLElement>(
        secondaryRoot,
        '[data-yv-shadow-local-overlay]',
        'secondary island top layer not created',
      );
      const secondaryPopover = await waitForElement<HTMLElement>(
        secondaryTopLayer,
        '[data-testid="secondary-popover"]',
        'secondary popover not rendered',
      );

      const opened = await openVerseActionPopover(root, verse);
      void expect(opened.topLayer).not.toBe(secondaryTopLayer);
      await openPermissionDialogFromVerseAction(opened.topLayer, opened.versePopover);
      const unmountPrimary = await waitForElement<HTMLButtonElement>(
        canvasElement,
        '[data-testid="unmount-primary"]',
        'primary island unmount control not rendered',
      );
      unmountPrimary.click();
      await waitFor(() => void expect(primaryIsland.isConnected).toBe(false));
      closeAllOverlays.click();
      await waitFor(() => void expect(secondaryPopover.isConnected).toBe(false));
      await waitFor(() => void expect(secondaryTopLayer.matches(':popover-open')).toBe(false));
      void expect(secondaryIsland.isConnected).toBe(true);

      await userEvent.click(secondaryTrigger);
      const reopenedSecondaryPopover = await waitForElement<HTMLElement>(
        secondaryTopLayer,
        '[data-testid="secondary-popover"]',
        'secondary popover did not reopen after primary teardown',
      );
      void expect(reopenedSecondaryPopover).toHaveAttribute('data-state', 'open');
      void expect(secondaryTopLayer.matches(':popover-open')).toBe(true);
    });
  },
};

/** YPE-5355 stable regression evidence; final-focus observations remain in the docs. */
export const RapidCloseReopenDuringExitEvidence: Story = {
  tags: ['!dev'],
  args: { enableRapidReopen: true },
  play: async ({ canvasElement, step }) => {
    const { contentWrapper, root } = await getPrimaryHarness(canvasElement);
    const runRapidCloseReopen = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="run-rapid-close-reopen"]',
      'rapid close/reopen control not rendered',
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
        );
        firstDialog = await waitFor(() => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog) throw new Error('permission dialog did not open');
          return dialog;
        });
      });

      await step('Retain modal ownership while the dialog starts exiting', async () => {
        await waitFor(() => void expect(firstDialog).toHaveAttribute('data-state', 'closed'));
        void expect(firstDialog.isConnected).toBe(true);
        void expect(topLayer).toContainElement(firstDialog);
        void expect(contentWrapper.inert).toBe(true);
      });

      await step('Reopen before the first dialog unmounts', async () => {
        void expect(firstDialog.isConnected).toBe(true);
        const reopenedDialog = await waitFor(() => {
          const dialog = getPermissionDialog(topLayer);
          if (!dialog || dialog.getAttribute('data-state') === 'closed') {
            throw new Error('permission dialog did not reopen during exit');
          }
          return dialog;
        });
        await waitFor(() => {
          const focused = root.activeElement;
          void expect(focused !== null && reopenedDialog.contains(focused)).toBe(true);
          void expect(contentWrapper.inert).toBe(true);
          void expect(topLayer.matches(':popover-open')).toBe(true);
        });
      });

      await step('Release modal ownership after the final close', async () => {
        await userEvent.keyboard('{Escape}');
        await waitFor(() => {
          void expect(getPermissionDialog(topLayer)).toBeNull();
          void expect(contentWrapper.inert).toBe(false);
          void expect(topLayer.matches(':popover-open')).toBe(false);
          const focused = root.activeElement;
          void expect(focused === null || !topLayer.contains(focused)).toBe(true);
        });
      });
    } finally {
      exitAnimationStyle.remove();
    }
  },
};
