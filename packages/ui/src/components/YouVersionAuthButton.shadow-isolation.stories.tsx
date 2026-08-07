import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { createRoot } from 'react-dom/client';
import { expect, waitFor } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { YouVersionAuthButton } from './YouVersionAuthButton';

/**
 * Focused architectural POC coverage. These stories answer two questions:
 * whether a literal global `button {}` rule can change an automatically
 * isolated SDK button, and whether the document-bound constructed stylesheet
 * works when a shadow host mounts in a same-origin iframe. Package-wide hostile
 * vectors and component-specific behavior are deliberately deferred.
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

function buttonStyleSnapshot(button: HTMLButtonElement) {
  const styles = getComputedStyle(button);
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
  tags: ['integration'],
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <button type="button" data-testid="host-control" data-host-pseudo-control>
        Host control
      </button>
      <YouVersionAuthButton data-testid="sdk-button" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const control = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLButtonElement>(
        '[data-testid="host-control"]',
      );
      if (!element) throw new Error('host control not rendered');
      return element;
    });
    const host = await waitFor(() => {
      const element = canvasElement.querySelector<HTMLElement>('[data-yv-shadow-host]');
      if (!element?.shadowRoot) throw new Error('shadow root not attached');
      return element;
    });
    const sdkButton = await waitFor(() => {
      const element = host.shadowRoot?.querySelector<HTMLButtonElement>(
        '[data-testid="sdk-button"]',
      );
      if (!element) throw new Error('SDK button not rendered');
      return element;
    });

    const sdkBaseline = buttonStyleSnapshot(sdkButton);
    // Guard against a false positive where an unstyled browser-default button
    // also happens not to equal the hostile values below.
    void expect(sdkBaseline.display).toBe('flex');
    void expect(sdkBaseline.fontFamily).toContain('Inter');

    const style = document.createElement('style');
    style.textContent = HOSTILE_CSS;

    try {
      document.head.append(style);

      await waitFor(() => {
        void expect(getComputedStyle(control).backgroundColor).toBe('rgb(185, 28, 28)');
        void expect(getComputedStyle(control, '::before').content).toBe('"HOSTILE"');
      });

      void expect(getComputedStyle(host, '::before').content).toBe('none');
      void expect(getComputedStyle(host, '::before').display).toBe('none');
      void expect(getComputedStyle(host, '::after').content).toBe('none');
      void expect(getComputedStyle(host, '::after').display).toBe('none');

      // The complete relevant style snapshot—not merely a few negative values—
      // must remain identical to the pre-attack SDK baseline.
      void expect(buttonStyleSnapshot(sdkButton)).toEqual(sdkBaseline);
    } finally {
      style.remove();
    }
  },
};

export const SameOriginIframeDocument: Story = {
  tags: ['integration'],
  parameters: { includeAuth: false },
  render: () => <iframe data-testid="iframe" title="same-origin isolation target" />,
  play: async ({ canvasElement }) => {
    const iframe = canvasElement.querySelector<HTMLIFrameElement>('[data-testid="iframe"]');
    if (!iframe?.contentDocument) throw new Error('same-origin iframe document not available');

    const container = iframe.contentDocument.createElement('div');
    iframe.contentDocument.body.append(container);
    const root = createRoot(container);

    try {
      root.render(
        <ShadowRootHost>
          <span data-testid="iframe-content">Isolated</span>
        </ShadowRootHost>,
      );

      await waitFor(() => {
        const host = iframe.contentDocument?.querySelector<HTMLDivElement>('[data-yv-shadow-host]');
        const shadowRoot = host?.shadowRoot;
        const content = shadowRoot?.querySelector('[data-testid="iframe-content"]');
        if (!content) throw new Error('iframe shadow content not mounted');
        void expect(host?.ownerDocument).toBe(iframe.contentDocument);
        void expect(shadowRoot?.adoptedStyleSheets).toHaveLength(1);
      });
    } finally {
      root.unmount();
      container.remove();
    }
  },
};
