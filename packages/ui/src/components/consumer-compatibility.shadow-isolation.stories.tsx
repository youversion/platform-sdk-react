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
  title: 'Spikes/Shadow DOM consumer compatibility',
  tags: ['integration', 'shadow-dom'],
  parameters: {
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

interface NodeEvidenceOutput extends HTMLOutputElement {
  count?: number;
  key?: string;
  observedNode?: EventTarget | null;
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
  const forwardedRefEvidence = useRef<NodeEvidenceOutput | null>(null);
  const ancestorClickEvidence = useRef<NodeEvidenceOutput | null>(null);
  const ancestorFocusEvidence = useRef<NodeEvidenceOutput | null>(null);
  const ancestorKeyDownEvidence = useRef<NodeEvidenceOutput | null>(null);
  const consumerFocusEvidence = useRef<NodeEvidenceOutput | null>(null);
  const consumerKeyDownEvidence = useRef<NodeEvidenceOutput | null>(null);
  const consumerTargetEvidence = useRef<NodeEvidenceOutput | null>(null);
  const consumerCurrentTargetEvidence = useRef<NodeEvidenceOutput | null>(null);
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
    if (forwardedRefEvidence.current) forwardedRefEvidence.current.observedNode = node;
  }, []);

  return (
    <CompatibilityScenario
      classification="Supported with documented constraints"
      expectedResult="The React click handler and forwarded ref expose the internal button. Native listeners outside the root see the shadow host as the event target. DOM selector APIs need explicit root traversal."
      summary="This example compares the views exposed to React consumers, native event listeners, refs, and DOM selector APIs."
      title="Events, refs, and test queries"
    >
      <>
        <div
          data-testid="consumer-observer"
          onClick={() => {
            if (ancestorClickEvidence.current) {
              ancestorClickEvidence.current.count = (ancestorClickEvidence.current.count ?? 0) + 1;
            }
          }}
          onFocus={() => {
            if (ancestorFocusEvidence.current) {
              ancestorFocusEvidence.current.count = (ancestorFocusEvidence.current.count ?? 0) + 1;
            }
          }}
          onKeyDown={() => {
            if (ancestorKeyDownEvidence.current) {
              ancestorKeyDownEvidence.current.count =
                (ancestorKeyDownEvidence.current.count ?? 0) + 1;
            }
          }}
        >
          <YouVersionAuthButton
            ref={receiveButtonRef}
            data-testid="isolated-auth-button"
            mode="signOut"
            onClick={(event) => {
              if (consumerTargetEvidence.current) {
                consumerTargetEvidence.current.observedNode = event.target;
              }
              if (consumerCurrentTargetEvidence.current) {
                consumerCurrentTargetEvidence.current.count =
                  (consumerCurrentTargetEvidence.current.count ?? 0) + 1;
                consumerCurrentTargetEvidence.current.observedNode = event.currentTarget;
              }
            }}
            onFocus={(event) => {
              if (consumerFocusEvidence.current) {
                consumerFocusEvidence.current.count =
                  (consumerFocusEvidence.current.count ?? 0) + 1;
                consumerFocusEvidence.current.observedNode = event.currentTarget;
              }
            }}
            onKeyDown={(event) => {
              if (consumerKeyDownEvidence.current) {
                consumerKeyDownEvidence.current.count =
                  (consumerKeyDownEvidence.current.count ?? 0) + 1;
                consumerKeyDownEvidence.current.key = event.key;
                consumerKeyDownEvidence.current.observedNode = event.currentTarget;
              }
            }}
          />
          <output hidden data-testid="first-layout-ref-state">
            {firstLayoutResult}
          </output>
          <output hidden ref={forwardedRefEvidence} data-testid="forwarded-ref-evidence" />
          <output hidden ref={ancestorClickEvidence} data-testid="ancestor-click-evidence" />
          <output hidden ref={ancestorFocusEvidence} data-testid="ancestor-focus-evidence" />
          <output hidden ref={ancestorKeyDownEvidence} data-testid="ancestor-keydown-evidence" />
          <output hidden ref={consumerFocusEvidence} data-testid="consumer-focus-evidence" />
          <output hidden ref={consumerKeyDownEvidence} data-testid="consumer-keydown-evidence" />
          <output hidden ref={consumerTargetEvidence} data-testid="consumer-target-evidence" />
          <output
            hidden
            ref={consumerCurrentTargetEvidence}
            data-testid="consumer-current-target-evidence"
          />
        </div>
        <button type="button" data-testid="outside-focus-target">
          Outside focus target
        </button>
      </>
    </CompatibilityScenario>
  );
}

