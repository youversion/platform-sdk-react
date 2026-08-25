import type { Meta, StoryObj } from '@storybook/react-vite';
import { YouVersionProvider as HooksYouVersionProvider } from '@youversion/platform-react-hooks';
import { http, HttpResponse } from 'msw';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { requireShadowRoot } from '../test/dom-stubs';
import { globalHandlers } from '../test/mocks/handlers';
import { BibleVersionPicker } from './bible-version-picker';

type PortalStrategy = 'local-inline' | 'local-top-layer';

function IsolatedBibleVersionPicker({
  side = 'top',
  portalStrategy = 'local-top-layer',
}: {
  side?: 'top' | 'right' | 'bottom' | 'left';
  portalStrategy?: PortalStrategy;
}): React.ReactNode {
  const [versionId, setVersionId] = useState(111);

  return (
    <ShadowRootHost portalStrategy={portalStrategy}>
      <BibleVersionPicker.Root versionId={versionId} onVersionChange={setVersionId} side={side}>
        <BibleVersionPicker.Trigger />
        <BibleVersionPicker.Content />
      </BibleVersionPicker.Root>
    </ShadowRootHost>
  );
}

function TwoPickersInOneIsland(): React.ReactNode {
  const [firstVersionId, setFirstVersionId] = useState(111);
  const [secondVersionId, setSecondVersionId] = useState(111);

  return (
    <ShadowRootHost portalStrategy="local-top-layer">
      <div data-testid="first-picker">
        <BibleVersionPicker.Root versionId={firstVersionId} onVersionChange={setFirstVersionId}>
          <BibleVersionPicker.Trigger />
          <BibleVersionPicker.Content />
        </BibleVersionPicker.Root>
      </div>
      <div data-testid="second-picker">
        <BibleVersionPicker.Root versionId={secondVersionId} onVersionChange={setSecondVersionId}>
          <BibleVersionPicker.Trigger />
          <BibleVersionPicker.Content />
        </BibleVersionPicker.Root>
      </div>
    </ShadowRootHost>
  );
}

function StrategySwitchingPicker(): React.ReactNode {
  const [portalStrategy, setPortalStrategy] = useState<PortalStrategy | undefined>('local-inline');
  const [versionId, setVersionId] = useState(111);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setPortalStrategy('local-top-layer')}>
          Use top layer
        </button>
        <button type="button" onClick={() => setPortalStrategy(undefined)}>
          Disable local portal
        </button>
      </div>
      <ShadowRootHost portalStrategy={portalStrategy}>
        <BibleVersionPicker.Root versionId={versionId} onVersionChange={setVersionId} side="bottom">
          <BibleVersionPicker.Trigger />
          <BibleVersionPicker.Content />
        </BibleVersionPicker.Root>
      </ShadowRootHost>
    </div>
  );
}

