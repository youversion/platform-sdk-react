import type { Meta, StoryObj } from '@storybook/react-vite';

import { useTheme } from '@youversion/platform-react-hooks';
import { http, HttpResponse } from 'msw';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { expect, userEvent } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { waitFor, waitForElement } from '../test/storybook-dom';
import { Textarea } from './ui/textarea';
import { YouVersionAuthButton } from './YouVersionAuthButton';

const meta = {
  title: 'Guides/Shadow DOM consumer compatibility',
  tags: ['integration', 'shadow-dom'],
  parameters: {
    docs: {
      description: {
        component:
          'Use these scenarios to understand the supported consumer boundary: query through open shadow roots, keep form and ARIA relationships within one tree scope, and account for documented event-retargeting limits. Review the [migration guidance](https://github.com/youversion/platform-sdk-react/blob/main/packages/ui/README.md#shadow-dom-migration-guidance) for client-only rendering, ref timing, styling, fonts, layout, and overlays. See the [release-candidate evidence](https://github.com/youversion/platform-sdk-react/blob/main/docs/shadow-dom-isolation-plan.md#ype-5952-release-candidate-validation) for the validated browser and assistive-technology combinations and remaining gaps.',
      },
    },
    layout: 'padded',
    msw: {
      handlers: [
        http.get('*/v1/fonts/1/stylesheet', () =>
          HttpResponse.text('', { headers: { 'Content-Type': 'text/css' } }),
        ),
      ],
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function requireElement<ElementType extends Element>(
  container: ParentNode,
  selector: string,
  message: string,
): ElementType {
  const element = container.querySelector<ElementType>(selector);
  if (!element) throw new Error(message);
  return element;
}

async function requireShadowHost(container: ParentNode): Promise<HTMLElement> {
  return waitFor(async () => {
    const host = requireElement<HTMLElement>(
      container,
      '[data-yv-shadow-host]',
      'shadow host not rendered',
    );
    if (!host.shadowRoot) throw new Error('shadow root not attached');
    return host;
  });
}

interface ReactEventObservation {
  currentTarget: EventTarget | null;
  nativeEvent: Event;
  relatedTarget?: EventTarget | null;
  target: EventTarget | null;
}

interface AutomaticButtonEvidenceOutput extends HTMLOutputElement {
  ancestorBlurs?: ReactEventObservation[];
  ancestorClicks?: ReactEventObservation[];
  ancestorFocuses?: ReactEventObservation[];
  ancestorKeyDowns?: ReactEventObservation[];
  componentBlurs?: ReactEventObservation[];
  componentClicks?: ReactEventObservation[];
  componentFocuses?: ReactEventObservation[];
  componentKeyDowns?: ReactEventObservation[];
  forwardedRefNode?: EventTarget | null;
}

const validatedBubblingEventNames = [
  'keyup',
  'pointerdown',
  'pointerup',
  'mousedown',
  'mouseup',
  'dblclick',
  'contextmenu',
] as const;
type ValidatedBubblingEventName = (typeof validatedBubblingEventNames)[number];

interface ValidatedBubblingEventsEvidenceOutput extends HTMLOutputElement {
  ancestorClickCaptureCount?: number;
  ancestorCounts?: Partial<Record<ValidatedBubblingEventName, number>>;
  componentPointerDowns?: ReactEventObservation[];
  componentPointerUps?: ReactEventObservation[];
}

interface NestedRootsEvidenceOutput extends HTMLOutputElement {
  componentBlurs?: ReactEventObservation[];
  lightDomAncestorBlurs?: ReactEventObservation[];
  lightDomAncestorClickCount?: number;
  lightDomAncestorPointerDownCount?: number;
  outerShadowAncestorBlurs?: ReactEventObservation[];
  outerShadowAncestorClickCount?: number;
  outerShadowAncestorPointerDownCount?: number;
}

interface CompatibilityScenarioProps {
  children: React.ReactNode;
  classification: string;
  expectedResult: string;
  summary: string;
  title: string;
}

function CompatibilityScenario({
  children,
  classification,
  expectedResult,
  summary,
  title,
}: CompatibilityScenarioProps): React.ReactNode {
  const theme = useTheme();

  return (
    <section
      className="yv:border-border yv:text-foreground"
      data-yv-sdk
      data-yv-theme={theme}
      style={{
        borderStyle: 'solid',
        borderWidth: '1px',
        borderRadius: '0.75rem',
        display: 'grid',
        fontFamily: 'system-ui, sans-serif',
        gap: '1.25rem',
        maxInlineSize: '44rem',
        padding: '1.5rem',
      }}
    >
      <header style={{ display: 'grid', gap: '0.5rem' }}>
        <p
          className="yv:text-muted-foreground"
          style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}
        >
          SHADOW DOM COMPATIBILITY EVIDENCE
        </p>
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{title}</h2>
        <p style={{ lineHeight: 1.5, margin: 0 }}>{summary}</p>
      </header>
      <aside
        aria-label="Expected result"
        className="yv:bg-muted yv:border-muted-foreground"
        style={{
          borderInlineStartStyle: 'solid',
          borderInlineStartWidth: '0.25rem',
          paddingBlock: '0.75rem',
          paddingInline: '1rem',
        }}
      >
        <p
          className="yv:text-muted-foreground"
          style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0 }}
        >
          EXPECTED RESULT
        </p>
        <p style={{ fontWeight: 700, margin: 0 }}>{classification}</p>
        <p style={{ lineHeight: 1.5, marginBlock: '0.25rem 0', marginInline: 0 }}>
          {expectedResult}
        </p>
      </aside>
      <div
        className="yv:border-border"
        style={{
          borderBlockStartStyle: 'solid',
          borderBlockStartWidth: '1px',
          paddingBlockStart: '1.25rem',
        }}
      >
        <p style={{ fontSize: '0.875rem', fontWeight: 700, marginBlock: '0 0.75rem' }}>
          Rendered example
        </p>
        {children}
      </div>
    </section>
  );
}

