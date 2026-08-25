import type { ReactNode } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShadowRootHost } from '@/lib/shadow-root-host';
import { requireShadowRoot } from '@/test/dom-stubs';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

function OpenPopover(): ReactNode {
  return (
    <Popover open>
      <PopoverTrigger>Open</PopoverTrigger>
      <PopoverContent showHeader={false}>Panel</PopoverContent>
    </Popover>
  );
}

describe('Popover portal placement', () => {
  it('uses the document fallback unless its shadow host enables a local portal', async () => {
    const documentRender = render(<OpenPopover />);
    const documentContent = await waitFor(() => {
      const element = document.querySelector('[data-slot="popover-content"]');
      if (!element) throw new Error('document popover content not rendered');
      return element;
    });
    expect(documentContent.getRootNode()).toBe(document);
    documentRender.unmount();

    const fallbackRender = render(
      <ShadowRootHost>
        <OpenPopover />
      </ShadowRootHost>,
    );
    const fallbackRoot = requireShadowRoot(fallbackRender.container);
    const fallbackContent = await waitFor(() => {
      const element = document.querySelector('[data-slot="popover-content"]');
      if (!element) throw new Error('fallback popover content not rendered');
      return element;
    });
    expect(fallbackContent.getRootNode()).toBe(document);
    expect(fallbackRoot.querySelector('[data-slot="popover-content"]')).toBeNull();
    fallbackRender.unmount();

    const isolatedRender = render(
      <ShadowRootHost portalStrategy="local-inline">
        <OpenPopover />
      </ShadowRootHost>,
    );
    const isolatedRoot = requireShadowRoot(isolatedRender.container);
    const isolatedContent = await waitFor(() => {
      const element = isolatedRoot.querySelector('[data-slot="popover-content"]');
      if (!element) throw new Error('isolated popover content not rendered');
      return element;
    });
    expect(isolatedContent).toHaveTextContent('Panel');
    expect(isolatedContent.getRootNode()).toBe(isolatedRoot);
    expect(document.body.querySelector('[data-slot="popover-content"]')).toBeNull();
  });
});