function SameOriginIframeHarness(): React.ReactNode {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframeDocument = iframeRef.current?.contentDocument;
    if (!iframeDocument) return;

    const portalContainer = iframeDocument.createElement('div');
    portalContainer.style.setProperty('display', 'grid');
    portalContainer.style.setProperty('min-block-size', '100vh');
    portalContainer.style.setProperty('place-items', 'center');
    iframeDocument.body.append(portalContainer);
    setContainer(portalContainer);

    return () => portalContainer.remove();
  }, []);

  return (
    <>
      <iframe
        ref={iframeRef}
        data-testid="iframe"
        title="same-origin picker target"
        style={{ inlineSize: 800, blockSize: 600 }}
      />
      {container
        ? createPortal(
            <HooksYouVersionProvider appKey="123" apiHost="https://api.youversion.com">
              <IsolatedBibleVersionPicker />
            </HooksYouVersionProvider>,
            container,
          )
        : null}
    </>
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

async function getComponentRoot(container: ParentNode): Promise<ShadowRoot> {
  return waitFor(() => requireShadowRoot(container));
}

async function getTrigger(root: ShadowRoot): Promise<HTMLElement> {
  return waitFor(() => {
    const trigger = root.querySelector<HTMLElement>('[data-slot="popover-trigger"]');
    if (!trigger) throw new Error('picker trigger not rendered');
    return trigger;
  });
}

async function openPicker(container: ParentNode) {
  const root = await getComponentRoot(container);
  const trigger = await getTrigger(root);
  void expect(root.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();
  await userEvent.click(trigger);
  const topLayer = await waitFor(() => {
    const element = root.querySelector<HTMLElement>('[data-yv-shadow-local-overlay]');
    if (!element) throw new Error('local top-layer container not created');
    return element;
  });
  const panel = await waitFor(() => {
    const element = topLayer.querySelector<HTMLElement>('[data-slot="popover-content"]');
    if (!element) throw new Error('picker panel not rendered in local top layer');
    return element;
  });
  await waitFor(() => void expect(topLayer.matches(':popover-open')).toBe(true));
  return { root, trigger, topLayer, panel };
}

function styleSnapshot(element: HTMLElement) {
  const styles = getComputedStyle(element);
  return {
    backgroundColor: styles.backgroundColor,
    borderRadius: styles.borderRadius,
    color: styles.color,
    display: styles.display,
    fontFamily: styles.fontFamily,
    fontSize: styles.fontSize,
    padding: styles.padding,
  };
}

export const TopLayerEscapesClippingAndPreservesSemantics: Story = {
  render: () => (
    <div
      data-testid="clipping-container"
      style={{ inlineSize: 180, blockSize: 56, overflow: 'hidden', transform: 'translateZ(0)' }}
    >
      <IsolatedBibleVersionPicker side="bottom" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const clippingContainer = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>(
        '[data-testid="clipping-container"]',
      );
      if (!element) throw new Error('clipping container not rendered');
      return element;
    });
    const { root, trigger, topLayer, panel } = await openPicker(clippingContainer);

    void expect(topLayer.getRootNode()).toBe(root);
    void expect(panel.getRootNode()).toBe(root);
    void expect(
      canvasElement.ownerDocument.body.querySelector('[data-yv-shadow-overlay-host]'),
    ).toBeNull();

    const clippingRect = clippingContainer.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    void expect(panelRect.bottom).toBeGreaterThan(clippingRect.bottom + 1);
    const viewport = canvasElement.ownerDocument.defaultView;
    if (!viewport) throw new Error('story window not available');
    void expect(panelRect.top).toBeGreaterThanOrEqual(16);
    void expect(panelRect.left).toBeGreaterThanOrEqual(16);
    void expect(panelRect.bottom).toBeLessThanOrEqual(viewport.innerHeight - 16);
    void expect(panelRect.right).toBeLessThanOrEqual(viewport.innerWidth - 16);

    const sampleX = panelRect.left + panelRect.width / 2;
    const sampleY = Math.max(panelRect.top + 2, clippingRect.bottom + 2);
    if (sampleY >= panelRect.bottom) throw new Error('panel did not extend beyond its ancestor');
    const hit = root.elementFromPoint(sampleX, sampleY);
    void expect(hit === panel || (hit !== null && panel.contains(hit))).toBe(true);

    // SAFETY: Chromium exposes this reflected-ARIA draft property; the guard below verifies it.
    const reflectedControls = (
      trigger as HTMLElement & { ariaControlsElements?: readonly Element[] }
    ).ariaControlsElements;
    if (!reflectedControls) throw new Error('Chromium did not expose ariaControlsElements');
    void expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    void expect(reflectedControls).toEqual([panel]);
  },
};

