import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { Textarea } from './ui/textarea';
import { YouVersionAuthButton } from './YouVersionAuthButton';

const meta = {
  title: 'Spikes/Shadow DOM consumer compatibility',
  tags: ['integration'],
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

async function waitForElement<ElementType extends Element>(
  container: ParentNode,
  selector: string,
  message: string,
): Promise<ElementType> {
  return waitFor(() => requireElement<ElementType>(container, selector, message));
}

async function requireShadowHost(container: ParentNode): Promise<HTMLElement> {
  return waitFor(() => {
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
  return (
    <section
      style={{
        border: '1px solid #d1d5db',
        borderRadius: '0.75rem',
        display: 'grid',
        fontFamily: 'system-ui, sans-serif',
        gap: '1.25rem',
        maxInlineSize: '44rem',
        padding: '1.5rem',
      }}
    >
      <header style={{ display: 'grid', gap: '0.5rem' }}>
        <p style={{ color: '#4b5563', fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>
          SHADOW DOM COMPATIBILITY EVIDENCE
        </p>
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{title}</h2>
        <p style={{ color: '#374151', lineHeight: 1.5, margin: 0 }}>{summary}</p>
      </header>
      <aside
        aria-label="Expected result"
        style={{
          background: '#f3f4f6',
          borderInlineStart: '0.25rem solid #4b5563',
          paddingBlock: '0.75rem',
          paddingInline: '1rem',
        }}
      >
        <p style={{ color: '#4b5563', fontSize: '0.75rem', fontWeight: 700, margin: 0 }}>
          EXPECTED RESULT
        </p>
        <p style={{ fontWeight: 700, margin: 0 }}>{classification}</p>
        <p style={{ lineHeight: 1.5, marginBlock: '0.25rem 0', marginInline: 0 }}>
          {expectedResult}
        </p>
      </aside>
      <div style={{ borderBlockStart: '1px solid #e5e7eb', paddingBlockStart: '1.25rem' }}>
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
  name: 'Forms, labels, and descriptions',
  render: () => <FormRelationshipsHarness />,
  play: async ({ canvasElement }) => {
    const form = await waitFor(() =>
      requireElement<HTMLFormElement>(
        canvasElement,
        '[data-testid="consumer-form"]',
        'consumer form not rendered',
      ),
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

    void expect(textarea.form).toBeNull();
    void expect(form.elements.namedItem('notes')).toBeNull();
    void expect(new FormData(form).has('notes')).toBe(false);

    void expect(label.control).toBeNull();
    await userEvent.click(label);
    void expect(root.activeElement).not.toBe(textarea);

    type ReflectedAriaElement = HTMLElement & {
      ariaLabelledByElements?: readonly Element[];
      ariaDescribedByElements?: readonly Element[];
    };
    // SAFETY: The optional extension models Chromium properties, and the guards below verify them.
    const reflectedTextarea = textarea as ReflectedAriaElement;
    if (!reflectedTextarea.ariaLabelledByElements) {
      throw new Error('Chromium did not expose ariaLabelledByElements');
    }
    if (!reflectedTextarea.ariaDescribedByElements) {
      throw new Error('Chromium did not expose ariaDescribedByElements');
    }

    void expect(textarea.getAttribute('aria-labelledby')).toBe('external-name');
    void expect(textarea.getAttribute('aria-describedby')).toBe('external-description');
    void expect(reflectedTextarea.ariaLabelledByElements).toEqual([]);
    void expect(reflectedTextarea.ariaDescribedByElements).toEqual([]);
  },
};

function AutomaticButtonHarness(): React.ReactNode {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const firstLayoutRefState = useRef<'pending' | 'null' | 'resolved'>('pending');
  const forwardedRefEvidence = useRef<NodeEvidenceOutput | null>(null);
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
      <div data-testid="consumer-observer">
        <YouVersionAuthButton
          ref={receiveButtonRef}
          data-testid="isolated-auth-button"
          mode="signOut"
          onClick={(event) => {
            if (consumerTargetEvidence.current) {
              consumerTargetEvidence.current.observedNode = event.target;
            }
            if (consumerCurrentTargetEvidence.current) {
              consumerCurrentTargetEvidence.current.observedNode = event.currentTarget;
            }
          }}
        />
        <output hidden data-testid="first-layout-ref-state">
          {firstLayoutResult}
        </output>
        <output hidden ref={forwardedRefEvidence} data-testid="forwarded-ref-evidence" />
        <output hidden ref={consumerTargetEvidence} data-testid="consumer-target-evidence" />
        <output
          hidden
          ref={consumerCurrentTargetEvidence}
          data-testid="consumer-current-target-evidence"
        />
      </div>
    </CompatibilityScenario>
  );
}

export const EventsRefsAndAutomationExposeDifferentConsumerViews: Story = {
  name: 'Events, refs, and test queries',
  render: () => <AutomaticButtonHarness />,
  play: async ({ canvasElement }) => {
    const observer = await waitFor(() =>
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

    void expect(canvasElement.querySelector('[data-testid="isolated-auth-button"]')).toBeNull();
    void expect(root.querySelector('[data-testid="isolated-auth-button"]')).toBe(button);
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

    void expect(firstLayoutEvidence).toHaveTextContent('null');
    void expect(firstLayoutEvidence).toHaveAttribute('hidden');
    await waitFor(() => void expect(forwardedRefEvidence.observedNode).toBe(button));

    const clickTarget = requireElement<HTMLDivElement>(
      button,
      'div',
      'auth button label click target not rendered',
    );
    let outsideTarget: EventTarget | null = null;
    let outsidePath: EventTarget[] = [];
    observer.addEventListener(
      'click',
      (event) => {
        outsideTarget = event.target;
        outsidePath = event.composedPath();
      },
      { once: true },
    );

    await userEvent.click(clickTarget);

    void expect(outsideTarget).toBe(host);
    void expect(outsidePath[0]).toBe(clickTarget);
    void expect(outsidePath).toContain(button);
    void expect(outsidePath).toContain(host);
    void expect(consumerTargetEvidence.observedNode).toBe(clickTarget);
    void expect(consumerCurrentTargetEvidence.observedNode).toBe(button);
  },
};

function NestedRootsHarness(): React.ReactNode {
  return (
    <CompatibilityScenario
      classification="Supported for the validated basics"
      expectedResult="The button renders and its composed click crosses both roots. DOM selector APIs must traverse the outer root and then the inner root. Overlay behavior is not part of this evidence."
      summary="This example places an automatically isolated button inside a second SDK shadow root."
      title="Nested shadow roots"
    >
      <ShadowRootHost>
        <div data-testid="outer-shadow-observer">
          <YouVersionAuthButton data-testid="nested-auth-button" mode="signOut" />
        </div>
      </ShadowRootHost>
    </CompatibilityScenario>
  );
}

export const NestedRootsRequireTraversalAndRetargetAtEveryBoundary: Story = {
  name: 'Nested shadow roots',
  render: () => <NestedRootsHarness />,
  play: async ({ canvasElement }) => {
    const outerHost = await requireShadowHost(canvasElement);
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

    void expect(canvasElement.querySelector('[data-testid="nested-auth-button"]')).toBeNull();
    void expect(outerRoot.querySelector('[data-testid="nested-auth-button"]')).toBeNull();
    void expect(innerRoot.querySelector('[data-testid="nested-auth-button"]')).toBe(button);

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

    void expect(outerScopeTarget).toBe(innerHost);
    void expect(documentScopeTarget).toBe(outerHost);
    void expect(composedPath[0]).toBe(button);
    void expect(composedPath).toContain(innerHost);
    void expect(composedPath).toContain(outerHost);
  },
};

