import { StrictMode, useState } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShadowRootHost, useShadowPortalTarget } from './shadow-root-host';

function PortalRequester(): React.ReactNode {
  const [open, setOpen] = useState(false);
  useShadowPortalTarget(open);
  return (
    <button type="button" onClick={() => setOpen(true)}>
      Open portal
    </button>
  );
}

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

  it('creates a local portal lazily only after an overlay requests one', async () => {
    const { container } = render(
      <>
        <ShadowRootHost>
          <span>leaf without overlays</span>
        </ShadowRootHost>
        <ShadowRootHost portalStrategy="local-inline">
          <PortalRequester />
        </ShadowRootHost>
      </>,
    );

    const roots = Array.from(
      container.querySelectorAll<HTMLElement>('[data-yv-shadow-host]'),
      (host) => host.shadowRoot,
    );
    expect(roots).toHaveLength(2);
    expect(roots[0]?.querySelector('[data-yv-shadow-inline-overlay]')).toBeNull();
    expect(roots[1]?.querySelector('[data-yv-shadow-inline-overlay]')).toBeNull();

    roots[1]?.querySelector<HTMLButtonElement>('button')?.click();

    const localPortal = await waitFor(() => {
      const element = roots[1]?.querySelector<HTMLElement>('[data-yv-shadow-inline-overlay]');
      if (!element) throw new Error('local portal not created');
      return element;
    });
    expect(localPortal.getRootNode()).toBe(roots[1]);
    expect(roots[0]?.querySelector('[data-yv-shadow-inline-overlay]')).toBeNull();
  });

});
