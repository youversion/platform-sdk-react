import { describe, expect, it } from 'vitest';
import { ShadowOverlayOwnership } from './shadow-overlay-ownership';

function button(label: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.textContent = label;
  document.body.append(element);
  return element;
}

describe('ShadowOverlayOwnership', () => {
  it('coordinates a popover opening a dialog', () => {
    document.body.replaceChildren();
    const pageOpener = button('Open popover');
    const dialogOpener = button('Open dialog');
    const ownership = new ShadowOverlayOwnership();

    ownership.mount({ id: 'popover', kind: 'nonmodal', opener: pageOpener });
    ownership.mount({
      id: 'dialog',
      kind: 'modal',
      opener: dialogOpener,
      parentId: 'popover',
    });

    expect(ownership.snapshot()).toMatchObject({
      ownerId: 'dialog',
      modalOwnerId: 'dialog',
      backgroundInert: true,
      layers: [
        { id: 'popover', eligible: false, phase: 'active' },
        { id: 'dialog', eligible: true, phase: 'active' },
      ],
    });
    expect(ownership.requestDismiss()).toBe('dialog');

    ownership.beginExit('dialog');
    expect(ownership.snapshot().backgroundInert).toBe(true);
    expect(ownership.requestDismiss()).toBeNull();
    expect(ownership.unmount('dialog')).toEqual({ kind: 'element', element: dialogOpener });
    expect(ownership.snapshot()).toMatchObject({
      ownerId: 'popover',
      modalOwnerId: null,
      backgroundInert: false,
    });

    ownership.beginExit('popover');
    expect(ownership.unmount('popover')).toEqual({ kind: 'element', element: pageOpener });
  });

  it('coordinates a dialog containing a popover', () => {
    document.body.replaceChildren();
    const pageOpener = button('Open dialog');
    const popoverOpener = button('Open popover');
    const ownership = new ShadowOverlayOwnership();

    ownership.mount({ id: 'dialog', kind: 'modal', opener: pageOpener });
    ownership.mount({
      id: 'popover',
      kind: 'nonmodal',
      opener: popoverOpener,
      parentId: 'dialog',
    });

    expect(ownership.snapshot()).toMatchObject({
      ownerId: 'popover',
      modalOwnerId: 'dialog',
      backgroundInert: true,
      layers: [
        { id: 'dialog', eligible: true },
        { id: 'popover', eligible: true },
      ],
    });
    expect(ownership.requestDismiss()).toBe('popover');

    ownership.beginExit('popover');
    expect(ownership.unmount('popover')).toEqual({ kind: 'element', element: popoverOpener });
    expect(ownership.snapshot()).toMatchObject({ ownerId: 'dialog', backgroundInert: true });

    ownership.beginExit('dialog');
    expect(ownership.unmount('dialog')).toEqual({ kind: 'element', element: pageOpener });
    expect(ownership.snapshot().backgroundInert).toBe(false);
  });

  it('coordinates two independent overlays in LIFO order', () => {
    document.body.replaceChildren();
    const firstOpener = button('Open first');
    const secondOpener = button('Open second');
    const ownership = new ShadowOverlayOwnership();

    ownership.mount({ id: 'first', kind: 'nonmodal', opener: firstOpener });
    ownership.mount({ id: 'second', kind: 'nonmodal', opener: secondOpener });

    expect(ownership.snapshot()).toMatchObject({
      ownerId: 'second',
      modalOwnerId: null,
      backgroundInert: false,
    });
    expect(ownership.requestDismiss()).toBe('second');

    ownership.beginExit('second');
    expect(ownership.unmount('second')).toEqual({ kind: 'element', element: secondOpener });
    expect(ownership.snapshot().ownerId).toBe('first');

    ownership.beginExit('first');
    expect(ownership.unmount('first')).toEqual({ kind: 'element', element: firstOpener });
    expect(ownership.snapshot().ownerId).toBeNull();
  });

  it('reopens the same overlay during its exit without duplicating ownership', () => {
    document.body.replaceChildren();
    const opener = button('Open dialog');
    const ownership = new ShadowOverlayOwnership();

    ownership.mount({ id: 'dialog', kind: 'modal', opener });
    ownership.beginExit('dialog');
    expect(ownership.snapshot()).toMatchObject({
      ownerId: 'dialog',
      backgroundInert: true,
      layers: [{ id: 'dialog', phase: 'exiting' }],
    });

    ownership.mount({ id: 'dialog', kind: 'modal', opener });

    expect(ownership.snapshot()).toMatchObject({
      ownerId: 'dialog',
      backgroundInert: true,
      layers: [{ id: 'dialog', phase: 'active' }],
    });
  });

  it('keeps an unrelated nonmodal overlay outside the active modal scope', () => {
    document.body.replaceChildren();
    const ownership = new ShadowOverlayOwnership();
    ownership.mount({ id: 'dialog', kind: 'modal', opener: button('Open dialog') });
    ownership.mount({ id: 'unrelated', kind: 'nonmodal', opener: button('Open unrelated') });

    expect(ownership.snapshot()).toMatchObject({
      ownerId: 'dialog',
      layers: [
        { id: 'dialog', eligible: true },
        { id: 'unrelated', eligible: false },
      ],
    });
  });

  it('blocks dismissal fallthrough and ancestor unmount while descendants exit', () => {
    document.body.replaceChildren();
    const ownership = new ShadowOverlayOwnership();
    ownership.mount({ id: 'dialog', kind: 'modal', opener: button('Open dialog') });
    ownership.mount({
      id: 'popover',
      kind: 'nonmodal',
      opener: button('Open popover'),
      parentId: 'dialog',
    });

    expect(ownership.beginExit('dialog')).toEqual(['popover', 'dialog']);
    expect(ownership.requestDismiss()).toBeNull();
    expect(() => ownership.unmount('dialog')).toThrow(
      'Cannot unmount overlay "dialog" before descendant "popover"',
    );
    ownership.unmount('popover');
    expect(ownership.snapshot().backgroundInert).toBe(true);
    ownership.unmount('dialog');
    expect(ownership.snapshot().backgroundInert).toBe(false);
  });

  it('falls back to the remaining owner when an opener disconnects', () => {
    document.body.replaceChildren();
    const ownership = new ShadowOverlayOwnership();
    ownership.mount({ id: 'first', kind: 'nonmodal', opener: button('Open first') });
    const disconnectedOpener = button('Open second');
    ownership.mount({ id: 'second', kind: 'nonmodal', opener: disconnectedOpener });
    disconnectedOpener.remove();

    ownership.beginExit('second');
    expect(ownership.unmount('second')).toEqual({ kind: 'layer', id: 'first' });
  });
});
