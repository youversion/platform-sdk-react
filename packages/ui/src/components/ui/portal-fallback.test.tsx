import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './dialog';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

describe('portal fallback without shadow isolation', () => {
  it('renders popover content in the document without creating an overlay host', () => {
    const overlayHostCount = document.body.querySelectorAll('[data-yv-shadow-overlay-host]').length;

    render(
      <Popover open>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent heading="Versions">Content</PopoverContent>
      </Popover>,
    );

    const content = document.body.querySelector('[data-slot="popover-content"]');
    expect(content?.getRootNode()).toBe(document);
    expect(document.body.querySelectorAll('[data-yv-shadow-overlay-host]')).toHaveLength(
      overlayHostCount,
    );
  });

  it('renders dialog content in the document without creating an overlay host', () => {
    const overlayHostCount = document.body.querySelectorAll('[data-yv-shadow-overlay-host]').length;

    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogContent>
      </Dialog>,
    );

    const content = document.body.querySelector('[role="dialog"]');
    expect(content?.getRootNode()).toBe(document);
    expect(document.body.querySelectorAll('[data-yv-shadow-overlay-host]')).toHaveLength(
      overlayHostCount,
    );
  });
});
