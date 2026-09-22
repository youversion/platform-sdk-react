import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { createRoot, type Root } from 'react-dom/client';
import { expect, waitFor } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { waitForElement } from '../test/storybook-dom';
import { YouVersionAuthButton } from './YouVersionAuthButton';

/**
 * Focused architectural POC coverage. These stories answer two questions:
 * whether a literal global `button {}` rule can change an automatically
 * isolated SDK button, and whether both stylesheet paths work when a shadow
 * host mounts in a same-origin iframe. Package-wide hostile vectors and
 * component-specific behavior are deliberately deferred.
 */
const HOSTILE_CSS = `
  button {
    appearance: none !important;
    background: rgb(185, 28, 28) !important;
    border: 10px dashed lime !important;
    color: yellow !important;
    font: 32px/1 fantasy !important;
    padding: 40px !important;
    text-transform: uppercase !important;
  }

  [data-yv-shadow-host]::before,
  [data-yv-shadow-host]::after,
  [data-host-pseudo-control]::before {
    content: "HOSTILE" !important;
    display: block !important;
    background: red !important;
  }
`;

const meta = {
  title: 'Spikes/Automatic Shadow DOM isolation',
  component: YouVersionAuthButton,
  tags: ['integration', 'shadow-dom'],
  parameters: {
    msw: {
      handlers: [
        http.get('*/v1/fonts/1/stylesheet', () =>
          HttpResponse.text('', { headers: { 'Content-Type': 'text/css' } }),
        ),
      ],
    },
  },
} satisfies Meta<typeof YouVersionAuthButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const browserWaitOptions = { timeout: 5_000 } as const;

function buttonStyleSnapshot(button: HTMLButtonElement) {
  const ownerWindow = button.ownerDocument.defaultView;
  if (!ownerWindow) throw new Error('button owner window not available');
  const styles = ownerWindow.getComputedStyle(button);
  return {
    appearance: styles.appearance,
    backgroundColor: styles.backgroundColor,
    borderTopColor: styles.borderTopColor,
    borderTopStyle: styles.borderTopStyle,
    borderTopWidth: styles.borderTopWidth,
    color: styles.color,
    display: styles.display,
    fontFamily: styles.fontFamily,
    fontSize: styles.fontSize,
    lineHeight: styles.lineHeight,
    padding: styles.padding,
    textTransform: styles.textTransform,
  };
}

export const HostileGlobalButtonRule: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <button type="button" data-testid="host-control" data-host-pseudo-control>
        Host control
      </button>
      <YouVersionAuthButton data-testid="sdk-button" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const ownerDocument = canvasElement.ownerDocument;
    const ownerWindow = ownerDocument.defaultView;
    if (!ownerWindow) throw new Error('story owner window not available');

    const control = await waitForElement<HTMLButtonElement>(
      canvasElement,
      '[data-testid="host-control"]',
      'host control not rendered',
      browserWaitOptions,
    );
    const host = await waitForElement<HTMLElement>(
      canvasElement,
      '[data-yv-shadow-host]',
      'shadow host not rendered',
      browserWaitOptions,
    );
    const shadowRoot = await waitFor(() => {
      if (!host.shadowRoot) throw new Error('shadow root not attached');
      return host.shadowRoot;
    }, browserWaitOptions);
    const sdkButton = await waitForElement<HTMLButtonElement>(
      shadowRoot,
      '[data-testid="sdk-button"]',
      'SDK button not rendered',
      browserWaitOptions,
    );

    const sdkBaseline = buttonStyleSnapshot(sdkButton);
    // Guard against a false positive where an unstyled browser-default button
    // also happens not to equal the hostile values below.
    void expect(sdkBaseline.display).toBe('flex');
    void expect(sdkBaseline.fontFamily).toContain('Inter');

    const style = ownerDocument.createElement('style');
    style.textContent = HOSTILE_CSS;

    try {
      ownerDocument.head.append(style);

      await waitFor(() => {
        void expect(ownerWindow.getComputedStyle(control).backgroundColor).toBe('rgb(185, 28, 28)');
        void expect(ownerWindow.getComputedStyle(control, '::before').content).toBe('"HOSTILE"');
      });

      void expect(ownerWindow.getComputedStyle(host, '::before').content).toBe('none');
      void expect(ownerWindow.getComputedStyle(host, '::before').display).toBe('none');
      void expect(ownerWindow.getComputedStyle(host, '::after').content).toBe('none');
      void expect(ownerWindow.getComputedStyle(host, '::after').display).toBe('none');

      // The complete relevant style snapshot—not merely a few negative values—
      // must remain identical to the pre-attack SDK baseline.
      void expect(buttonStyleSnapshot(sdkButton)).toEqual(sdkBaseline);
    } finally {
      style.remove();
    }
  },
};

