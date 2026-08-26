import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { requireShadowRoot } from '../test/dom-stubs';
import { SignInDialog } from './sign-in-dialog';

function SignInDialogHarness(): React.ReactNode {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <button type="button" data-testid="outside-control" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <div
        data-testid="clipping-container"
        style={{ inlineSize: 180, blockSize: 56, overflow: 'hidden', transform: 'translateZ(0)' }}
      >
        <ShadowRootHost portalStrategy="local-top-layer">
          <button type="button" data-testid="inside-control" onClick={() => setOpen(true)}>
            Inside-island control
          </button>
          <SignInDialog
            open={open}
            onOpenChange={setOpen}
            appName="Example Bible App"
            onConfirm={() => setOpen(false)}
            onDecline={() => setOpen(false)}
          />
        </ShadowRootHost>
      </div>
    </div>
  );
}

const meta = {
  title: 'Spikes/SignInDialog Shadow DOM isolation',
  component: SignInDialogHarness,
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
} satisfies Meta<typeof SignInDialogHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

function styleSnapshot(element: HTMLElement) {
  const styles = getComputedStyle(element);
  return {
    backgroundColor: styles.backgroundColor,
    borderRadius: styles.borderRadius,
    color: styles.color,
    fontFamily: styles.fontFamily,
    padding: styles.padding,
    position: styles.position,
  };
}