function FormRelationshipsHarness(): React.ReactNode {
  return (
    <CompatibilityScenario
      classification="Unsupported across tree scopes"
      expectedResult="The outer form, label, accessible name, and description cannot establish native relationships with the textarea inside the shadow root."
      summary="This example places form metadata in the light DOM and a textarea inside an SDK shadow root."
      title="Forms, labels, and descriptions"
    >
      <form data-testid="consumer-form" style={{ display: 'grid', gap: '0.5rem' }}>
        <label htmlFor="isolated-notes" data-testid="external-label">
          Notes
        </label>
        <span id="external-name">External accessible name</span>
        <span id="external-description">External accessible description</span>
        <ShadowRootHost>
          <Textarea
            id="isolated-notes"
            name="notes"
            defaultValue="consumer value"
            aria-labelledby="external-name"
            aria-describedby="external-description"
          />
        </ShadowRootHost>
      </form>
    </CompatibilityScenario>
  );
}

export const FormsAndExternalRelationshipsStopAtTheTreeScope: Story = {
  name: 'External relationships stop at the shadow boundary',
  render: () => <FormRelationshipsHarness />,
  play: async ({ canvasElement }) => {
    const form = await waitFor(
      () =>
        requireElement<HTMLFormElement>(
          canvasElement,
          '[data-testid="consumer-form"]',
          'consumer form not rendered',
        ),
      { timeout: 5_000 },
    );
    const label = requireElement<HTMLLabelElement>(
      canvasElement,
      '[data-testid="external-label"]',
      'external label not rendered',
    );
    const host = await requireShadowHost(form);
    const root = host.shadowRoot!;
    const textarea = await waitForElement<HTMLTextAreaElement>(
      root,
      '#isolated-notes',
      'isolated textarea not rendered',
    );

    await expect(textarea.form).toBeNull();
    await expect(form.elements.namedItem('notes')).toBeNull();
    await expect(new FormData(form).has('notes')).toBe(false);

    await expect(label.control).toBeNull();
    await userEvent.click(label);
    await expect(root.activeElement).not.toBe(textarea);

    type ReflectedAriaElement = HTMLElement & {
      ariaLabelledByElements?: readonly Element[];
      ariaDescribedByElements?: readonly Element[];
    };
    // SAFETY: The optional extension models draft reflected-ARIA properties; verify before use.
    const reflectedTextarea = textarea as ReflectedAriaElement;
    if (!reflectedTextarea.ariaLabelledByElements) {
      throw new Error('browser did not expose ariaLabelledByElements');
    }
    if (!reflectedTextarea.ariaDescribedByElements) {
      throw new Error('browser did not expose ariaDescribedByElements');
    }

    await expect(textarea.getAttribute('aria-labelledby')).toBe('external-name');
    await expect(textarea.getAttribute('aria-describedby')).toBe('external-description');
    await expect(reflectedTextarea.ariaLabelledByElements).toEqual([]);
    await expect(reflectedTextarea.ariaDescribedByElements).toEqual([]);
  },
};