export const InlineControlIsClippedByItsAncestor: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 12, inlineSize: 420 }}>
      <div>
        <strong style={{ display: 'block', font: '600 14px/1.4 system-ui' }}>
          Inline portal: intentionally clipped
        </strong>
        <span style={{ color: '#666', font: '13px/1.4 system-ui' }}>
          The menu opens below the trigger, but only the portion inside the dashed frame remains
          visible.
        </span>
      </div>
      <div
        data-testid="clipping-container"
        style={{
          inlineSize: 420,
          blockSize: 150,
          overflow: 'hidden',
          padding: 16,
          border: '2px dashed #a3a3a3',
          borderRadius: 12,
          transform: 'translateZ(0)',
        }}
      >
        <IsolatedBibleVersionPicker side="bottom" portalStrategy="local-inline" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const clippingContainer = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>(
        '[data-testid="clipping-container"]',
      );
      if (!element) throw new Error('clipping container not rendered');
      return element;
    });
    const root = await getComponentRoot(clippingContainer);
    void expect(root.querySelector('[data-yv-shadow-inline-overlay]')).toBeNull();
    await userEvent.click(await getTrigger(root));
    const inlineContainer = await waitFor(() => {
      const element = root.querySelector<HTMLElement>('[data-yv-shadow-inline-overlay]');
      if (!element) throw new Error('inline portal container not created');
      return element;
    });
    const panel = await waitFor(() => {
      const element = inlineContainer.querySelector<HTMLElement>('[data-slot="popover-content"]');
      if (!element) throw new Error('inline picker panel not rendered');
      return element;
    });

    const clippingRect = clippingContainer.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    void expect(panelRect.bottom).toBeGreaterThan(clippingRect.bottom + 1);
    const sampleX = panelRect.left + panelRect.width / 2;
    const visibleSampleY = Math.max(panelRect.top + 2, clippingRect.top + 2);
    if (visibleSampleY >= clippingRect.bottom) {
      throw new Error('panel has no visible area inside its clipping ancestor');
    }
    const visibleHit = root.elementFromPoint(sampleX, visibleSampleY);
    void expect(visibleHit === panel || (visibleHit !== null && panel.contains(visibleHit))).toBe(
      true,
    );

    const clippedSampleY = Math.max(panelRect.top + 2, clippingRect.bottom + 2);
    if (clippedSampleY >= panelRect.bottom) {
      throw new Error('panel did not extend beyond its clipping ancestor');
    }
    const clippedHit = root.elementFromPoint(sampleX, clippedSampleY);
    void expect(clippedHit === panel || (clippedHit !== null && panel.contains(clippedHit))).toBe(
      false,
    );
  },
};

export const StylingFocusDismissalAndRapidReopen: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <button type="button" data-testid="outside-control">
        Outside control
      </button>
      <IsolatedBibleVersionPicker />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const outsideControl = canvasElement.querySelector<HTMLButtonElement>(
      '[data-testid="outside-control"]',
    );
    if (!outsideControl) throw new Error('outside control not rendered');
    const { root, trigger, topLayer, panel } = await openPicker(canvasElement);
    await waitFor(() => {
      const focused = root.activeElement;
      void expect(focused !== null && panel.contains(focused)).toBe(true);
    });

    const baseline = styleSnapshot(panel);
    const hostileStyle = canvasElement.ownerDocument.createElement('style');
    hostileStyle.textContent = `
      button, input, [role='dialog'] {
        background: rgb(185, 28, 28) !important;
        border: 10px dashed lime !important;
        border-radius: 0 !important;
        color: yellow !important;
        font: 32px/1 fantasy !important;
        padding: 40px !important;
      }
    `;
    try {
      canvasElement.ownerDocument.head.append(hostileStyle);
      await waitFor(
        () =>
          void expect(getComputedStyle(outsideControl).backgroundColor).toBe('rgb(185, 28, 28)'),
      );
      void expect(styleSnapshot(panel)).toEqual(baseline);
    } finally {
      hostileStyle.remove();
    }

    await userEvent.click(outsideControl);
    await waitFor(() => {
      void expect(panel).toHaveAttribute('data-state', 'closed');
      void expect(topLayer).toContainElement(panel);
      void expect(topLayer.matches(':popover-open')).toBe(true);
    });
    await waitFor(() => {
      void expect(topLayer.querySelector('[data-slot="popover-content"]')).toBeNull();
      void expect(topLayer.matches(':popover-open')).toBe(false);
    });

    await userEvent.click(trigger);
    const reopenedPanel = await waitFor(() => {
      const element = topLayer.querySelector<HTMLElement>('[data-slot="popover-content"]');
      if (!element) throw new Error('picker panel did not reopen');
      return element;
    });
    await waitFor(() => {
      const activeElement = root.activeElement;
      void expect(activeElement !== null && reopenedPanel.contains(activeElement)).toBe(true);
    });

    const focused = root.activeElement;
    if (!(focused instanceof HTMLElement)) throw new Error('picker focus not available');
    focused.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }),
    );
    trigger.click();
    await waitFor(() => {
      void expect(topLayer.matches(':popover-open')).toBe(true);
      void expect(topLayer.querySelectorAll('[data-slot="popover-content"]')).toHaveLength(1);
    });

    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      void expect(topLayer.querySelector('[data-slot="popover-content"]')).toBeNull();
      void expect(topLayer.matches(':popover-open')).toBe(false);
      void expect(root.activeElement).toBe(trigger);
    });
  },
};

