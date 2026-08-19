import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { globalHandlers } from '../test/mocks/handlers';
import { BibleVersionPicker } from './bible-version-picker';

function IsolatedBibleVersionPicker({
  side = 'top',
}: {
  side?: 'top' | 'right' | 'bottom' | 'left';
}): React.ReactNode {
  const [versionId, setVersionId] = useState(111);

  return (
    <ShadowRootHost>
      <BibleVersionPicker.Root versionId={versionId} onVersionChange={setVersionId} side={side}>
        <BibleVersionPicker.Trigger />
        <BibleVersionPicker.Content />
      </BibleVersionPicker.Root>
    </ShadowRootHost>
  );
}

function SharedOverlayLifecycleHarness(): React.ReactNode {
  const [showSecondPicker, setShowSecondPicker] = useState(true);

  return (
    <div>
      <div data-testid="first-picker">
        <IsolatedBibleVersionPicker />
      </div>
      {showSecondPicker ? (
        <div data-testid="second-picker">
          <IsolatedBibleVersionPicker />
        </div>
      ) : null}
      <button type="button" onClick={() => setShowSecondPicker(false)}>
        Unmount second picker
      </button>
    </div>
  );
}

const meta = {
  title: 'Spikes/BibleVersionPicker Shadow DOM isolation',
  component: IsolatedBibleVersionPicker,
  tags: ['integration'],
  parameters: {
    layout: 'centered',
    msw: {
      handlers: [
        ...globalHandlers,
        http.get('*/v1/fonts/1/stylesheet', () =>
          HttpResponse.text('', { headers: { 'Content-Type': 'text/css' } }),
        ),
      ],
    },
  },
} satisfies Meta<typeof IsolatedBibleVersionPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

function styleSnapshot(element: HTMLElement) {
  const ownerWindow = element.ownerDocument.defaultView;
  if (!ownerWindow) throw new Error('element window not available');
  const styles = ownerWindow.getComputedStyle(element);
  return {
    appearance: styles.appearance,
    backgroundColor: styles.backgroundColor,
    borderRadius: styles.borderRadius,
    borderTopColor: styles.borderTopColor,
    borderTopStyle: styles.borderTopStyle,
    borderTopWidth: styles.borderTopWidth,
    color: styles.color,
    display: styles.display,
    fontFamily: styles.fontFamily,
    fontSize: styles.fontSize,
    lineHeight: styles.lineHeight,
    padding: styles.padding,
  };
}

async function getComponentRoot(container: ParentNode): Promise<ShadowRoot> {
  const host = await waitFor(() => {
    const element = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
    if (!element?.shadowRoot) throw new Error('component shadow root not attached');
    return element;
  });
  return host.shadowRoot!;
}

async function getPickerTrigger(container: ParentNode): Promise<HTMLElement> {
  const root = await getComponentRoot(container);
  return waitFor(() => {
    const element = root.querySelector<HTMLElement>('[data-slot="popover-trigger"]');
    if (!element) throw new Error('version picker trigger not rendered');
    return element;
  });
}

async function getOverlayRoot(ownerDocument: Document): Promise<ShadowRoot> {
  const host = await waitFor(() => {
    const element = ownerDocument.body.querySelector<HTMLElement>('[data-yv-shadow-overlay-host]');
    if (!element?.shadowRoot) throw new Error('shared overlay shadow root not attached');
    return element;
  });
  return host.shadowRoot!;
}

async function getPopoverPanel(overlayRoot: ShadowRoot): Promise<HTMLElement> {
  return waitFor(() => {
    const element = overlayRoot.querySelector<HTMLElement>('[data-slot="popover-content"]');
    if (!element) throw new Error('popover panel not rendered');
    return element;
  });
}

async function openPicker(container: ParentNode, ownerDocument: Document) {
  const componentRoot = await getComponentRoot(container);
  const trigger = await getPickerTrigger(container);
  await userEvent.click(trigger);
  const overlayRoot = await getOverlayRoot(ownerDocument);
  const panel = await getPopoverPanel(overlayRoot);
  return { componentRoot, trigger, overlayRoot, panel };
}

