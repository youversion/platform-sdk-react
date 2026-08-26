import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShadowRootHost } from '@/lib/shadow-root-host';
import { requireShadowRoot } from '@/test/dom-stubs';
import { Dialog, DialogContent, DialogTitle } from './dialog';

describe('Dialog shadow portal coordination', () => {
  it('preserves controlled and uncontrolled Radix behavior without a shadow portal', async () => {
    const defaultOpenRender = render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Uncontrolled title</DialogTitle>
          <button type="button">Inside</button>
        </DialogContent>
      </Dialog>,
    );
    await waitFor(() => {
      expect(document.body.querySelector('[role="dialog"]')).toHaveTextContent(
        'Uncontrolled title',
      );
    });
    defaultOpenRender.unmount();

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
    expect(document.body.querySelector('[role="dialog"]')).toHaveTextContent('Controlled title');
  });

  it('forwards the content ref and runs its React callback cleanup on unmount', async () => {
    const cleanup = vi.fn();
    const contentRef = vi.fn((node: HTMLDivElement | null): (() => void) | undefined =>
      node ? cleanup : undefined,
    );
    const view = render(
      <Dialog defaultOpen>
        <DialogContent ref={contentRef}>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    await waitFor(() => {
      expect(contentRef).toHaveBeenCalledWith(expect.any(HTMLDivElement));
    });

    cleanup.mockClear();
    view.unmount();

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('renders initially open content in its component shadow root', async () => {
    const { container } = render(
      <ShadowRootHost portalStrategy="local-inline">
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      </ShadowRootHost>,
    );

    const shadowRoot = requireShadowRoot(container);
    await waitFor(() => {
      expect(shadowRoot.querySelector('[role="dialog"]')).not.toBeNull();
    });
    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('keeps sibling shadow content inert until all modal DOM unmounts', async () => {
    const { container, rerender } = render(
      <ShadowRootHost portalStrategy="local-inline">
        <button type="button">Background</button>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      </ShadowRootHost>,
    );

    const shadowRoot = requireShadowRoot(container);
    const wrapper = shadowRoot.querySelector<HTMLElement>('[data-yv-shadow-content-wrapper]');
    expect(wrapper).not.toBeNull();
    await waitFor(() => {
      expect(shadowRoot.querySelector('[role="dialog"]')).not.toBeNull();
      expect(wrapper?.inert).toBe(true);
    });

    rerender(
      <ShadowRootHost portalStrategy="local-inline">
        <button type="button">Background</button>
        <Dialog open={false}>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
          </DialogContent>
        </Dialog>
      </ShadowRootHost>,
    );

    await waitFor(() => {
      expect(shadowRoot.querySelector('[role="dialog"]')).toBeNull();
    });
    expect(wrapper?.inert).toBe(false);
  });

  it('redirects a programmatic focus escape back into an open modal dialog', async () => {
    const { container } = render(
      <>
        <button type="button" data-testid="outside">
          Outside
        </button>
        <ShadowRootHost portalStrategy="local-inline">
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
    const dialog = await waitFor(() => {
      const element = shadowRoot.querySelector<HTMLElement>('[role="dialog"]');
      if (!element) throw new Error('dialog not rendered');
      return element;
    });
    const outside = container.querySelector<HTMLButtonElement>('[data-testid="outside"]');
    expect(outside).not.toBeNull();

    outside?.focus();

    await waitFor(() => {
      const focused = shadowRoot.activeElement;
      expect(focused !== null && dialog.contains(focused)).toBe(true);
    });
    expect(document.activeElement).not.toBe(outside);
  });
});
