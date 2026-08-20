import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShadowRootHost } from './shadow-root-host';

describe('ShadowRootHost', () => {
  it('attaches one shadow root under StrictMode', () => {
    let container!: HTMLElement;
    expect(() => {
      ({ container } = render(
        <StrictMode>
          <ShadowRootHost>
            <span>content</span>
          </ShadowRootHost>
        </StrictMode>,
      ));
    }).not.toThrow();

    const host = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
    expect(host).not.toBeNull();
    expect(host?.shadowRoot).not.toBeNull();
    expect(host?.shadowRoot?.textContent).toContain('content');
  });

  it('applies important inline declarations to stabilize the host box', () => {
    const { container } = render(
      <ShadowRootHost>
        <span>content</span>
      </ShadowRootHost>,
    );

    const host = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
    expect(host).not.toBeNull();
    expect(host?.style.getPropertyValue('all')).toBe('initial');
    expect(host?.style.getPropertyValue('display')).toBe('contents');
    expect(host?.style.getPropertyValue('writing-mode')).toBe('inherit');
    expect(host?.style.getPropertyValue('text-orientation')).toBe('inherit');

    // jsdom's cssstyle backing does not track priority for `all`,
    // `writing-mode`, or `text-orientation` (real browsers do), so only
    // `display` can assert getPropertyPriority here. The value-only checks
    // above still prove the other properties were set.
    expect(host?.style.getPropertyPriority('display')).toBe('important');
  });

  it('gives the fallback stylesheet a stable React resource identity', () => {
    const { container } = render(
      <ShadowRootHost>
        <span>content</span>
      </ShadowRootHost>,
    );

    const style = container
      .querySelector<HTMLElement>('[data-yv-shadow-host]')
      ?.shadowRoot?.querySelector('style');

    // jsdom does not implement constructable stylesheets, so this exercises
    // the fallback path. React uses href + precedence to hoist and de-duplicate
    // stylesheet resources within the shadow root.
    expect(style?.getAttribute('data-href')).toBe('yv-sdk-shadow-styles');
    expect(style?.getAttribute('data-precedence')).toBe('yv-sdk');
  });

  it('reuses one document-level overlay root and keeps it available after unmount', () => {
    const { unmount } = render(
      <>
        <ShadowRootHost>
          <span>first</span>
        </ShadowRootHost>
        <ShadowRootHost>
          <span>second</span>
        </ShadowRootHost>
      </>,
    );

    const overlayHosts = document.body.querySelectorAll<HTMLElement>(
      '[data-yv-shadow-overlay-host]',
    );
    expect(overlayHosts).toHaveLength(1);

    const overlayRoot = overlayHosts[0]?.shadowRoot;
    expect(overlayRoot).not.toBeNull();

    // jsdom does not implement constructable stylesheets, so the shared
    // overlay root installs the direct <style> fallback.
    expect(overlayRoot?.querySelector('style')).not.toBeNull();

    unmount();

    // The shared overlay root intentionally lives for the document lifetime
    // so later isolated components can reuse it without recreating resources.
    expect(
      document.body.querySelectorAll('[data-yv-shadow-overlay-host]'),
    ).toHaveLength(1);
  });

  it('reconnects the existing overlay root when its host is detached', () => {
    render(
      <ShadowRootHost>
        <span>first</span>
      </ShadowRootHost>,
    );

    const overlayHost = document.body.querySelector<HTMLElement>(
      '[data-yv-shadow-overlay-host]',
    );
    const overlayRoot = overlayHost?.shadowRoot;
    expect(overlayHost).not.toBeNull();
    expect(overlayRoot).not.toBeNull();

    overlayHost?.remove();
    expect(overlayHost?.isConnected).toBe(false);

    render(
      <ShadowRootHost>
        <span>second</span>
      </ShadowRootHost>,
    );

    const reconnectedHost = document.body.querySelector<HTMLElement>(
      '[data-yv-shadow-overlay-host]',
    );
    expect(reconnectedHost).toBe(overlayHost);
    expect(reconnectedHost?.shadowRoot).toBe(overlayRoot);
  });
});
