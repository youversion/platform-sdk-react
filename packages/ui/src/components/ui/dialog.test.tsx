import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShadowRootHost } from '@/lib/shadow-root-host';
import { requireShadowRoot } from '@/test/dom-stubs';
import { Dialog, DialogContent, DialogTitle } from './dialog';

describe('Dialog shadow portal coordination', () => {
  it('preserves light-DOM state and ref behavior without changing overlay focusability', async () => {
    const cleanup = vi.fn();
    const contentRef = vi.fn((node: HTMLDivElement | null): (() => void) | undefined =>
      node ? cleanup : undefined,
    );
    const defaultOpenRender = render(
      <Dialog defaultOpen>
        <DialogContent ref={contentRef}>
          <DialogTitle>Uncontrolled title</DialogTitle>
          <button type="button">Inside</button>
        </DialogContent>
      </Dialog>,
    );
    const lightDomDialog = await waitFor(() => {
      const element = document.body.querySelector('[role="dialog"]');
      if (!element) throw new Error('light-DOM dialog not rendered');
      return element;
    });
    expect(lightDomDialog.previousElementSibling).not.toHaveAttribute('tabindex');
    expect(contentRef).toHaveBeenCalledWith(expect.any(HTMLDivElement));

    cleanup.mockClear();
    defaultOpenRender.unmount();
    expect(cleanup).toHaveBeenCalledOnce();

    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Controlled title</DialogTitle>
          <button type="button">Inside</button>
        </DialogContent>
      </Dialog>,
    );
    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('coordinates placement, inertness, and focus containment inside a shadow root', async () => {
    const { container, rerender } = render(
      <>
        <button type="button" data-testid="outside">
          Outside
        </button>
        <ShadowRootHost portalStrategy="local-inline">
          <button type="button">Background</button>
          <Dialog open>
            <DialogContent>
              <DialogTitle>Title</DialogTitle>
              <button type="button">Inside</button>
            </DialogContent>
          </Dialog>
        </ShadowRootHost>
      </>,
    );

    const shadowRoot = requireShadowRoot(container);
    const wrapper = shadowRoot.querySelector<HTMLElement>('[data-yv-shadow-content-wrapper]');
    expect(wrapper).not.toBeNull();
    const dialog = await waitFor(() => {
      const element = shadowRoot.querySelector<HTMLElement>('[role="dialog"]');
      if (!element) throw new Error('shadow dialog not rendered');
      expect(wrapper?.inert).toBe(true);
      return element;
    });
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(dialog.previousElementSibling).toHaveAttribute('tabindex', '-1');

    const outside = container.querySelector<HTMLButtonElement>('[data-testid="outside"]');
    expect(outside).not.toBeNull();
    outside?.focus();

    await waitFor(() => {
      const focused = shadowRoot.activeElement;
      expect(focused !== null && dialog.contains(focused)).toBe(true);
    });
    expect(document.activeElement).not.toBe(outside);

    rerender(
      <>
        <button type="button" data-testid="outside">
          Outside
        </button>
        <ShadowRootHost portalStrategy="local-inline">
          <button type="button">Background</button>
          <Dialog open={false}>
            <DialogContent>
              <DialogTitle>Title</DialogTitle>
              <button type="button">Inside</button>
            </DialogContent>
          </Dialog>
        </ShadowRootHost>
      </>,
    );

    await waitFor(() => {
      expect(shadowRoot.querySelector('[role="dialog"]')).toBeNull();
    });
    expect(wrapper?.inert).toBe(false);
  });
});