function AutomaticButtonHarness(): React.ReactNode {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const firstLayoutRefState = useRef<'pending' | 'null' | 'resolved'>('pending');
  const evidenceRef = useRef<AutomaticButtonEvidenceOutput | null>(null);
  const [firstLayoutResult, setFirstLayoutResult] = useState<'pending' | 'null' | 'resolved'>(
    'pending',
  );

  useLayoutEffect(() => {
    if (firstLayoutRefState.current !== 'pending') return;

    const result = buttonRef.current === null ? 'null' : 'resolved';
    firstLayoutRefState.current = result;
    setFirstLayoutResult(result);
  }, []);

  const receiveButtonRef = useCallback((node: HTMLButtonElement | null): void => {
    buttonRef.current = node;
    if (evidenceRef.current) evidenceRef.current.forwardedRefNode = node;
  }, []);

  return (
    <CompatibilityScenario
      classification="Supported with documented constraints"
      expectedResult="Each click, keydown, focus, and focus-leave dispatch reaches the component and its light-DOM React ancestor once. Component callbacks and the forwarded ref expose the internal button. Native listeners outside the root see the shadow host as the event target, and DOM selector APIs need explicit root traversal."
      summary="This example compares the views exposed to React consumers, native event listeners, refs, and DOM selector APIs."
      title="Single event dispatch, refs, and test queries"
    >
      <>
        <div
          data-testid="consumer-observer"
          onBlur={(event) => {
            if (evidenceRef.current) {
              (evidenceRef.current.ancestorBlurs ??= []).push({
                currentTarget: event.currentTarget,
                nativeEvent: event.nativeEvent,
                relatedTarget: event.relatedTarget,
                target: event.target,
              });
            }
          }}
          onClick={(event) => {
            if (evidenceRef.current) {
              (evidenceRef.current.ancestorClicks ??= []).push({
                currentTarget: event.currentTarget,
                nativeEvent: event.nativeEvent,
                target: event.target,
              });
            }
          }}
          onFocus={(event) => {
            if (evidenceRef.current) {
              (evidenceRef.current.ancestorFocuses ??= []).push({
                currentTarget: event.currentTarget,
                nativeEvent: event.nativeEvent,
                target: event.target,
              });
            }
          }}
          onKeyDown={(event) => {
            if (evidenceRef.current) {
              (evidenceRef.current.ancestorKeyDowns ??= []).push({
                currentTarget: event.currentTarget,
                nativeEvent: event.nativeEvent,
                target: event.target,
              });
            }
          }}
        >
          <YouVersionAuthButton
            ref={receiveButtonRef}
            data-testid="isolated-auth-button"
            mode="signOut"
            onBlur={(event) => {
              if (evidenceRef.current) {
                (evidenceRef.current.componentBlurs ??= []).push({
                  currentTarget: event.currentTarget,
                  nativeEvent: event.nativeEvent,
                  relatedTarget: event.relatedTarget,
                  target: event.target,
                });
              }
            }}
            onClick={(event) => {
              if (evidenceRef.current) {
                (evidenceRef.current.componentClicks ??= []).push({
                  currentTarget: event.currentTarget,
                  nativeEvent: event.nativeEvent,
                  target: event.target,
                });
              }
            }}
            onFocus={(event) => {
              if (evidenceRef.current) {
                (evidenceRef.current.componentFocuses ??= []).push({
                  currentTarget: event.currentTarget,
                  nativeEvent: event.nativeEvent,
                  target: event.target,
                });
              }
            }}
            onKeyDown={(event) => {
              if (evidenceRef.current) {
                (evidenceRef.current.componentKeyDowns ??= []).push({
                  currentTarget: event.currentTarget,
                  nativeEvent: event.nativeEvent,
                  target: event.target,
                });
              }
            }}
          />
          <output hidden data-testid="first-layout-ref-state">
            {firstLayoutResult}
          </output>
          <output hidden ref={evidenceRef} data-testid="automatic-button-evidence" />
        </div>
        <button type="button" data-testid="outside-focus-target">
          Outside focus target
        </button>
      </>
    </CompatibilityScenario>
  );
}