export const EventsRefsAndDomQueriesExposeDifferentConsumerViews: Story = {
  name: 'Events, refs, and DOM queries expose different views',
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
    const forwardedRefEvidence = requireElement<NodeEvidenceOutput>(
      canvasElement,
      '[data-testid="forwarded-ref-evidence"]',
      'forwarded ref evidence not rendered',
    );
    const ancestorClickEvidence = requireElement<NodeEvidenceOutput>(
      canvasElement,
      '[data-testid="ancestor-click-evidence"]',
      'ancestor click evidence not rendered',
    );
    const ancestorFocusEvidence = requireElement<NodeEvidenceOutput>(
      canvasElement,
      '[data-testid="ancestor-focus-evidence"]',
      'ancestor focus evidence not rendered',
    );
    const ancestorKeyDownEvidence = requireElement<NodeEvidenceOutput>(
      canvasElement,
      '[data-testid="ancestor-keydown-evidence"]',
      'ancestor keydown evidence not rendered',
    );
    const consumerKeyDownEvidence = requireElement<NodeEvidenceOutput>(
      canvasElement,
      '[data-testid="consumer-keydown-evidence"]',
      'consumer keydown evidence not rendered',
    );
    const consumerFocusEvidence = requireElement<NodeEvidenceOutput>(
      canvasElement,
      '[data-testid="consumer-focus-evidence"]',
      'consumer focus evidence not rendered',
    );
    const outsideFocusTarget = requireElement<HTMLButtonElement>(
      canvasElement,
      '[data-testid="outside-focus-target"]',
      'outside focus target not rendered',
    );
    const consumerTargetEvidence = requireElement<NodeEvidenceOutput>(
      canvasElement,
      '[data-testid="consumer-target-evidence"]',
      'consumer target evidence not rendered',
    );
    const consumerCurrentTargetEvidence = requireElement<NodeEvidenceOutput>(
      canvasElement,
      '[data-testid="consumer-current-target-evidence"]',
      'consumer current target evidence not rendered',
    );

    await expect(firstLayoutEvidence).toHaveTextContent('null');
    await expect(firstLayoutEvidence).toHaveAttribute('hidden');
    await waitFor(async () => await expect(forwardedRefEvidence.observedNode).toBe(button));

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
      path: EventTarget[];
      target: EventTarget | null;
    }> = [];
    observer.addEventListener('keydown', (event) => {
      outsideKeyDowns.push({ path: event.composedPath(), target: event.target });
    });
    const outsideFocusEvents: Array<{
      path: EventTarget[];
      target: EventTarget | null;
    }> = [];
    observer.addEventListener('focusin', (event) => {
      outsideFocusEvents.push({ path: event.composedPath(), target: event.target });
    });

    outsideFocusTarget.focus();
    button.focus();

    await expect(root.activeElement).toBe(button);
    await expect(ancestorFocusEvidence.count).toBe(1);
    await expect(consumerFocusEvidence.count).toBe(1);
    await expect(consumerFocusEvidence.observedNode).toBe(button);
    await expect(outsideFocusEvents).toHaveLength(1);
    await expect(outsideFocusEvents[0]?.target).toBe(host);
    await expect(outsideFocusEvents[0]?.path[0]).toBe(button);
    await expect(outsideFocusEvents[0]?.path).toContain(host);

    button.dispatchEvent(
      new button.ownerDocument.defaultView!.KeyboardEvent('keydown', {
        bubbles: true,
        composed: true,
        key: 'Enter',
      }),
    );

    await expect(ancestorKeyDownEvidence.count).toBe(1);
    await expect(consumerKeyDownEvidence.count).toBe(1);
    await expect(consumerKeyDownEvidence.key).toBe('Enter');
    await expect(consumerKeyDownEvidence.observedNode).toBe(button);
    await expect(outsideKeyDowns).toHaveLength(1);
    await expect(outsideKeyDowns[0]?.target).toBe(host);
    await expect(outsideKeyDowns[0]?.path[0]).toBe(button);
    await expect(outsideKeyDowns[0]?.path).toContain(host);

    await userEvent.click(clickTarget);
    await userEvent.click(clickTarget);

    await expect(ancestorClickEvidence.count).toBe(2);
    await expect(consumerCurrentTargetEvidence.count).toBe(2);
    await expect(outsideClicks).toHaveLength(2);
    await expect(new Set(outsideClicks.map(({ event }) => event))).toHaveLength(2);
    await expect(outsideClicks[1]?.target).toBe(host);
    await expect(outsideClicks[1]?.path[0]).toBe(clickTarget);
    await expect(outsideClicks[1]?.path).toContain(button);
    await expect(outsideClicks[1]?.path).toContain(host);
    await expect(consumerTargetEvidence.observedNode).toBe(clickTarget);
    await expect(consumerCurrentTargetEvidence.observedNode).toBe(button);
  },
};