export const IsolatesFocusInertnessBackdropAndRestoration: Story = {
  play: async ({ canvasElement }) => {
    const { outsideControl, clippingContainer } = await waitFor(() => {
      const outside = canvasElement.querySelector<HTMLButtonElement>(
        '[data-testid="outside-control"]',
      );
      const clipping = canvasElement.querySelector<HTMLElement>(
        '[data-testid="clipping-container"]',
      );
      if (!outside || !clipping) throw new Error('dialog harness not rendered');
      return { outsideControl: outside, clippingContainer: clipping };
    });

    const root = await waitFor(() => requireShadowRoot(canvasElement));
    const exitAnimationStyle = canvasElement.ownerDocument.createElement('style');
    exitAnimationStyle.textContent = `
      [role='dialog'][data-state='closed'] { animation-duration: 400ms !important; }
      [data-slot='dialog-overlay'][data-state='closed'] { animation-duration: 800ms !important; }
    `;
    root.append(exitAnimationStyle);
    const insideControl = root.querySelector<HTMLButtonElement>('[data-testid="inside-control"]');
    if (!insideControl) throw new Error('inside-island control not rendered');
    void expect(root.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();
    insideControl.focus();
    await userEvent.click(insideControl);
    const dialog = await waitFor(() => {
      const element = root.querySelector<HTMLElement>('[role="dialog"]');
      if (!element) throw new Error('sign-in dialog not rendered in the component shadow root');
      return element;
    });
    const topLayer = root.querySelector<HTMLElement>('[data-yv-shadow-local-overlay]');
    const contentWrapper = root.querySelector<HTMLElement>('[data-yv-shadow-content-wrapper]');
    if (!topLayer || !contentWrapper) throw new Error('shadow modal coordination not rendered');

    void expect(dialog.getRootNode()).toBe(root);
    void expect(topLayer.getRootNode()).toBe(root);
    void expect(canvasElement.ownerDocument.body.querySelector('[role="dialog"]')).toBeNull();
    await waitFor(() => void expect(topLayer.matches(':popover-open')).toBe(true));

    const titleId = dialog.getAttribute('aria-labelledby');
    const descriptionId = dialog.getAttribute('aria-describedby');
    void expect(titleId).toBeTruthy();
    void expect(descriptionId).toBeTruthy();
    const title = root.getElementById(titleId!);
    const description = root.getElementById(descriptionId!);
    void expect(title).not.toBeNull();
    void expect(description).not.toBeNull();
    // SAFETY: This Chromium-only story checks that both reflected properties exist before use.
    const reflectedDialog = dialog as HTMLElement & {
      ariaLabelledByElements?: readonly Element[];
      ariaDescribedByElements?: readonly Element[];
    };
    if (!reflectedDialog.ariaLabelledByElements || !reflectedDialog.ariaDescribedByElements) {
      throw new Error('Chromium did not expose the dialog ARIA element relationships');
    }
    void expect(reflectedDialog.ariaLabelledByElements).toEqual([title]);
    void expect(reflectedDialog.ariaDescribedByElements).toEqual([description]);

    await waitFor(() => {
      const focused = root.activeElement;
      void expect(focused !== null && dialog.contains(focused)).toBe(true);
    });

    const hiddenWrapper = canvasElement.ownerDocument.createElement('div');
    hiddenWrapper.style.display = 'none';
    const hiddenButton = canvasElement.ownerDocument.createElement('button');
    hiddenButton.textContent = 'Hidden decoy';
    hiddenWrapper.append(hiddenButton);
    dialog.append(hiddenWrapper);

    const dialogButtons = Array.from(
      dialog.querySelectorAll<HTMLButtonElement>('button[data-slot="button"]'),
    );
    void expect(dialogButtons).toHaveLength(2);
    const [confirmButton, declineButton] = dialogButtons;
    if (!confirmButton || !declineButton) throw new Error('sign-in dialog actions not rendered');

    const negativeTabIndexButton = canvasElement.ownerDocument.createElement('button');
    negativeTabIndexButton.tabIndex = -2;
    negativeTabIndexButton.textContent = 'Programmatic-only control';
    const firstRadio = canvasElement.ownerDocument.createElement('input');
    firstRadio.type = 'radio';
    firstRadio.name = 'shadow-dialog-story-choice';
    firstRadio.checked = true;
    firstRadio.setAttribute('aria-label', 'First choice');
    const secondRadio = canvasElement.ownerDocument.createElement('input');
    secondRadio.type = 'radio';
    secondRadio.name = 'shadow-dialog-story-choice';
    secondRadio.setAttribute('aria-label', 'Second choice');
    confirmButton.after(negativeTabIndexButton, firstRadio, secondRadio);

    confirmButton.focus();
    await userEvent.tab();
    void expect(root.activeElement).toBe(firstRadio);
    await userEvent.tab();
    void expect(root.activeElement).toBe(declineButton);
    await userEvent.tab();
    await waitFor(() => void expect(root.activeElement).toBe(confirmButton));
    await userEvent.tab({ shift: true });
    await waitFor(() => void expect(root.activeElement).toBe(declineButton));
    void expect(root.activeElement).not.toBe(negativeTabIndexButton);
    void expect(root.activeElement).not.toBe(secondRadio);

    void expect(getComputedStyle(outsideControl).pointerEvents).toBe('none');

    outsideControl.focus();
    await waitFor(() => {
      const focused = root.activeElement;
      void expect(focused !== null && dialog.contains(focused)).toBe(true);
    });
    void expect(canvasElement.ownerDocument.activeElement).not.toBe(outsideControl);

    void expect(insideControl.closest('[inert]')).not.toBeNull();

    insideControl.focus();
    void expect(root.activeElement).not.toBe(insideControl);

    const overlay = dialog.previousElementSibling;
    if (!(overlay instanceof HTMLElement)) throw new Error('dialog overlay not rendered');
    const overlayRect = overlay.getBoundingClientRect();
    const clippingRect = clippingContainer.getBoundingClientRect();
    const viewport = canvasElement.ownerDocument.defaultView;
    if (!viewport) throw new Error('story window not available');
    void expect(overlayRect.width).toBeGreaterThanOrEqual(viewport.innerWidth - 1);
    void expect(overlayRect.height).toBeGreaterThanOrEqual(viewport.innerHeight - 1);
    const sampleX =
      clippingRect.right + 4 < viewport.innerWidth ? clippingRect.right + 4 : clippingRect.left - 4;
    const sampleY = Math.min(viewport.innerHeight - 4, Math.max(4, clippingRect.top + 4));
    const escapedHit = root.elementFromPoint(sampleX, sampleY);
    void expect(
      escapedHit === overlay || (escapedHit !== null && overlay.contains(escapedHit)),
    ).toBe(true);

    const dialogStyles = styleSnapshot(dialog);
    const overlayStyles = styleSnapshot(overlay);
    const hostileStyle = canvasElement.ownerDocument.createElement('style');
    hostileStyle.textContent = `
      button, [role='dialog'], [data-state='open'] {
        background: rgb(185, 28, 28) !important;
        border: 10px dashed lime !important;
        border-radius: 0 !important;
        color: yellow !important;
        font: 32px/1 fantasy !important;
        padding: 40px !important;
        position: static !important;
      }
    `;
    try {
      canvasElement.ownerDocument.head.append(hostileStyle);
      await waitFor(
        () =>
          void expect(getComputedStyle(outsideControl).backgroundColor).toBe('rgb(185, 28, 28)'),
      );
      void expect(styleSnapshot(dialog)).toEqual(dialogStyles);
      void expect(styleSnapshot(overlay)).toEqual(overlayStyles);
    } finally {
      hostileStyle.remove();
    }

    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      void expect(dialog).toHaveAttribute('data-state', 'closed');
      void expect(topLayer).toContainElement(dialog);
      void expect(contentWrapper.inert).toBe(true);
      void expect(getComputedStyle(outsideControl).pointerEvents).toBe('none');
      void expect(topLayer.matches(':popover-open')).toBe(true);
    });
    outsideControl.focus();
    await waitFor(() => {
      const focused = root.activeElement;
      void expect(focused !== null && dialog.contains(focused)).toBe(true);
    });
    void expect(canvasElement.ownerDocument.activeElement).not.toBe(outsideControl);
    await waitFor(() => {
      void expect(topLayer.querySelector('[role="dialog"]')).toBeNull();
      void expect(topLayer.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull();
      void expect(contentWrapper.inert).toBe(true);
      void expect(root.activeElement).toBe(overlay);
    });
    await waitFor(() => {
      void expect(topLayer.childElementCount).toBe(0);
      void expect(topLayer.matches(':popover-open')).toBe(false);
      void expect(contentWrapper.inert).toBe(false);
      void expect(root.activeElement).toBe(insideControl);
    });

    await userEvent.click(outsideControl);
    const reopenedDialog = await waitFor(() => {
      const element = root.querySelector<HTMLElement>('[role="dialog"]');
      if (!element) throw new Error('dialog did not reopen');
      return element;
    });
    const reopenedOverlay = reopenedDialog.previousElementSibling;
    if (!(reopenedOverlay instanceof HTMLElement)) {
      throw new Error('reopened dialog overlay not rendered');
    }
    await userEvent.click(reopenedOverlay);
    await waitFor(() => {
      void expect(reopenedDialog).toHaveAttribute('data-state', 'closed');
      void expect(contentWrapper.inert).toBe(true);
      void expect(getComputedStyle(outsideControl).pointerEvents).toBe('none');
      void expect(topLayer.matches(':popover-open')).toBe(true);
    });
    outsideControl.focus();
    await waitFor(() => {
      const focused = root.activeElement;
      void expect(focused !== null && reopenedDialog.contains(focused)).toBe(true);
    });
    void expect(canvasElement.ownerDocument.activeElement).not.toBe(outsideControl);
    await waitFor(() => {
      void expect(topLayer.querySelector('[role="dialog"]')).toBeNull();
      void expect(topLayer.querySelector('[data-slot="dialog-overlay"]')).not.toBeNull();
      void expect(contentWrapper.inert).toBe(true);
      void expect(root.activeElement).toBe(reopenedOverlay);
    });
    outsideControl.focus();
    await waitFor(() => {
      void expect(canvasElement.ownerDocument.activeElement).not.toBe(outsideControl);
      void expect(root.activeElement).toBe(reopenedOverlay);
    });
    await waitFor(() => {
      void expect(topLayer.childElementCount).toBe(0);
      void expect(topLayer.matches(':popover-open')).toBe(false);
      void expect(contentWrapper.inert).toBe(false);
      void expect(canvasElement.ownerDocument.activeElement).toBe(outsideControl);
    });
    exitAnimationStyle.remove();
  },
};
