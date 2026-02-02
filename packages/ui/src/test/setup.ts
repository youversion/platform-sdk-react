// Vitest setup file
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Popover API mock for jsdom
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.showPopover) {
  HTMLElement.prototype.showPopover = function () {
    this.style.display = 'block';
    const toggleEvent = new Event('toggle', { bubbles: false });
    Object.defineProperty(toggleEvent, 'newState', { value: 'open', writable: false });
    this.dispatchEvent(toggleEvent);
  };

  HTMLElement.prototype.hidePopover = function () {
    this.style.display = 'none';
    const toggleEvent = new Event('toggle', { bubbles: false });
    Object.defineProperty(toggleEvent, 'newState', { value: 'closed', writable: false });
    this.dispatchEvent(toggleEvent);
  };

  HTMLElement.prototype.togglePopover = function (force?: boolean): boolean {
    const isOpen = this.style.display !== 'none';
    if (force === undefined || force !== isOpen) {
      if (isOpen) {
        this.hidePopover();
      } else {
        this.showPopover();
      }
    }
    return !isOpen;
  };
}

// Clean up after each test
afterEach(() => {
  cleanup();
});