export const MultiplePickersCreateIndependentLazyContainers: Story = {
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
    const first = canvasElement.querySelector<HTMLElement>('[data-testid="first-picker"]');
    const second = canvasElement.querySelector<HTMLElement>('[data-testid="second-picker"]');
    if (!first || !second) throw new Error('picker harness not rendered');
    const firstRoot = await getComponentRoot(first);
    const secondRoot = await getComponentRoot(second);
    void expect(firstRoot.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();
    void expect(secondRoot.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();

    const firstTrigger = await getTrigger(firstRoot);
    const secondTrigger = await getTrigger(secondRoot);
    await userEvent.click(firstTrigger);
    const firstTopLayer = await waitFor(() => {
      const element = firstRoot.querySelector<HTMLElement>('[data-yv-shadow-local-overlay]');
      if (!element) throw new Error('first local container not created');
      return element;
    });
    void expect(secondRoot.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();

    await userEvent.click(secondTrigger);
    const secondTopLayer = await waitFor(() => {
      const element = secondRoot.querySelector<HTMLElement>('[data-yv-shadow-local-overlay]');
      if (!element) throw new Error('second local container not created');
      return element;
    });
    await waitFor(() => {
      void expect(firstTopLayer.matches(':popover-open')).toBe(false);
      void expect(secondTopLayer.matches(':popover-open')).toBe(true);
      void expect(secondTopLayer.querySelectorAll('[data-slot="popover-content"]')).toHaveLength(1);
    });
  },
};

export const MultiplePopoversShareOneIslandContainer: Story = {
  render: () => <TwoPickersInOneIsland />,
  play: async ({ canvasElement }) => {
    const root = await getComponentRoot(canvasElement);
    const triggers = Array.from(
      root.querySelectorAll<HTMLElement>('[data-slot="popover-trigger"]'),
    );
    void expect(triggers).toHaveLength(2);
    const [firstTrigger, secondTrigger] = triggers;
    if (!firstTrigger || !secondTrigger) throw new Error('picker triggers not rendered');
    void expect(root.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();

    await userEvent.click(firstTrigger);
    const topLayer = await waitFor(() => {
      const element = root.querySelector<HTMLElement>('[data-yv-shadow-local-overlay]');
      if (!element) throw new Error('shared island container not created');
      return element;
    });
    await waitFor(() => {
      void expect(firstTrigger).toHaveAttribute('aria-expanded', 'true');
      void expect(topLayer.querySelectorAll('[data-slot="popover-content"]')).toHaveLength(1);
    });

    await userEvent.click(secondTrigger);
    await waitFor(() => {
      void expect(firstTrigger).toHaveAttribute('aria-expanded', 'false');
      void expect(secondTrigger).toHaveAttribute('aria-expanded', 'true');
      void expect(topLayer.matches(':popover-open')).toBe(true);
      void expect(topLayer.querySelectorAll('[data-slot="popover-content"]')).toHaveLength(1);
      void expect(root.querySelectorAll('[data-yv-shadow-local-overlay]')).toHaveLength(1);
    });

    const panel = topLayer.querySelector<HTMLElement>('[data-slot="popover-content"]');
    if (!panel) throw new Error('second picker panel not rendered');
    const panelRect = panel.getBoundingClientRect();
    const viewport = canvasElement.ownerDocument.defaultView;
    if (!viewport) throw new Error('story window not available');
    void expect(panelRect.top).toBeGreaterThanOrEqual(16);
    void expect(panelRect.bottom).toBeLessThanOrEqual(viewport.innerHeight - 16);
  },
};

export const PortalStrategyChangesReplaceTheirLocalContainer: Story = {
  render: () => <StrategySwitchingPicker />,
  play: async ({ canvasElement }) => {
    const root = await getComponentRoot(canvasElement);
    const trigger = await getTrigger(root);

    await userEvent.click(trigger);
    const inlineContainer = await waitFor(() => {
      const element = root.querySelector<HTMLElement>('[data-yv-shadow-inline-overlay]');
      if (!element) throw new Error('inline portal container not created');
      return element;
    });
    await waitFor(() => {
      void expect(inlineContainer.querySelector('[data-slot="popover-content"]')).not.toBeNull();
    });

    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      void expect(inlineContainer.querySelector('[data-slot="popover-content"]')).toBeNull();
    });

    await userEvent.click(
      await within(canvasElement).findByRole('button', { name: 'Use top layer' }),
    );
    await waitFor(() => {
      void expect(inlineContainer.isConnected).toBe(false);
      void expect(root.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();
    });

    await userEvent.click(trigger);
    const topLayer = await waitFor(() => {
      const element = root.querySelector<HTMLElement>('[data-yv-shadow-local-overlay]');
      if (!element) throw new Error('top-layer portal container not created');
      return element;
    });
    await waitFor(() => {
      void expect(topLayer.matches(':popover-open')).toBe(true);
      void expect(topLayer.querySelector('[data-slot="popover-content"]')).not.toBeNull();
    });

    await userEvent.keyboard('{Escape}');
    await waitFor(() => {
      void expect(topLayer.querySelector('[data-slot="popover-content"]')).toBeNull();
      void expect(topLayer.matches(':popover-open')).toBe(false);
    });

    await userEvent.click(
      await within(canvasElement).findByRole('button', { name: 'Disable local portal' }),
    );
    await waitFor(() => {
      void expect(topLayer.isConnected).toBe(false);
      void expect(root.querySelector('[data-yv-shadow-local-overlay]')).toBeNull();
    });

    await userEvent.click(trigger);
    await waitFor(() => {
      const panel = canvasElement.ownerDocument.body.querySelector<HTMLElement>(
        '[data-slot="popover-content"]',
      );
      if (!panel) throw new Error('document fallback panel not rendered');
      void expect(panel.getRootNode()).toBe(canvasElement.ownerDocument);
    });
  },
};

export const PanelTracksAncestorScrollAndVersionListScrollsInternally: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 32 }}>
      <div
        data-testid="scroll-ancestor"
        style={{ inlineSize: 320, blockSize: 220, overflow: 'auto', border: '1px solid #ccc' }}
      >
        <div style={{ blockSize: 400 }} />
        <div data-testid="scroll-picker">
          <IsolatedBibleVersionPicker side="bottom" />
        </div>
        <div style={{ blockSize: 400 }} />
      </div>
      <div data-testid="list-picker">
        <IsolatedBibleVersionPicker side="bottom" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // Part 1: the panel repositions when its ancestor scrolls. Radix's
    // Popper still recalculates position for content living in the native
    // top-layer container, even though that container itself sits outside
    // normal document flow.
    const scrollAncestor = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>('[data-testid="scroll-ancestor"]');
      if (!element) throw new Error('scroll ancestor not rendered');
      return element;
    });
    scrollAncestor.scrollTop = 350;
    scrollAncestor.dispatchEvent(new Event('scroll', { bubbles: true }));

    const scrollPickerContainer = canvasElement.querySelector<HTMLElement>(
      '[data-testid="scroll-picker"]',
    );
    if (!scrollPickerContainer) throw new Error('scroll picker container not rendered');
    const { trigger, panel } = await openPicker(scrollPickerContainer);

    const triggerRectBefore = trigger.getBoundingClientRect();
    const panelRectBefore = panel.getBoundingClientRect();
    // The trigger→panel offset, not raw position — collision middleware can
    // legitimately re-flip/re-offset the panel near viewport edges, so
    // asserting the two move in exact lockstep would be flaky. The scroll
    // distance below is kept well clear of any collision-flip threshold.
    const offsetBefore = panelRectBefore.top - triggerRectBefore.bottom;

    const scrollDelta = 80;
    scrollAncestor.scrollTop += scrollDelta;
    scrollAncestor.dispatchEvent(new Event('scroll', { bubbles: true }));

    await waitFor(() => {
      const triggerRectAfter = trigger.getBoundingClientRect();
      void expect(
        Math.abs(triggerRectAfter.top - (triggerRectBefore.top - scrollDelta)),
      ).toBeLessThan(2);
    });
    const triggerRectAfter = trigger.getBoundingClientRect();
    const panelRectAfter = panel.getBoundingClientRect();
    const offsetAfter = panelRectAfter.top - triggerRectAfter.bottom;
    void expect(Math.abs(offsetAfter - offsetBefore)).toBeLessThan(8);

    // Part 2: the version list scrolls internally within the panel. Locate
    // the scroll region via the unconditional "All Versions" marker's
    // parent — not the "recently used" section, which only renders given
    // prior usage state a fresh story never has.
    const listPickerContainer = canvasElement.querySelector<HTMLElement>(
      '[data-testid="list-picker"]',
    );
    if (!listPickerContainer) throw new Error('list picker container not rendered');
    const { root: listRoot, panel: listPanel } = await openPicker(listPickerContainer);

    const versionList = await waitFor(() => {
      const element = listPanel.querySelector<HTMLElement>('[data-testid="version-list"]');
      if (!element) throw new Error('version list not rendered');
      return element;
    });
    const scrollRegion = versionList.parentElement;
    if (!scrollRegion) throw new Error('version list scroll region not found');

    const items = Array.from(versionList.querySelectorAll<HTMLElement>('[role="listitem"]'));
    if (items.length < 4) {
      throw new Error('fixture does not provide enough versions to exercise scrolling');
    }
    const lastItem = items[items.length - 1];
    if (!lastItem) throw new Error('no version items rendered');

    const initialScrollTop = scrollRegion.scrollTop;
    scrollRegion.scrollTop = scrollRegion.scrollHeight;
    scrollRegion.dispatchEvent(new Event('scroll', { bubbles: true }));

    await waitFor(() => {
      void expect(scrollRegion.scrollTop).toBeGreaterThan(initialScrollTop);
    });

    const lastItemRect = lastItem.getBoundingClientRect();
    const hit = listRoot.elementFromPoint(
      lastItemRect.left + lastItemRect.width / 2,
      lastItemRect.top + lastItemRect.height / 2,
    );
    void expect(hit === lastItem || (hit !== null && lastItem.contains(hit))).toBe(true);
  },
};

