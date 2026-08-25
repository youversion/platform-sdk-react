import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ShadowRootHost } from '@/lib/shadow-root-host';
import { requireShadowRoot } from '@/test/dom-stubs';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

describe('Popover shadow portal coordination', () => {
  it('renders initially open controlled and uncontrolled content in their shadow roots', async () => {
    const defaultOpenRender = render(
      <ShadowRootHost portalStrategy="local-inline">
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent showHeader={false}>Panel</PopoverContent>
        </Popover>
      </ShadowRootHost>,
    );

    const defaultOpenRoot = requireShadowRoot(defaultOpenRender.container);

    await waitFor(() => {
      expect(defaultOpenRoot.querySelector('[data-slot="popover-content"]')).toHaveTextContent(
        'Panel',
      );
    });
    expect(document.body.querySelector('[data-slot="popover-content"]')).toBeNull();
    defaultOpenRender.unmount();

    const controlledOpenRender = render(
      <ShadowRootHost portalStrategy="local-inline">
        <Popover open>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent showHeader={false}>Panel</PopoverContent>
        </Popover>
      </ShadowRootHost>,
    );

    const controlledOpenRoot = requireShadowRoot(controlledOpenRender.container);
    await waitFor(() => {
      expect(controlledOpenRoot.querySelector('[data-slot="popover-content"]')).toHaveTextContent(
        'Panel',
      );
    });
    expect(document.body.querySelector('[data-slot="popover-content"]')).toBeNull();
  });

  it('does not prepare a portal when a controlled owner rejects an open request', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <ShadowRootHost portalStrategy="local-inline">
        <Popover open={false} onOpenChange={onOpenChange}>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent showHeader={false}>Panel</PopoverContent>
        </Popover>
      </ShadowRootHost>,
    );

    const shadowRoot = requireShadowRoot(container);
    const trigger = shadowRoot.querySelector<HTMLButtonElement>('button');
    expect(trigger).not.toBeNull();

    await user.click(trigger!);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(shadowRoot.querySelector('[data-yv-shadow-inline-overlay]')).toBeNull();
    expect(document.body.querySelector('[data-slot="popover-content"]')).toBeNull();
  });

  it('keeps the local portal registered when a controlled owner rejects a close request', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <ShadowRootHost portalStrategy="local-inline">
        <Popover open onOpenChange={onOpenChange}>
          <PopoverTrigger>Toggle</PopoverTrigger>
          <PopoverContent showHeader={false}>Panel</PopoverContent>
        </Popover>
      </ShadowRootHost>,
    );

    const shadowRoot = requireShadowRoot(container);
    await waitFor(() => {
      expect(shadowRoot.querySelector('[data-slot="popover-content"]')).toHaveTextContent('Panel');
    });

    await user.click(shadowRoot.querySelector<HTMLButtonElement>('button')!);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(shadowRoot.querySelector('[data-yv-shadow-inline-overlay]')).toContainElement(
      shadowRoot.querySelector('[data-slot="popover-content"]'),
    );
    expect(document.body.querySelector('[data-slot="popover-content"]')).toBeNull();
  });
});