async function getNamedPickerTrigger(
  canvasElement: HTMLElement,
  pickerTestId: string,
): Promise<HTMLElement> {
  const picker = canvasElement.querySelector<HTMLElement>(`[data-testid="${pickerTestId}"]`);
  if (!picker) throw new Error(`${pickerTestId} not rendered`);
  return getPickerTrigger(picker);
}

export const PortalContentRendersInsideShadowRoot: Story = {
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const { componentRoot, overlayRoot, panel } = await openPicker(
      canvasElement,
      canvasElement.ownerDocument,
    );

    void expect(panel.getRootNode()).toBe(overlayRoot);
    void expect(componentRoot.querySelector('[data-slot="popover-content"]')).toBeNull();
    void expect(
      canvasElement.ownerDocument.body.querySelector('[data-slot="popover-content"]'),
    ).toBeNull();
    void expect(
      canvasElement.ownerDocument.body.querySelectorAll('[data-yv-shadow-overlay-host]'),
    ).toHaveLength(1);
  },
};

export const AncestorClippingAndPositioning: Story = {
  tags: ['integration'],
  render: () => (
    <div
      data-testid="clipping-container"
      style={{
        width: 180,
        height: 56,
        overflow: 'hidden',
        transform: 'translateZ(0)',
      }}
    >
      <IsolatedBibleVersionPicker side="bottom" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const clippingContainer = canvasElement.querySelector<HTMLElement>(
      '[data-testid="clipping-container"]',
    );
    if (!clippingContainer) throw new Error('clipping container not rendered');

    const { overlayRoot, panel } = await openPicker(clippingContainer, canvasElement.ownerDocument);

    const containerRect = clippingContainer.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    void expect(panelRect.bottom).toBeGreaterThan(containerRect.bottom + 1);

    const viewport = canvasElement.ownerDocument.defaultView;
    if (!viewport) throw new Error('story window not available');
    void expect(panelRect.top).toBeGreaterThanOrEqual(0);
    void expect(panelRect.left).toBeGreaterThanOrEqual(0);
    void expect(panelRect.bottom).toBeLessThanOrEqual(viewport.innerHeight);
    void expect(panelRect.right).toBeLessThanOrEqual(viewport.innerWidth);

    const sampleX = panelRect.left + panelRect.width / 2;
    const sampleY = Math.max(panelRect.top + 2, containerRect.bottom + 2);
    if (sampleY >= panelRect.bottom) {
      throw new Error('popover panel did not extend far enough beyond the clipping container');
    }

    const hit = overlayRoot.elementFromPoint(sampleX, sampleY);
    void expect(hit === panel || (hit !== null && panel.contains(hit))).toBe(true);
  },
};

export const SharedOverlayStylesResistHostCss: Story = {
  tags: ['integration'],
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <button type="button" data-testid="host-control">
        Host control
      </button>
      <IsolatedBibleVersionPicker />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const ownerDocument = canvasElement.ownerDocument;
    const ownerWindow = ownerDocument.defaultView;
    if (!ownerWindow) throw new Error('story window not available');

    const control = canvasElement.querySelector<HTMLButtonElement>('[data-testid="host-control"]');
    if (!control) throw new Error('host control not rendered');

    const { panel } = await openPicker(canvasElement, ownerDocument);
    const input = await waitFor(() => {
      const element = panel.querySelector<HTMLInputElement>('input');
      if (!element) throw new Error('popover search input not rendered');
      return element;
    });

    const panelBaseline = styleSnapshot(panel);
    const inputBaseline = styleSnapshot(input);
    void expect(panelBaseline.display).toBe('grid');
    void expect(panelBaseline.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    void expect(panelBaseline.borderRadius).not.toBe('0px');
    void expect(inputBaseline.fontFamily).toContain('Inter');

    const hostileStyle = ownerDocument.createElement('style');
    hostileStyle.textContent = `
      button,
      input,
      [role='dialog'] {
        appearance: none !important;
        background: rgb(185, 28, 28) !important;
        border: 10px dashed lime !important;
        border-radius: 0 !important;
        color: yellow !important;
        font: 32px/1 fantasy !important;
        padding: 40px !important;
      }
    `;

    try {
      ownerDocument.head.append(hostileStyle);
      await waitFor(() => {
        void expect(ownerWindow.getComputedStyle(control).backgroundColor).toBe('rgb(185, 28, 28)');
      });

      void expect(styleSnapshot(panel)).toEqual(panelBaseline);
      void expect(styleSnapshot(input)).toEqual(inputBaseline);
    } finally {
      hostileStyle.remove();
    }
  },
};

