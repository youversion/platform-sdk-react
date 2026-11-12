import type { Meta, StoryObj } from '@storybook/react-vite';
import { createRoot, type Root } from 'react-dom/client';
import { expect } from 'storybook/test';
import { ShadowRootHost } from '../lib/shadow-root-host';
import { YvComponentStyles } from '../lib/yv-styles-components';
import { waitFor, waitForElement } from '../test/storybook-dom';
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

const GOOGLE_FONTS_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Source+Serif+4:wght@400;700&display=swap';

const meta = {
  title: 'Spikes/Automatic Shadow DOM isolation',
  component: YouVersionAuthButton,
  tags: ['integration', 'shadow-dom', 'shadow-fresh-process'],
} satisfies Meta<typeof YouVersionAuthButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const browserWaitOptions = { timeout: 5_000 } as const;

async function expectFontLoaded(ownerDocument: Document, family: string): Promise<void> {
  await waitFor(async () => {
    const loadedFaces = await ownerDocument.fonts.load(`400 16px "${family}"`, 'SDK font probe');
    await expect(loadedFaces.length).toBeGreaterThan(0);
  }, browserWaitOptions);
}

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
    const shadowRoot = await waitFor(async () => {
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
    await expect(sdkBaseline.display).toBe('flex');
    await expect(sdkBaseline.fontFamily).toContain('Inter');
    await waitFor(async () => {
      const googleFontsLinks = Array.from(
        ownerDocument.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
      ).filter((link) => link.getAttribute('href') === GOOGLE_FONTS_STYLESHEET);
      await expect(googleFontsLinks).toHaveLength(1);
      await expect(shadowRoot.querySelector(`link[href="${GOOGLE_FONTS_STYLESHEET}"]`)).toBeNull();
    }, browserWaitOptions);
    await expectFontLoaded(ownerDocument, 'Inter');
    await expectFontLoaded(ownerDocument, 'Source Serif 4');
    await expectFontLoaded(ownerDocument, 'Untitled Serif');

    const style = ownerDocument.createElement('style');
    style.textContent = HOSTILE_CSS;

    try {
      ownerDocument.head.append(style);

      await waitFor(async () => {
        await expect(ownerWindow.getComputedStyle(control).backgroundColor).toBe(
          'rgb(185, 28, 28)',
        );
        await expect(ownerWindow.getComputedStyle(control, '::before').content).toBe('"HOSTILE"');
      });

      await expect(ownerWindow.getComputedStyle(host, '::before').content).toBe('none');
      await expect(ownerWindow.getComputedStyle(host, '::before').display).toBe('none');
      await expect(ownerWindow.getComputedStyle(host, '::after').content).toBe('none');
      await expect(ownerWindow.getComputedStyle(host, '::after').display).toBe('none');

      // The complete relevant style snapshot—not merely a few negative values—
      // must remain identical to the pre-attack SDK baseline.
      await expect(buttonStyleSnapshot(sdkButton)).toEqual(sdkBaseline);
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
    const { iframeDocument, iframeWindow } = await waitFor(async () => {
      const currentDocument = iframe.contentDocument;
      const currentWindow = currentDocument?.defaultView;
      if (!currentDocument?.body || !currentWindow) {
        throw new Error('same-origin iframe document not available');
      }
      return { iframeDocument: currentDocument, iframeWindow: currentWindow };
    }, browserWaitOptions);

    const styleSheetPrototype = iframeWindow.CSSStyleSheet.prototype;
    const originalReplaceSyncDescriptor = Object.getOwnPropertyDescriptor(
      styleSheetPrototype,
      'replaceSync',
    );
    if (!originalReplaceSyncDescriptor?.configurable) {
      throw new Error('iframe CSSStyleSheet.replaceSync cannot be observed');
    }
    // SAFETY: this descriptor is the standardized CSSStyleSheet method on the
    // iframe prototype, and configurability was verified before wrapping it.
    const originalReplaceSync = originalReplaceSyncDescriptor.value as CSSStyleSheet['replaceSync'];
    const replacementInputs: string[] = [];
    const container = iframeDocument.createElement('div');
    iframeDocument.body.append(container);
    const root = createRoot(container);
    let fallbackContainer: HTMLDivElement | undefined;
    let fallbackRoot: Root | undefined;

    try {
      Object.defineProperty(styleSheetPrototype, 'replaceSync', {
        ...originalReplaceSyncDescriptor,
        value(this: CSSStyleSheet, cssText: string): void {
          replacementInputs.push(cssText);
          originalReplaceSync.call(this, cssText);
        },
      });
      root.render(
        <ShadowRootHost>
          <YvComponentStyles />
          <span className="yv:flex" data-testid="iframe-content">
            Isolated
          </span>
          <span
            className="yv:font-serif"
            data-testid="iframe-serif-probe"
            style={{ display: 'inline-block' }}
          >
            WWWWiiiiMMMM
          </span>
          <span
            data-testid="iframe-source-serif-reference"
            style={{ display: 'inline-block', fontFamily: "'Source Serif 4'" }}
          >
            WWWWiiiiMMMM
          </span>
          <span
            data-testid="iframe-generic-serif-reference"
            style={{ display: 'inline-block', fontFamily: 'serif' }}
          >
            WWWWiiiiMMMM
          </span>
        </ShadowRootHost>,
      );

      await waitFor(async () => {
        const host = container.querySelector<HTMLDivElement>('[data-yv-shadow-host]');
        const shadowRoot = host?.shadowRoot;
        const content = shadowRoot?.querySelector('[data-testid="iframe-content"]');
        if (!content) throw new Error('iframe shadow content not mounted');
        await expect(host?.ownerDocument).toBe(iframeDocument);
        await expect(shadowRoot?.adoptedStyleSheets).toHaveLength(1);
        await expect(shadowRoot?.adoptedStyleSheets[0]).toBeInstanceOf(iframeWindow.CSSStyleSheet);
        await expect(iframeWindow.getComputedStyle(content).display).toBe('flex');
      }, browserWaitOptions);
      await expect(replacementInputs).toHaveLength(1);
      await expect(replacementInputs[0]).not.toMatch(/@import\b/i);
      await waitFor(async () => {
        const googleFontsLinks = Array.from(
          iframeDocument.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
        ).filter((link) => link.getAttribute('href') === GOOGLE_FONTS_STYLESHEET);
        await expect(googleFontsLinks).toHaveLength(1);
        const host = container.querySelector<HTMLDivElement>('[data-yv-shadow-host]');
        await expect(
          host?.shadowRoot?.querySelector(`link[href="${GOOGLE_FONTS_STYLESHEET}"]`),
        ).toBeNull();
      }, browserWaitOptions);
      await expectFontLoaded(iframeDocument, 'Inter');
      await expectFontLoaded(iframeDocument, 'Source Serif 4');
      await waitFor(async () => {
        const host = container.querySelector<HTMLDivElement>('[data-yv-shadow-host]');
        const serifProbe = host?.shadowRoot?.querySelector<HTMLElement>(
          '[data-testid="iframe-serif-probe"]',
        );
        const sourceReference = host?.shadowRoot?.querySelector<HTMLElement>(
          '[data-testid="iframe-source-serif-reference"]',
        );
        const genericReference = host?.shadowRoot?.querySelector<HTMLElement>(
          '[data-testid="iframe-generic-serif-reference"]',
        );
        if (!serifProbe || !sourceReference || !genericReference) {
          throw new Error('iframe serif font probes not mounted');
        }
        const serifWidth = serifProbe.getBoundingClientRect().width;
        const sourceWidth = sourceReference.getBoundingClientRect().width;
        const genericWidth = genericReference.getBoundingClientRect().width;
        await expect(iframeWindow.getComputedStyle(serifProbe).fontFamily).toContain(
          'Source Serif 4',
        );
        await expect(Math.abs(serifWidth - sourceWidth)).toBeLessThan(0.1);
        await expect(Math.abs(serifWidth - genericWidth)).toBeGreaterThan(0.1);
      }, browserWaitOptions);

      Reflect.deleteProperty(styleSheetPrototype, 'replaceSync');
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

      await waitFor(async () => {
        const fallbackHost =
          fallbackContainer?.querySelector<HTMLDivElement>('[data-yv-shadow-host]');
        const shadowRoot = fallbackHost?.shadowRoot;
        const content = shadowRoot?.querySelector('[data-testid="iframe-fallback-content"]');
        const style = shadowRoot?.querySelector('style');
        if (!content || !style) throw new Error('iframe fallback content not mounted');
        await expect(shadowRoot?.adoptedStyleSheets).toHaveLength(0);
        await expect(style.getAttribute('data-href')).toBe('yv-sdk-shadow-styles');
        await expect(style.getAttribute('data-precedence')).toBe('yv-sdk');
        await expect(iframeWindow.getComputedStyle(content).display).toBe('flex');
      }, browserWaitOptions);
    } finally {
      Object.defineProperty(styleSheetPrototype, 'replaceSync', originalReplaceSyncDescriptor);
      fallbackRoot?.unmount();
      fallbackContainer?.remove();
      root.unmount();
      container.remove();
    }
  },
};