export const EventsRefsAndDomQueriesExposeDifferentConsumerViews: Story = {
  name: 'Events dispatch once while preserving consumer views',
  tags: ['cross-browser'],
  render: () => <AutomaticButtonHarness />,
  play: async ({ canvasElement }) => {
    const observer = await waitFor(async () =>
      requireElement<HTMLElement>(
        canvasElement,
        '[data-testid="consumer-observer"]',
        'consumer observer not rendered',
      ),
    );
    const host = await requireShadowHost(observer);
    const root = host.shadowRoot!;
    const button = await waitForElement<HTMLButtonElement>(
      root,
      '[data-testid="isolated-auth-button"]',
      'isolated auth button not rendered',
    );

    await expect(canvasElement.querySelector('[data-testid="isolated-auth-button"]')).toBeNull();
    await expect(root.querySelector('[data-testid="isolated-auth-button"]')).toBe(button);
    const firstLayoutEvidence = requireElement<HTMLOutputElement>(
      canvasElement,
      '[data-testid="first-layout-ref-state"]',
      'first layout ref state not rendered',
    );
    const evidence = requireElement<AutomaticButtonEvidenceOutput>(
      canvasElement,
      '[data-testid="automatic-button-evidence"]',
      'automatic button evidence not rendered',
    );
    const outsideFocusTarget = requireElement<HTMLButtonElement>(
      canvasElement,
      '[data-testid="outside-focus-target"]',
      'outside focus target not rendered',
    );
    await expect(firstLayoutEvidence).toHaveTextContent('null');
    await expect(firstLayoutEvidence).toHaveAttribute('hidden');
    await waitFor(async () => await expect(evidence.forwardedRefNode).toBe(button));

    const clickTarget = requireElement<HTMLDivElement>(
      button,
      'div',
      'auth button label click target not rendered',
    );
    const outsideClicks: Array<{
      event: Event;
      path: EventTarget[];
      target: EventTarget | null;
    }> = [];
    observer.addEventListener('click', (event) => {
      outsideClicks.push({ event, path: event.composedPath(), target: event.target });
    });
    const outsideKeyDowns: Array<{
      event: Event;
      path: EventTarget[];
      target: EventTarget | null;
    }> = [];
    observer.addEventListener('keydown', (event) => {
      outsideKeyDowns.push({ event, path: event.composedPath(), target: event.target });
    });
    const outsideFocusEvents: Array<{
      event: Event;
      path: EventTarget[];
      target: EventTarget | null;
    }> = [];
    observer.addEventListener('focusin', (event) => {
      outsideFocusEvents.push({ event, path: event.composedPath(), target: event.target });
    });
    const outsideFocusOutEvents: Array<{
      event: Event;
      path: EventTarget[];
      relatedTarget: EventTarget | null;
      target: EventTarget | null;
    }> = [];
    observer.addEventListener('focusout', (event) => {
      outsideFocusOutEvents.push({
        event,
        path: event.composedPath(),
        relatedTarget: event.relatedTarget,
        target: event.target,
      });
    });

    outsideFocusTarget.focus();
    button.focus();

    await expect(root.activeElement).toBe(button);
    await expect(evidence.ancestorFocuses).toEqual([
      { currentTarget: observer, nativeEvent: outsideFocusEvents[0]?.event, target: button },
    ]);
    await expect(evidence.componentFocuses).toEqual([
      { currentTarget: button, nativeEvent: outsideFocusEvents[0]?.event, target: button },
    ]);
    await expect(outsideFocusEvents).toHaveLength(1);
    await expect(outsideFocusEvents[0]?.target).toBe(host);
    await expect(outsideFocusEvents[0]?.path[0]).toBe(button);
    await expect(outsideFocusEvents[0]?.path).toContain(host);

    outsideFocusTarget.focus();
    button.focus();
    outsideFocusTarget.focus();

    await expect(outsideFocusEvents).toHaveLength(2);
    await expect(new Set(outsideFocusEvents.map(({ event }) => event))).toHaveLength(2);
    await expect(evidence.componentFocuses).toEqual(
      outsideFocusEvents.map(({ event }) => ({
        currentTarget: button,
        nativeEvent: event,
        target: button,
      })),
    );
    await expect(evidence.ancestorFocuses).toEqual(
      outsideFocusEvents.map(({ event }) => ({
        currentTarget: observer,
        nativeEvent: event,
        target: button,
      })),
    );
    for (const outsideFocusEvent of outsideFocusEvents) {
      await expect(outsideFocusEvent.target).toBe(host);
      await expect(outsideFocusEvent.path[0]).toBe(button);
      await expect(outsideFocusEvent.path).toContain(host);
    }

    await expect(outsideFocusOutEvents).toHaveLength(2);
    await expect(new Set(outsideFocusOutEvents.map(({ event }) => event))).toHaveLength(2);
    await expect(evidence.componentBlurs).toEqual(
      outsideFocusOutEvents.map(({ event }) => ({
        currentTarget: button,
        nativeEvent: event,
        relatedTarget: outsideFocusTarget,
        target: button,
      })),
    );
    await expect(evidence.ancestorBlurs).toEqual(
      outsideFocusOutEvents.map(({ event }) => ({
        currentTarget: observer,
        nativeEvent: event,
        relatedTarget: outsideFocusTarget,
        target: button,
      })),
    );
    for (const outsideFocusOutEvent of outsideFocusOutEvents) {
      await expect(outsideFocusOutEvent.relatedTarget).toBe(outsideFocusTarget);
      await expect(outsideFocusOutEvent.target).toBe(host);
      await expect(outsideFocusOutEvent.path[0]).toBe(button);
      await expect(outsideFocusOutEvent.path).toContain(host);
    }

    const keyDownEvent = new button.ownerDocument.defaultView!.KeyboardEvent('keydown', {
      bubbles: true,
      composed: true,
      key: 'Enter',
    });
    button.dispatchEvent(keyDownEvent);
    button.dispatchEvent(keyDownEvent);

    await expect(outsideKeyDowns).toHaveLength(2);
    await expect(new Set(outsideKeyDowns.map(({ event }) => event))).toHaveLength(1);
    await expect(evidence.ancestorKeyDowns).toEqual([
      { currentTarget: observer, nativeEvent: keyDownEvent, target: button },
      { currentTarget: observer, nativeEvent: keyDownEvent, target: button },
    ]);
    await expect(evidence.componentKeyDowns).toEqual([
      { currentTarget: button, nativeEvent: keyDownEvent, target: button },
      { currentTarget: button, nativeEvent: keyDownEvent, target: button },
    ]);
    await expect(outsideKeyDowns[1]?.target).toBe(host);
    await expect(outsideKeyDowns[1]?.path[0]).toBe(button);
    await expect(outsideKeyDowns[1]?.path).toContain(host);

    const hostKeyDownEvent = new button.ownerDocument.defaultView!.KeyboardEvent('keydown', {
      bubbles: true,
      composed: true,
      key: 'Escape',
    });
    host.dispatchEvent(hostKeyDownEvent);
    host.dispatchEvent(hostKeyDownEvent);

    await expect(evidence.ancestorKeyDowns?.slice(2)).toEqual([
      { currentTarget: observer, nativeEvent: hostKeyDownEvent, target: host },
      { currentTarget: observer, nativeEvent: hostKeyDownEvent, target: host },
    ]);
    await expect(evidence.componentKeyDowns).toHaveLength(2);
    await expect(outsideKeyDowns).toHaveLength(4);
    await expect(outsideKeyDowns[3]?.target).toBe(host);
    await expect(outsideKeyDowns[3]?.path[0]).toBe(host);

    await userEvent.click(clickTarget);
    await userEvent.click(clickTarget);

    await expect(outsideClicks).toHaveLength(2);
    await expect(new Set(outsideClicks.map(({ event }) => event))).toHaveLength(2);
    await expect(evidence.ancestorClicks).toEqual(
      outsideClicks.map(({ event }) => ({
        currentTarget: observer,
        nativeEvent: event,
        target: clickTarget,
      })),
    );
    await expect(evidence.componentClicks).toEqual(
      outsideClicks.map(({ event }) => ({
        currentTarget: button,
        nativeEvent: event,
        target: clickTarget,
      })),
    );
    await expect(outsideClicks[1]?.target).toBe(host);
    await expect(outsideClicks[1]?.path[0]).toBe(clickTarget);
    await expect(outsideClicks[1]?.path).toContain(button);
    await expect(outsideClicks[1]?.path).toContain(host);
  },
};