export const HostSpacingCustomPropertyDoesNotAffectOverlay: Story = {
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const ownerDocument = canvasElement.ownerDocument;
    const { overlayRoot } = await openPicker(canvasElement, ownerDocument);
    const languageTrigger = await waitFor(() => {
      const element = overlayRoot.querySelector<HTMLButtonElement>(
        'button[aria-label="Select language"]',
      );
      if (!element) throw new Error('language trigger not rendered');
      return element;
    });
    await userEvent.click(languageTrigger);

    const tabsList = await waitFor(() => {
      const element = overlayRoot.querySelector<HTMLElement>('[data-slot="tabs-list"]');
      if (!element) throw new Error('language tabs not rendered');
      return element;
    });
    const baselineWidth = tabsList.getBoundingClientRect().width;
    void expect(baselineWidth).toBeGreaterThan(0);

    const documentRoot = ownerDocument.documentElement;
    const previousValue = documentRoot.style.getPropertyValue('--spacing');
    const previousPriority = documentRoot.style.getPropertyPriority('--spacing');

    try {
      documentRoot.style.setProperty('--spacing', '20px');
      await waitFor(() => {
        void expect(tabsList.getBoundingClientRect().width).toBe(baselineWidth);
      });
    } finally {
      if (previousValue) {
        documentRoot.style.setProperty('--spacing', previousValue, previousPriority);
      } else {
        documentRoot.style.removeProperty('--spacing');
      }
    }
  },
};

export const KeyboardFocusAndEscapeCrossShadowRoots: Story = {
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const ownerDocument = canvasElement.ownerDocument;
    const componentRoot = await getComponentRoot(canvasElement);
    const trigger = await getPickerTrigger(canvasElement);

    trigger.focus();
    void expect(componentRoot.activeElement).toBe(trigger);
    await userEvent.keyboard('{Enter}');

    const overlayRoot = await getOverlayRoot(ownerDocument);
    const panel = await getPopoverPanel(overlayRoot);

    await waitFor(() => {
      const focusedElement = overlayRoot.activeElement;
      void expect(focusedElement !== null && panel.contains(focusedElement)).toBe(true);
    });

    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      void expect(overlayRoot.querySelector('[data-slot="popover-content"]')).toBeNull();
    });
    await waitFor(() => {
      void expect(componentRoot.activeElement).toBe(trigger);
    });
  },
};

export const InsideAndOutsideClicksCrossShadowRoots: Story = {
  tags: ['integration'],
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <button type="button" data-testid="outside-control">
        Outside control
      </button>
      <IsolatedBibleVersionPicker />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const ownerDocument = canvasElement.ownerDocument;
    const outsideControl = canvasElement.querySelector<HTMLButtonElement>(
      '[data-testid="outside-control"]',
    );
    if (!outsideControl) throw new Error('outside control not rendered');

    const { overlayRoot, panel } = await openPicker(canvasElement, ownerDocument);
    const input = await waitFor(() => {
      const element = panel.querySelector<HTMLInputElement>('input');
      if (!element) throw new Error('popover search input not rendered');
      return element;
    });

    await userEvent.click(input);
    void expect(overlayRoot.querySelector('[data-slot="popover-content"]')).toBe(panel);

    await userEvent.click(outsideControl);
    await waitFor(() => {
      void expect(overlayRoot.querySelector('[data-slot="popover-content"]')).toBeNull();
    });
  },
};

export const AriaControlsDoesNotResolveAcrossSharedShadowRoots: Story = {
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const ownerDocument = canvasElement.ownerDocument;
    const { trigger, panel } = await openPicker(canvasElement, ownerDocument);

    void expect(trigger.getAttribute('aria-controls')).toBe(panel.id);

    const reflectedControls = (
      trigger as HTMLElement & { ariaControlsElements?: readonly Element[] }
    ).ariaControlsElements;
    if (!reflectedControls) {
      throw new Error('Chromium did not expose ariaControlsElements');
    }
    // The ID strings match, but IDREF resolution is scoped to the trigger's
    // shadow tree and therefore cannot reach the separate overlay shadow tree.
    void expect(reflectedControls).toHaveLength(0);
  },
};