export const SameOriginIframeDocument: Story = {
  parameters: { includeAuth: false },
  render: () => <iframe data-testid="iframe" title="same-origin isolation target" />,
  play: async ({ canvasElement }) => {
    const iframe = await waitForElement<HTMLIFrameElement>(
      canvasElement,
      '[data-testid="iframe"]',
      'same-origin iframe not rendered',
      browserWaitOptions,
    );
    const { iframeDocument, iframeWindow } = await waitFor(() => {
      const currentDocument = iframe.contentDocument;
      const currentWindow = currentDocument?.defaultView;
      if (!currentDocument?.body || !currentWindow) {
        throw new Error('same-origin iframe document not available');
      }
      return { iframeDocument: currentDocument, iframeWindow: currentWindow };
    }, browserWaitOptions);

    const container = iframeDocument.createElement('div');
    iframeDocument.body.append(container);
    const root = createRoot(container);
    let fallbackContainer: HTMLDivElement | undefined;
    let fallbackRoot: Root | undefined;

    try {
      root.render(
        <ShadowRootHost>
          <span className="yv:flex" data-testid="iframe-content">
            Isolated
          </span>
        </ShadowRootHost>,
      );

      await waitFor(() => {
        const host = container.querySelector<HTMLDivElement>('[data-yv-shadow-host]');
        const shadowRoot = host?.shadowRoot;
        const content = shadowRoot?.querySelector('[data-testid="iframe-content"]');
        if (!content) throw new Error('iframe shadow content not mounted');
        void expect(host?.ownerDocument).toBe(iframeDocument);
        void expect(shadowRoot?.adoptedStyleSheets).toHaveLength(1);
        void expect(shadowRoot?.adoptedStyleSheets[0]).toBeInstanceOf(iframeWindow.CSSStyleSheet);
        void expect(iframeWindow.getComputedStyle(content).display).toBe('flex');
      }, browserWaitOptions);

      const styleSheetPrototype = iframeWindow.CSSStyleSheet.prototype;
      const replaceSyncDescriptor = Object.getOwnPropertyDescriptor(
        styleSheetPrototype,
        'replaceSync',
      );
      if (!replaceSyncDescriptor?.configurable) {
        throw new Error('iframe CSSStyleSheet.replaceSync cannot be disabled for fallback proof');
      }

      Reflect.deleteProperty(styleSheetPrototype, 'replaceSync');
      try {
        fallbackContainer = iframeDocument.createElement('div');
        iframeDocument.body.append(fallbackContainer);
        fallbackRoot = createRoot(fallbackContainer);
        fallbackRoot.render(
          <ShadowRootHost>
            <span className="yv:flex" data-testid="iframe-fallback-content">
              Fallback isolated
            </span>
          </ShadowRootHost>,
        );

        await waitFor(() => {
          const fallbackHost =
            fallbackContainer?.querySelector<HTMLDivElement>('[data-yv-shadow-host]');
          const shadowRoot = fallbackHost?.shadowRoot;
          const content = shadowRoot?.querySelector('[data-testid="iframe-fallback-content"]');
          const style = shadowRoot?.querySelector('style');
          if (!content || !style) throw new Error('iframe fallback content not mounted');
          void expect(shadowRoot?.adoptedStyleSheets).toHaveLength(0);
          void expect(style.getAttribute('data-href')).toBe('yv-sdk-shadow-styles');
          void expect(style.getAttribute('data-precedence')).toBe('yv-sdk');
          void expect(iframeWindow.getComputedStyle(content).display).toBe('flex');
        }, browserWaitOptions);
      } finally {
        fallbackRoot?.unmount();
        fallbackContainer?.remove();
        Object.defineProperty(styleSheetPrototype, 'replaceSync', replaceSyncDescriptor);
      }
    } finally {
      root.unmount();
      container.remove();
    }
  },
};