function ValidatedBubblingEventsHarness(): React.ReactNode {
  const evidenceRef = useRef<ValidatedBubblingEventsEvidenceOutput | null>(null);

  const recordAncestorEvent = useCallback((name: ValidatedBubblingEventName): void => {
    const evidence = evidenceRef.current;
    if (!evidence) return;

    const counts = (evidence.ancestorCounts ??= {});
    counts[name] = (counts[name] ?? 0) + 1;
  }, []);

  return (
    <CompatibilityScenario
      classification="Supported for bubbling handlers; capture has a documented limitation"
      expectedResult="Each keyup, pointerdown, pointerup, mousedown, mouseup, double-click, and context-menu dispatch reaches the light-DOM React ancestor once. Pointerdown represents preserved native propagation and retargeting. Click capture is documented separately."
      summary="This example dispatches fresh owner-realm events directly so event families and phases are measured independently."
      title="Additional composed event delivery"
    >
      <div
        data-testid="additional-events-observer"
        onClickCapture={() => {
          if (evidenceRef.current) {
            evidenceRef.current.ancestorClickCaptureCount =
              (evidenceRef.current.ancestorClickCaptureCount ?? 0) + 1;
          }
        }}
        onContextMenu={() => recordAncestorEvent('contextmenu')}
        onDoubleClick={() => recordAncestorEvent('dblclick')}
        onKeyUp={() => recordAncestorEvent('keyup')}
        onMouseDown={() => recordAncestorEvent('mousedown')}
        onMouseUp={() => recordAncestorEvent('mouseup')}
        onPointerDown={() => recordAncestorEvent('pointerdown')}
        onPointerUp={() => recordAncestorEvent('pointerup')}
      >
        <YouVersionAuthButton
          data-testid="additional-events-auth-button"
          mode="signOut"
          onPointerDown={(event) => {
            if (evidenceRef.current) {
              (evidenceRef.current.componentPointerDowns ??= []).push({
                currentTarget: event.currentTarget,
                nativeEvent: event.nativeEvent,
                target: event.target,
              });
            }
          }}
          onPointerUp={(event) => {
            if (evidenceRef.current) {
              (evidenceRef.current.componentPointerUps ??= []).push({
                currentTarget: event.currentTarget,
                nativeEvent: event.nativeEvent,
                target: event.target,
              });
            }
          }}
        />
        <output hidden ref={evidenceRef} data-testid="additional-events-evidence" />
      </div>
    </CompatibilityScenario>
  );
}

