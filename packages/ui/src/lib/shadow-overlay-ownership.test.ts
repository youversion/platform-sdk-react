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
    const originalOpener = button('Open dialog');
    const reopenedOpener = button('Reopen dialog');
    const ownership = new ShadowOverlayOwnership();

    ownership.mount({ id: 'dialog', kind: 'modal', opener: originalOpener });
    ownership.beginExit('dialog');
    expect(ownership.snapshot()).toMatchObject({
      ownerId: 'dialog',
      backgroundInert: true,
      layers: [{ id: 'dialog', phase: 'exiting' }],
    });

    ownership.mount({
      id: 'dialog',
      kind: 'modal',
      opener: reopenedOpener,
      dismissible: false,
    });

    expect(ownership.snapshot()).toMatchObject({
      ownerId: 'dialog',
      backgroundInert: true,
      layers: [{ id: 'dialog', phase: 'active' }],
    });
    expect(ownership.requestDismiss()).toBeNull();
    ownership.beginExit('dialog');
    expect(ownership.unmount('dialog')).toEqual({ kind: 'element', element: reopenedOpener });
  });

  it('keeps an unrelated nonmodal overlay outside the active modal scope', () => {
    document.body.replaceChildren();
    const ownership = new ShadowOverlayOwnership();
    const dialogOpener = button('Open dialog');
    ownership.mount({ id: 'dialog', kind: 'modal', opener: dialogOpener });
    ownership.mount({ id: 'unrelated', kind: 'nonmodal', opener: button('Open unrelated') });

    expect(ownership.snapshot()).toMatchObject({
      ownerId: 'dialog',
      layers: [
        { id: 'dialog', eligible: true },
        { id: 'unrelated', eligible: false },
      ],
    });

    ownership.beginExit('dialog');
    expect(ownership.unmount('dialog')).toEqual({ kind: 'element', element: dialogOpener });
    expect(ownership.snapshot()).toMatchObject({
      ownerId: 'unrelated',
      modalOwnerId: null,
      backgroundInert: false,
      layers: [{ id: 'unrelated', eligible: true }],
    });
  });

  it('blocks dismissal fallthrough from a nondismissible owner', () => {
    document.body.replaceChildren();
    const ownership = new ShadowOverlayOwnership();
    ownership.mount({ id: 'first', kind: 'nonmodal', opener: button('Open first') });
    ownership.mount({
      id: 'second',
      kind: 'nonmodal',
      opener: button('Open second'),
      dismissible: false,
    });

    expect(ownership.snapshot().ownerId).toBe('second');
    expect(ownership.requestDismiss()).toBeNull();
    expect(ownership.snapshot().layers).toHaveLength(2);
  });

  it('blocks dismissal fallthrough and ancestor unmount while descendants exit', () => {
    document.body.replaceChildren();
    const ownership = new ShadowOverlayOwnership();
    const dialogOpener = button('Open dialog');
    ownership.mount({ id: 'dialog', kind: 'modal', opener: dialogOpener });
    ownership.mount({
      id: 'popover',
      kind: 'nonmodal',
      opener: button('Open popover'),
      parentId: 'dialog',
    });

    expect(ownership.beginExit('dialog')).toEqual(['popover', 'dialog']);
    expect(ownership.requestDismiss()).toBeNull();
    expect(() =>
      ownership.mount({
        id: 'late-child',
        kind: 'nonmodal',
        opener: button('Open late child'),
        parentId: 'dialog',
      }),
    ).toThrow('Cannot mount overlay "late-child" under exiting parent "dialog"');
    expect(() => ownership.unmount('dialog')).toThrow(
      'Cannot unmount overlay "dialog" before descendant "popover"',
    );
    expect(ownership.unmount('popover')).toBeNull();
    expect(ownership.snapshot().backgroundInert).toBe(true);
    expect(ownership.unmount('dialog')).toEqual({
      kind: 'element',
      element: dialogOpener,
    });
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
