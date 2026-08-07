import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';
import { createRoot } from 'react-dom/client';
import { expect, waitFor } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { YouVersionAuthButton } from './YouVersionAuthButton';

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

export const HostileGlobalButtonRule: Story = {
  tags: ['integration'],
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <button type="button" data-testid="host-control">
        Host control
      </button>
      <YouVersionAuthButton data-testid="sdk-button" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const style = document.createElement('style');
    style.textContent = HOSTILE_CSS;
    document.head.append(style);

    try {
      const control = await waitFor(() => {
        const element = canvasElement.querySelector<HTMLElement>('[data-testid="host-control"]');
        if (!element) throw new Error('host control not rendered');
        return element;
      });
      const host = await waitFor(() => {
        const element = canvasElement.querySelector<HTMLElement>('[data-yv-shadow-host]');
        if (!element?.shadowRoot) throw new Error('shadow root not attached');
        return element;
      });
      const sdkButton = await waitFor(() => {
        const element = host.shadowRoot?.querySelector<HTMLElement>('[data-testid="sdk-button"]');
        if (!element) throw new Error('SDK button not rendered');
        return element;
      });
      await waitFor(() => {
        void expect(getComputedStyle(control).backgroundColor).toBe('rgb(185, 28, 28)');
      });
      void expect(getComputedStyle(sdkButton).backgroundColor).not.toBe('rgb(185, 28, 28)');
      void expect(getComputedStyle(sdkButton).borderTopWidth).not.toBe('10px');
      void expect(getComputedStyle(sdkButton).fontSize).not.toBe('32px');
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
        const host = iframe.contentDocument?.querySelector<HTMLElement>('[data-yv-shadow-host]');
        const content = host?.shadowRoot?.querySelector('[data-testid="iframe-content"]');
        if (!content) throw new Error('iframe shadow content not mounted');
        void expect(host?.ownerDocument).toBe(iframe.contentDocument);
      });
    } finally {
      root.unmount();
      container.remove();
    }
  },
};