export const KeyUpPointerAndMouseEventsReachReactAncestorsOnce: Story = {
  name: 'Keyup, pointer, and mouse events reach React ancestors once',
  tags: ['cross-browser'],
  render: () => <ValidatedBubblingEventsHarness />,
  play: async ({ canvasElement }) => {
    const observer = await waitFor(async () =>
      requireElement<HTMLElement>(
        canvasElement,
        '[data-testid="additional-events-observer"]',
        'additional events observer not rendered',
      ),
    );
    const host = await requireShadowHost(observer);
    const button = await waitForElement<HTMLButtonElement>(
      host.shadowRoot!,
      '[data-testid="additional-events-auth-button"]',
      'additional events auth button not rendered',
    );
    const evidence = requireElement<ValidatedBubblingEventsEvidenceOutput>(
      canvasElement,
      '[data-testid="additional-events-evidence"]',
      'additional events evidence not rendered',
    );
    const nativePointerDowns: Array<{
      event: Event;
      path: EventTarget[];
      target: EventTarget | null;
    }> = [];
    const controller = new canvasElement.ownerDocument.defaultView!.AbortController();
    observer.addEventListener(
      'pointerdown',
      (event) => {
        nativePointerDowns.push({
          event,
          path: event.composedPath(),
          target: event.target,
        });
      },
      { signal: controller.signal },
    );

    const ownerWindow = button.ownerDocument.defaultView!;
    const events = {
      keyup: new ownerWindow.KeyboardEvent('keyup', {
        bubbles: true,
        composed: true,
        key: 'Enter',
      }),
      pointerdown: new ownerWindow.PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
      }),
      pointerup: new ownerWindow.PointerEvent('pointerup', {
        bubbles: true,
        composed: true,
      }),
      mousedown: new ownerWindow.MouseEvent('mousedown', { bubbles: true, composed: true }),
      mouseup: new ownerWindow.MouseEvent('mouseup', { bubbles: true, composed: true }),
      dblclick: new ownerWindow.MouseEvent('dblclick', { bubbles: true, composed: true }),
      contextmenu: new ownerWindow.MouseEvent('contextmenu', { bubbles: true, composed: true }),
    } satisfies Record<ValidatedBubblingEventName, Event>;
    try {
      for (const eventName of validatedBubblingEventNames) {
        button.dispatchEvent(events[eventName]);
      }

      await expect(evidence.ancestorCounts).toEqual({
        keyup: 1,
        pointerdown: 1,
        pointerup: 1,
        mousedown: 1,
        mouseup: 1,
        dblclick: 1,
        contextmenu: 1,
      });
      await expect(evidence.componentPointerDowns).toEqual([
        { currentTarget: button, nativeEvent: events.pointerdown, target: button },
      ]);
      await expect(evidence.componentPointerUps).toEqual([
        { currentTarget: button, nativeEvent: events.pointerup, target: button },
      ]);
      await expect(nativePointerDowns).toHaveLength(1);
      await expect(nativePointerDowns[0]?.event).toBe(events.pointerdown);
      await expect(nativePointerDowns[0]?.target).toBe(host);
      await expect(nativePointerDowns[0]?.path[0]).toBe(button);
      await expect(nativePointerDowns[0]?.path).toContain(host);

      const captureEvent = new ownerWindow.MouseEvent('click', {
        bubbles: true,
        composed: true,
      });
      button.dispatchEvent(captureEvent);
      await expect(evidence.ancestorClickCaptureCount).toBe(2);

      const hostPointerDown = new ownerWindow.PointerEvent('pointerdown', {
        bubbles: true,
        composed: true,
      });
      host.dispatchEvent(hostPointerDown);
      await expect(evidence.ancestorCounts?.pointerdown).toBe(2);
      await expect(evidence.componentPointerDowns).toHaveLength(1);
      await expect(nativePointerDowns).toHaveLength(2);
      await expect(nativePointerDowns[1]?.event).toBe(hostPointerDown);
      await expect(nativePointerDowns[1]?.target).toBe(host);
      await expect(nativePointerDowns[1]?.path[0]).toBe(host);
    } finally {
      controller.abort();
    }
  },
};

