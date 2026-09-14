import { createRef, forwardRef, StrictMode, useLayoutEffect, useState } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { withShadowIsolation } from './shadow-isolation';
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

const IsolatedRefProbe = withShadowIsolation(
  forwardRef<HTMLButtonElement>((_, ref) => (
    <button ref={ref} type="button">
      Isolated content
    </button>
  )),
  'IsolatedRefProbe',
);

describe('ShadowRootHost', () => {
  it('reuses the empty server host before making the forwarded ref available after shadow mount', async () => {
    const buttonRef = createRef<HTMLButtonElement>();
    const refsDuringInitialClientRender: Array<HTMLButtonElement | null> = [];

    function HydrationProbe(): React.ReactNode {
      useLayoutEffect(() => {
        refsDuringInitialClientRender.push(buttonRef.current);
      }, []);
      return <IsolatedRefProbe ref={buttonRef} />;
    }

    const element = (
      <StrictMode>
        <HydrationProbe />
      </StrictMode>
    );
    const serverMarkup = renderToString(element);

    expect(serverMarkup).toBe('<div data-yv-shadow-host="true"></div>');
    expect(buttonRef.current).toBeNull();

    const container = document.createElement('div');
    container.innerHTML = serverMarkup;
    document.body.append(container);
    const serverHost = container.firstElementChild;
    const recoverableErrors: unknown[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let root: Root | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(container, element, {
          onRecoverableError: (error) => recoverableErrors.push(error),
        });
      });

      const hosts = container.querySelectorAll<HTMLElement>('[data-yv-shadow-host]');
      expect(hosts).toHaveLength(1);
      expect(hosts[0]).toBe(serverHost);
      expect(hosts[0]?.childNodes).toHaveLength(0);
      expect(hosts[0]?.shadowRoot?.querySelectorAll('button')).toHaveLength(1);
      expect(refsDuringInitialClientRender.length).toBeGreaterThan(0);
      expect(refsDuringInitialClientRender.every((value) => value === null)).toBe(true);
      expect(buttonRef.current).toBe(hosts[0]?.shadowRoot?.querySelector('button'));
      expect(recoverableErrors).toEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      if (root) {
        await act(async () => root?.unmount());
      }
      consoleError.mockRestore();
      container.remove();
    }
  });

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

  it('stabilizes the host box while preserving only writing direction', () => {
    const { container } = render(
      <ShadowRootHost>
        <span>content</span>
      </ShadowRootHost>,
    );

    const host = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
    const wrapper = host?.shadowRoot?.querySelector<HTMLElement>(
      '[data-yv-shadow-content-wrapper]',
    );
    expect(host).not.toBeNull();
    expect(wrapper).not.toBeNull();
    expect(host?.style.getPropertyValue('all')).toBe('initial');
    expect(host?.style.getPropertyValue('display')).toBe('contents');
    expect(host?.style.getPropertyValue('direction')).toBe('inherit');
    expect(host?.style.getPropertyValue('writing-mode')).toBe('');
    expect(host?.style.getPropertyValue('text-orientation')).toBe('');
    expect(wrapper?.style.getPropertyValue('all')).toBe('initial');
    expect(wrapper?.style.getPropertyValue('display')).toBe('contents');
    expect(wrapper?.style.getPropertyValue('direction')).toBe('inherit');
    expect(wrapper?.style.getPropertyValue('writing-mode')).toBe('');
    expect(wrapper?.style.getPropertyValue('text-orientation')).toBe('');

    // jsdom's cssstyle backing does not track priority for `all`
    // or `direction` (real browsers do), so only `display` can assert
    // getPropertyPriority here. The value-only checks above still prove
    // direction was set.
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

  it('does not require native Popover selectors when an inline portal unmounts', async () => {
    const matchesDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'matches');
    let view: ReturnType<typeof render> | undefined;

    try {
      Object.defineProperty(HTMLElement.prototype, 'matches', {
        configurable: true,
        writable: true,
        value(this: HTMLElement, selector: string): boolean {
          if (selector === ':popover-open') {
            throw new DOMException('unsupported selector', 'SyntaxError');
          }
          return false;
        },
      });
      view = render(
        <ShadowRootHost portalStrategy="local-inline">
          <PortalRequester />
        </ShadowRootHost>,
      );
      const shadowRoot = view.container.querySelector<HTMLElement>('[data-yv-shadow-host]')?.shadowRoot;
      shadowRoot?.querySelector<HTMLButtonElement>('button')?.click();
      await waitFor(() => {
        if (!shadowRoot?.querySelector('[data-yv-shadow-inline-overlay]')) {
          throw new Error('inline portal not created');
        }
      });
      const mountedView = view;
      view = undefined;
      expect(() => mountedView.unmount()).not.toThrow();
    } finally {
      try {
        view?.unmount();
      } finally {
        if (matchesDescriptor) {
          Object.defineProperty(HTMLElement.prototype, 'matches', matchesDescriptor);
        } else {
          Reflect.deleteProperty(HTMLElement.prototype, 'matches');
        }
      }
    }
  });
});
