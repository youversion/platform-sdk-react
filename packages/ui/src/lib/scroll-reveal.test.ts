import { expect, it, vi } from 'vitest';

import { revealElementWithinScrollContainer } from './scroll-reveal';

it('reveals targets against the scrollport of a scaled, bordered container with a scrollbar', () => {
  const container = document.createElement('div');
  Object.defineProperties(container, {
    offsetHeight: { value: 100 },
    clientTop: { value: 4 },
    clientHeight: { value: 80 },
  });
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 100, 300, 200));

  const row = document.createElement('button');
  const rowRect = vi.spyOn(row, 'getBoundingClientRect');
  rowRect.mockReturnValue(new DOMRect(0, 250, 100, 40));
  revealElementWithinScrollContainer(row, container);
  expect(container.scrollTop).toBe(11);

  rowRect.mockReturnValue(new DOMRect(0, 100, 100, 180));
  revealElementWithinScrollContainer(row, container);
  expect(container.scrollTop).toBe(11);

  revealElementWithinScrollContainer(row, container, 'start');
  expect(container.scrollTop).toBe(7);

  // An oversized row wholly below the scrollport aligns its start; wholly above
  // aligns its end. A row spanning both edges was already left in place above.
  rowRect.mockReturnValue(new DOMRect(0, 300, 100, 180));
  revealElementWithinScrollContainer(row, container);
  expect(container.scrollTop).toBe(103);
  rowRect.mockReturnValue(new DOMRect(0, -100, 100, 180));
  revealElementWithinScrollContainer(row, container);
  expect(container.scrollTop).toBe(9);
});
