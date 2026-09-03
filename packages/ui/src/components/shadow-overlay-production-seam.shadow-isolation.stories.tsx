import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { requireShadowRoot } from '../test/dom-stubs';
import { HighlightPermissionDialog } from './highlight-permission-dialog';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { VerseActionPopover } from './verse-action-popover';

function IsolatedProductionOverlaySeam(): React.ReactNode {
  const [primaryMounted, setPrimaryMounted] = useState(true);
  const [verseOpen, setVerseOpen] = useState(false);
  const [anchorElement, setAnchorElement] = useState<HTMLElement | null>(null);
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [independentOpen, setIndependentOpen] = useState(false);
  const [noteActionCount, setNoteActionCount] = useState(0);
  const [unmountRequests, setUnmountRequests] = useState(0);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
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

      {primaryMounted ? (
        <div data-testid="primary-island">
          <ShadowRootHost portalStrategy="local-top-layer">
            <button type="button" data-testid="prior-control">
              Prior control
            </button>
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
          <Popover>
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
  return waitFor(() => {
    const element = container.querySelector<ElementType>(selector);
    if (!element) throw new Error(message);
    return element;
  });
}

function requireIslandRoot(island: ParentNode): ShadowRoot {
  return requireShadowRoot(island);
}

function getPermissionDialog(topLayer: HTMLElement): HTMLElement | null {
  return topLayer.querySelector<HTMLElement>(
    '[role="dialog"]:not([data-slot="verse-action-popover"]):not([data-testid="notes-dialog"])',
  );
}

function installUnequalExitDurations(root: ShadowRoot): HTMLStyleElement {
  const style = root.ownerDocument.createElement('style');
  style.textContent = `
    [role='dialog'][data-state='closed'] { animation-duration: 400ms !important; }
    [data-slot='dialog-overlay'][data-state='closed'] { animation-duration: 800ms !important; }
    [data-slot='popover-content'][data-state='closed'] { animation-duration: 180ms !important; }
  `;
  root.append(style);
  return style;
}

export const ExercisesProductionNestedAndConcurrentOverlays: Story = {
  play: async ({ canvasElement }) => {
    const primaryIsland = canvasElement.querySelector<HTMLElement>(
      '[data-testid="primary-island"]',
    );
    const secondaryIsland = canvasElement.querySelector<HTMLElement>(
      '[data-testid="secondary-island"]',
    );
    const unmountPrimary = canvasElement.querySelector<HTMLButtonElement>(
      '[data-testid="unmount-primary"]',
    );
    const noteActionCount = canvasElement.querySelector<HTMLOutputElement>(
      '[data-testid="note-action-count"]',
    );
    if (!primaryIsland || !secondaryIsland || !unmountPrimary || !noteActionCount) {
      throw new Error('production overlay harness not rendered');
    }

    const root = await waitFor(() => requireIslandRoot(primaryIsland));
    const exitAnimationStyle = installUnequalExitDurations(root);
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
    const openPermission = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="open-permission-dialog"]',
      'permission opener not rendered',
    );
    const openNotes = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="open-notes-dialog"]',
      'notes opener not rendered',
    );
    const independentTrigger = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="independent-popover-trigger"]',
      'independent popover trigger not rendered',
    );
    const contentWrapper = root.querySelector<HTMLElement>('[data-yv-shadow-content-wrapper]');
    if (!contentWrapper) throw new Error('shadow content wrapper not rendered');
    void expect(root.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();

    priorControl.focus();
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
    void expect(versePopover.getRootNode()).toBe(root);
    void expect(canvasElement.ownerDocument.body.querySelector('[role="dialog"]')).toBeNull();

    const swatch = versePopover.querySelector<HTMLButtonElement>('[role="group"] button');
    if (!swatch) throw new Error('highlight swatch not rendered');
    await userEvent.click(swatch);
    const permissionDialog = await waitFor(() => {
      const dialog = getPermissionDialog(topLayer);
      if (!dialog) throw new Error('highlight permission dialog not rendered');
      return dialog;
    });
    void expect(topLayer).toContainElement(versePopover);
    void expect(topLayer).toContainElement(permissionDialog);
    void expect(permissionDialog.getRootNode()).toBe(root);
    await waitFor(() => {
      const focused = root.activeElement;
      void expect(focused !== null && permissionDialog.contains(focused)).toBe(true);
    });
    void expect(contentWrapper.inert).toBe(true);

    await userEvent.keyboard('{Escape}');
    await waitFor(() => void expect(getPermissionDialog(topLayer)).toBeNull());
    await waitFor(() => void expect(contentWrapper.inert).toBe(false));

    if (topLayer.querySelector('[data-slot="verse-action-popover"]')) {
      await userEvent.keyboard('{Escape}');
      await waitFor(
        () => void expect(topLayer.querySelector('[data-slot="verse-action-popover"]')).toBeNull(),
      );
    }

    await userEvent.click(openNotes);
    const notesDialog = await waitForElement<HTMLElement>(
      topLayer,
      '[data-testid="notes-dialog"]',
      'notes dialog not rendered',
    );
    void expect(notesDialog.getRootNode()).toBe(root);
    await waitFor(() => {
      const focused = root.activeElement;
      void expect(focused !== null && notesDialog.contains(focused)).toBe(true);
    });
    const notesTrigger = await waitForElement<HTMLButtonElement>(
      notesDialog,
      '[data-testid="notes-popover-trigger"]',
      'notes popover trigger not rendered',
    );
    await userEvent.click(notesTrigger);
    const notesPopover = await waitForElement<HTMLElement>(
      topLayer,
      '[data-testid="notes-popover"]',
      'notes popover not rendered',
    );
    void expect(notesPopover.getRootNode()).toBe(root);
    void expect(topLayer).toContainElement(notesDialog);
    const notesAction = await waitForElement<HTMLButtonElement>(
      notesPopover,
      '[data-testid="notes-popover-action"]',
      'notes popover action not rendered',
    );
    await userEvent.click(notesAction);
    await waitFor(() => void expect(noteActionCount.getAttribute('data-count')).toBe('1'));
    void expect(topLayer).toContainElement(notesDialog);
    await waitFor(() => {
      const focused = root.activeElement;
      void expect(focused !== null && notesPopover.contains(focused)).toBe(true);
    });

    await userEvent.keyboard('{Escape}');
    await waitFor(
      () => void expect(topLayer.querySelector('[data-testid="notes-popover"]')).toBeNull(),
    );
    if (topLayer.querySelector('[data-testid="notes-dialog"]')) {
      await userEvent.keyboard('{Escape}');
      await waitFor(
        () => void expect(topLayer.querySelector('[data-testid="notes-dialog"]')).toBeNull(),
      );
    }
    await waitFor(() => void expect(contentWrapper.inert).toBe(false));

    priorControl.focus();
    await userEvent.click(verse);
    await waitForElement(
      topLayer,
      '[data-slot="verse-action-popover"]',
      'verse action popover did not reopen',
    );
    await userEvent.click(independentTrigger);
    const independentPopover = await waitForElement<HTMLElement>(
      topLayer,
      '[data-testid="independent-popover"]',
      'independent popover not rendered',
    );
    void expect(independentPopover.getRootNode()).toBe(root);
    void expect(topLayer.matches(':popover-open')).toBe(true);
    await userEvent.keyboard('{Escape}');
    await waitFor(
      () => void expect(topLayer.querySelector('[data-testid="independent-popover"]')).toBeNull(),
    );
    if (topLayer.querySelector('[data-slot="verse-action-popover"]')) {
      await userEvent.keyboard('{Escape}');
      await waitFor(
        () => void expect(topLayer.querySelector('[data-slot="verse-action-popover"]')).toBeNull(),
      );
    }

    priorControl.focus();
    await userEvent.click(openPermission);
    const firstRapidDialog = await waitFor(() => {
      const dialog = getPermissionDialog(topLayer);
      if (!dialog) throw new Error('permission dialog did not open for rapid reopen');
      return dialog;
    });
    await waitFor(() => {
      const focused = root.activeElement;
      void expect(focused !== null && firstRapidDialog.contains(focused)).toBe(true);
    });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => void expect(firstRapidDialog).toHaveAttribute('data-state', 'closed'));
    void expect(contentWrapper.inert).toBe(true);
    await userEvent.click(openPermission);
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
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      void expect(getPermissionDialog(topLayer)).toBeNull();
      void expect(contentWrapper.inert).toBe(false);
      void expect(topLayer.matches(':popover-open')).toBe(false);
      const focused = root.activeElement;
      void expect(focused === priorControl || focused === openPermission).toBe(true);
    });

    const secondaryRoot = await waitFor(() => requireIslandRoot(secondaryIsland));
    void expect(secondaryRoot.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();
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
    await waitForElement(
      secondaryTopLayer,
      '[data-testid="secondary-popover"]',
      'secondary popover not rendered',
    );
    void expect(secondaryTopLayer.getRootNode()).toBe(secondaryRoot);
    void expect(secondaryTopLayer).not.toBe(topLayer);
    void expect(topLayer.matches(':popover-open')).toBe(false);

    await userEvent.click(openPermission);
    await waitFor(() => {
      if (!getPermissionDialog(topLayer)) throw new Error('permission dialog not open for unmount');
    });
    // Radix's open modal sets pointer-events:none on the light-DOM page.
    // Programmatic click still unmounts the host while the overlay is present.
    unmountPrimary.click();
    await waitFor(() => {
      void expect(canvasElement.querySelector('[data-testid="primary-island"]')).toBeNull();
      void expect(
        canvasElement.querySelector('[data-testid="unmount-requests"]')?.getAttribute('data-count'),
      ).toBe('1');
    });
    void expect(secondaryTopLayer.matches(':popover-open')).toBe(true);
    exitAnimationStyle.remove();
  },
};
