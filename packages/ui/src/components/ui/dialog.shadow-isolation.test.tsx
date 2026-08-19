import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShadowRootHost } from '../../lib/shadow-root-host';
import { Dialog, DialogContent, DialogTitle } from './dialog';

describe('DialogContent shadow isolation', () => {
  it('portals into the shared shadow overlay when one is available', () => {
    render(
      <ShadowRootHost>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Isolated dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      </ShadowRootHost>,
    );

    const overlayRoot = document.body.querySelector<HTMLElement>(
      '[data-yv-shadow-overlay-host]',
    )?.shadowRoot;
    const dialog = overlayRoot?.querySelector('[role="dialog"]');

    expect(dialog).not.toBeNull();
    expect(document.body.querySelector(':scope > [role="dialog"]')).toBeNull();
  });
});
