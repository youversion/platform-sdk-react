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

  it('adopts caller CSS on the existing fallback stylesheet path', () => {
    const { container } = render(
      <ShadowRootHost cssText=".spike-only { color: rgb(1, 2, 3); }">
        <span>content</span>
      </ShadowRootHost>,
    );

    const style = container
      .querySelector<HTMLElement>('[data-yv-shadow-host]')
      ?.shadowRoot?.querySelector('style');

    expect(style?.textContent).toContain('.spike-only');
    expect(style?.textContent).not.toContain('@layer yv-sdk-utilities');
  });
});