export const SameOriginIframeTopLayerRemainsInteractive: Story = {
  render: () => <SameOriginIframeHarness />,
  play: async ({ canvasElement }) => {
    const iframe = canvasElement.querySelector<HTMLIFrameElement>('[data-testid="iframe"]');
    if (!iframe?.contentDocument) throw new Error('same-origin iframe document not available');
    const componentRoot = await getComponentRoot(iframe.contentDocument);
    const trigger = await getTrigger(componentRoot);
    await userEvent.click(trigger);
    const topLayer = await waitFor(() => {
      const element = componentRoot.querySelector<HTMLElement>('[data-yv-shadow-local-overlay]');
      if (!element) throw new Error('iframe top-layer container not created');
      return element;
    });
    const portalWrapper = await waitFor(() => {
      const element = topLayer.firstElementChild;
      // SAFETY: A same-origin iframe exposes its realm's HTMLElement constructor on its Window.
      const frameWindow = iframe.contentWindow as
        | (Window & { HTMLElement: typeof HTMLElement })
        | null;
      if (!frameWindow || !(element instanceof frameWindow.HTMLElement)) {
        throw new Error('iframe portal wrapper not rendered in its owner realm');
      }
      return element;
    });
    const portalWindow = portalWrapper.ownerDocument.defaultView;
    if (!portalWindow) throw new Error('iframe portal window not available');
    void expect(portalWindow.getComputedStyle(portalWrapper).pointerEvents).toBe('auto');

    const input = await waitFor(() => {
      const element = topLayer.querySelector<HTMLInputElement>('input');
      if (!element) throw new Error('iframe picker input not rendered');
      return element;
    });
    await userEvent.click(input);
    void expect(componentRoot.activeElement).toBe(input);

    const panel = topLayer.querySelector<HTMLElement>('[data-slot="popover-content"]');
    if (!panel) throw new Error('iframe picker panel not rendered');
    const panelRect = panel.getBoundingClientRect();
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) throw new Error('iframe window not available');
    void expect(panelRect.top).toBeGreaterThanOrEqual(16);
    void expect(panelRect.bottom).toBeLessThanOrEqual(frameWindow.innerHeight - 16);
  },
};