export const PopoverDialogSemanticsAndFocusAcrossShadowRoots: Story = {
  tags: ['integration'],
  play: async ({ canvasElement }) => {
    const ownerDocument = canvasElement.ownerDocument;
    const componentRoot = await getComponentRoot(canvasElement);
    const trigger = await getPickerTrigger(canvasElement);

    trigger.focus();
    await userEvent.keyboard('{Enter}');

    const overlayRoot = await getOverlayRoot(ownerDocument);
    const panel = await getPopoverPanel(overlayRoot);

    void expect(trigger).toHaveAttribute('aria-expanded', 'true');
    void expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    void expect(panel).toHaveAttribute('role', 'dialog');
    await waitFor(() => {
      const focusedElement = overlayRoot.activeElement;
      void expect(focusedElement !== null && panel.contains(focusedElement)).toBe(true);
    });

    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      void expect(componentRoot.activeElement).toBe(trigger);
    });
  },
};

export const SharedOverlayReuseAndLifecycle: Story = {
  tags: ['integration'],
  render: () => <SharedOverlayLifecycleHarness />,
  play: async ({ canvasElement }) => {
    const ownerDocument = canvasElement.ownerDocument;
    const firstTrigger = await getNamedPickerTrigger(canvasElement, 'first-picker');
    const secondTrigger = await getNamedPickerTrigger(canvasElement, 'second-picker');
    const overlayRoot = await getOverlayRoot(ownerDocument);

    void expect(ownerDocument.body.querySelectorAll('[data-yv-shadow-overlay-host]')).toHaveLength(
      1,
    );

    await userEvent.click(firstTrigger);
    await waitFor(() => {
      void expect(overlayRoot.querySelectorAll('[data-slot="popover-content"]')).toHaveLength(1);
    });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      void expect(overlayRoot.querySelectorAll('[data-slot="popover-content"]')).toHaveLength(0);
    });

    await userEvent.click(secondTrigger);
    await waitFor(() => {
      void expect(overlayRoot.querySelectorAll('[data-slot="popover-content"]')).toHaveLength(1);
    });

    await userEvent.click(canvasElement.getElementsByTagName('button')[0]!);
    await waitFor(() => {
      void expect(canvasElement.querySelector('[data-testid="second-picker"]')).toBeNull();
      void expect(overlayRoot.querySelectorAll('[data-slot="popover-content"]')).toHaveLength(0);
    });
    void expect(ownerDocument.body.querySelectorAll('[data-yv-shadow-overlay-host]')).toHaveLength(
      1,
    );
  },
};

export const MultiplePickersCoordinateInSharedOverlay: Story = {
  tags: ['integration'],
  render: () => (
    <div>
      <div data-testid="first-picker">
        <IsolatedBibleVersionPicker />
      </div>
      <div data-testid="second-picker">
        <IsolatedBibleVersionPicker />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const ownerDocument = canvasElement.ownerDocument;
    const firstTrigger = await getNamedPickerTrigger(canvasElement, 'first-picker');
    const secondTrigger = await getNamedPickerTrigger(canvasElement, 'second-picker');
    const overlayRoot = await getOverlayRoot(ownerDocument);

    await userEvent.click(firstTrigger);
    await waitFor(() => {
      void expect(firstTrigger).toHaveAttribute('aria-expanded', 'true');
      void expect(secondTrigger).toHaveAttribute('aria-expanded', 'false');
      void expect(overlayRoot.querySelectorAll('[data-slot="popover-content"]')).toHaveLength(1);
    });

    await userEvent.click(secondTrigger);
    await waitFor(() => {
      void expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
      void expect(secondTrigger).toHaveAttribute('aria-expanded', 'true');
      void expect(overlayRoot.querySelectorAll('[data-slot="popover-content"]')).toHaveLength(1);
    });
  },
};