function NestedRootsHarness(): React.ReactNode {
  const lightDomAncestorEvidence = useRef<NodeEvidenceOutput | null>(null);
  const outerShadowAncestorEvidence = useRef<NodeEvidenceOutput | null>(null);

  return (
    <CompatibilityScenario
      classification="Supported for the validated basics"
      expectedResult="The button renders and its composed click crosses both roots. DOM selector APIs must traverse the outer root and then the inner root. Overlay behavior is not part of this evidence."
      summary="This example places an automatically isolated button inside a second SDK shadow root."
      title="Nested shadow roots"
    >
      <div
        data-testid="light-dom-react-observer"
        onClick={() => {
          if (lightDomAncestorEvidence.current) {
            lightDomAncestorEvidence.current.count =
              (lightDomAncestorEvidence.current.count ?? 0) + 1;
          }
        }}
      >
        <ShadowRootHost>
          <div
            data-testid="outer-shadow-observer"
            onClick={() => {
              if (outerShadowAncestorEvidence.current) {
                outerShadowAncestorEvidence.current.count =
                  (outerShadowAncestorEvidence.current.count ?? 0) + 1;
              }
            }}
          >
            <YouVersionAuthButton data-testid="nested-auth-button" mode="signOut" />
          </div>
        </ShadowRootHost>
      </div>
      <output hidden ref={lightDomAncestorEvidence} data-testid="light-dom-ancestor-evidence" />
      <output
        hidden
        ref={outerShadowAncestorEvidence}
        data-testid="outer-shadow-ancestor-evidence"
      />
    </CompatibilityScenario>
  );
}

export const NestedRootsRequireTraversalAndRetargetAtEveryBoundary: Story = {
  name: 'Nested roots require traversal and retargeting at every boundary',
  render: () => <NestedRootsHarness />,
  play: async ({ canvasElement }) => {
    const outerHost = await requireShadowHost(canvasElement);
    const lightDomAncestorEvidence = requireElement<NodeEvidenceOutput>(
      canvasElement,
      '[data-testid="light-dom-ancestor-evidence"]',
      'light DOM ancestor evidence not rendered',
    );
    const outerShadowAncestorEvidence = requireElement<NodeEvidenceOutput>(
      canvasElement,
      '[data-testid="outer-shadow-ancestor-evidence"]',
      'outer shadow ancestor evidence not rendered',
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

    await expect(lightDomAncestorEvidence.count).toBe(1);
    await expect(outerShadowAncestorEvidence.count).toBe(1);
    await expect(outerScopeTarget).toBe(innerHost);
    await expect(documentScopeTarget).toBe(outerHost);
    await expect(composedPath[0]).toBe(button);
    await expect(composedPath).toContain(innerHost);
    await expect(composedPath).toContain(outerHost);
  },
};