function NestedRootsHarness(): React.ReactNode {
  const evidenceRef = useRef<NestedRootsEvidenceOutput | null>(null);

  return (
    <CompatibilityScenario
      classification="Supported for the validated basics"
      expectedResult="The button renders, and its composed click, pointerdown, and focus-leave dispatch cross both roots once. DOM selector APIs must traverse the outer root and then the inner root. Overlay behavior is not part of this evidence."
      summary="This example places an automatically isolated button inside a second SDK shadow root."
      title="Nested shadow roots"
    >
      <div
        data-testid="nested-light-dom-observer"
        onBlur={(event) => {
          if (evidenceRef.current) {
            (evidenceRef.current.lightDomAncestorBlurs ??= []).push({
              currentTarget: event.currentTarget,
              nativeEvent: event.nativeEvent,
              target: event.target,
            });
          }
        }}
        onClick={() => {
          if (evidenceRef.current) {
            evidenceRef.current.lightDomAncestorClickCount =
              (evidenceRef.current.lightDomAncestorClickCount ?? 0) + 1;
          }
        }}
        onPointerDown={() => {
          if (evidenceRef.current) {
            evidenceRef.current.lightDomAncestorPointerDownCount =
              (evidenceRef.current.lightDomAncestorPointerDownCount ?? 0) + 1;
          }
        }}
      >
        <ShadowRootHost>
          <div
            data-testid="outer-shadow-observer"
            onBlur={(event) => {
              if (evidenceRef.current) {
                (evidenceRef.current.outerShadowAncestorBlurs ??= []).push({
                  currentTarget: event.currentTarget,
                  nativeEvent: event.nativeEvent,
                  target: event.target,
                });
              }
            }}
            onClick={() => {
              if (evidenceRef.current) {
                evidenceRef.current.outerShadowAncestorClickCount =
                  (evidenceRef.current.outerShadowAncestorClickCount ?? 0) + 1;
              }
            }}
            onPointerDown={() => {
              if (evidenceRef.current) {
                evidenceRef.current.outerShadowAncestorPointerDownCount =
                  (evidenceRef.current.outerShadowAncestorPointerDownCount ?? 0) + 1;
              }
            }}
          >
            <YouVersionAuthButton
              data-testid="nested-auth-button"
              mode="signOut"
              onBlur={(event) => {
                if (evidenceRef.current) {
                  (evidenceRef.current.componentBlurs ??= []).push({
                    currentTarget: event.currentTarget,
                    nativeEvent: event.nativeEvent,
                    target: event.target,
                  });
                }
              }}
            />
          </div>
        </ShadowRootHost>
      </div>
      <button type="button" data-testid="nested-outside-focus-target">
        Outside focus target
      </button>
      <output hidden ref={evidenceRef} data-testid="nested-roots-evidence" />
    </CompatibilityScenario>
  );
}

