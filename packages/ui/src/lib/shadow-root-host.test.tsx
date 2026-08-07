import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShadowRootHost } from './shadow-root-host';

describe('ShadowRootHost', () => {
  it('attaches one shadow root under StrictMode', () => {
    expect(() =>
      render(
        <StrictMode>
          <ShadowRootHost>
            <span>content</span>
          </ShadowRootHost>
        </StrictMode>,
      ),
    ).not.toThrow();

    const host = document.querySelector<HTMLElement>('[data-yv-shadow-host]');
    expect(host?.shadowRoot?.textContent).toContain('content');
  });

  it('locks the host box against host-page important rules', () => {
    render(
      <ShadowRootHost>
        <span>content</span>
      </ShadowRootHost>,
    );

    const host = document.querySelector<HTMLElement>('[data-yv-shadow-host]');
    expect(host?.style.getPropertyValue('all')).toBe('initial');
    expect(host?.style.getPropertyValue('display')).toBe('contents');
    expect(host?.style.getPropertyPriority('display')).toBe('important');
  });
});