export const NestedRootsRequireTraversalAndRetargetAtEveryBoundary: Story = {
  name: 'Nested roots require traversal and retargeting at every boundary',
  render: () => <NestedRootsHarness />,
  play: async ({ canvasElement }) => {
    const outerHost = await requireShadowHost(canvasElement);
    const lightDomObserver = requireElement<HTMLElement>(
      canvasElement,
      '[data-testid="nested-light-dom-observer"]',
      'nested light DOM observer not rendered',
    );
    const evidence = requireElement<NestedRootsEvidenceOutput>(
      canvasElement,
      '[data-testid="nested-roots-evidence"]',
      'nested roots evidence not rendered',
    );
    const outerRoot = outerHost.shadowRoot!;
    const outerObserver = await waitForElement<HTMLElement>(
      outerRoot,
      '[data-testid="outer-shadow-observer"]',
      'outer shadow observer not rendered',
    );
    const innerHost = await requireShadowHost(outerObserver);
    const innerRoot = innerHost.shadowRoot!;
    const button = await waitForElement<HTMLButtonElement>(
      innerRoot,
      '[data-testid="nested-auth-button"]',
      'nested auth button not rendered',
    );
    const outsideFocusTarget = requireElement<HTMLButtonElement>(
      canvasElement,
      '[data-testid="nested-outside-focus-target"]',
      'nested outside focus target not rendered',
    );

    await expect(canvasElement.querySelector('[data-testid="nested-auth-button"]')).toBeNull();
    await expect(outerRoot.querySelector('[data-testid="nested-auth-button"]')).toBeNull();
    await expect(innerRoot.querySelector('[data-testid="nested-auth-button"]')).toBe(button);

    let outerScopeTarget: EventTarget | null = null;
    let documentScopeTarget: EventTarget | null = null;
    let composedPath: EventTarget[] = [];
    outerObserver.addEventListener(
      'click',
      (event) => {
        outerScopeTarget = event.target;
        composedPath = event.composedPath();
      },
      { once: true },
    );
    canvasElement.addEventListener(
      'click',
      (event) => {
        documentScopeTarget = event.target;
      },
      { once: true },
    );

    await userEvent.click(button);

    await expect(evidence.lightDomAncestorClickCount).toBe(1);
    await expect(evidence.outerShadowAncestorClickCount).toBe(1);
    await expect(outerScopeTarget).toBe(innerHost);
    await expect(documentScopeTarget).toBe(outerHost);
    await expect(composedPath[0]).toBe(button);
    await expect(composedPath).toContain(innerHost);
    await expect(composedPath).toContain(outerHost);

    // userEvent.click includes a pointerdown; isolate the direct event below.
    evidence.lightDomAncestorPointerDownCount = 0;
    evidence.outerShadowAncestorPointerDownCount = 0;

    let outerScopePointerDownTarget: EventTarget | null = null;
    let documentScopePointerDownTarget: EventTarget | null = null;
    let pointerDownPath: EventTarget[] = [];
    outerObserver.addEventListener(
      'pointerdown',
      (event) => {
        outerScopePointerDownTarget = event.target;
        pointerDownPath = event.composedPath();
      },
      { once: true },
    );
    canvasElement.addEventListener(
      'pointerdown',
      (event) => {
        documentScopePointerDownTarget = event.target;
      },
      { once: true },
    );
    const pointerDownEvent = new button.ownerDocument.defaultView!.PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
    });
    button.dispatchEvent(pointerDownEvent);

    await expect(evidence.lightDomAncestorPointerDownCount).toBe(1);
    await expect(evidence.outerShadowAncestorPointerDownCount).toBe(1);
    await expect(outerScopePointerDownTarget).toBe(innerHost);
    await expect(documentScopePointerDownTarget).toBe(outerHost);
    await expect(pointerDownPath[0]).toBe(button);
    await expect(pointerDownPath).toContain(innerHost);
    await expect(pointerDownPath).toContain(outerHost);

    const outerScopeFocusOuts: Array<{
      event: Event;
      path: EventTarget[];
      target: EventTarget | null;
    }> = [];
    const focusOutController = new canvasElement.ownerDocument.defaultView!.AbortController();
    outerObserver.addEventListener(
      'focusout',
      (event) => {
        outerScopeFocusOuts.push({
          event,
          path: event.composedPath(),
          target: event.target,
        });
      },
      { signal: focusOutController.signal },
    );
    const documentScopeFocusOuts: Array<{
      event: Event;
      path: EventTarget[];
      target: EventTarget | null;
    }> = [];
    canvasElement.addEventListener(
      'focusout',
      (event) => {
        documentScopeFocusOuts.push({
          event,
          path: event.composedPath(),
          target: event.target,
        });
      },
      { signal: focusOutController.signal },
    );

    await expect(innerRoot.activeElement).toBe(button);
    try {
      outsideFocusTarget.focus();
    } finally {
      focusOutController.abort();
    }

    await expect(outerScopeFocusOuts).toHaveLength(1);
    await expect(documentScopeFocusOuts).toHaveLength(1);
    await expect(documentScopeFocusOuts[0]?.event).toBe(outerScopeFocusOuts[0]?.event);
    await expect(evidence.componentBlurs).toEqual([
      {
        currentTarget: button,
        nativeEvent: outerScopeFocusOuts[0]?.event,
        target: button,
      },
    ]);
    await expect(evidence.outerShadowAncestorBlurs).toEqual([
      {
        currentTarget: outerObserver,
        nativeEvent: outerScopeFocusOuts[0]?.event,
        target: button,
      },
    ]);
    await expect(evidence.lightDomAncestorBlurs).toEqual([
      {
        currentTarget: lightDomObserver,
        nativeEvent: outerScopeFocusOuts[0]?.event,
        target: button,
      },
    ]);
    await expect(outerScopeFocusOuts[0]?.target).toBe(innerHost);
    await expect(outerScopeFocusOuts[0]?.path[0]).toBe(button);
    await expect(outerScopeFocusOuts[0]?.path).toContain(innerHost);
    await expect(outerScopeFocusOuts[0]?.path).toContain(outerHost);
    await expect(documentScopeFocusOuts[0]?.target).toBe(outerHost);
    await expect(documentScopeFocusOuts[0]?.path[0]).toBe(button);
    await expect(documentScopeFocusOuts[0]?.path).toContain(innerHost);
    await expect(documentScopeFocusOuts[0]?.path).toContain(outerHost);
  },
};
