export function revealElementWithinScrollContainer(
  element: Element,
  container: HTMLElement,
  align: 'nearest' | 'start' = 'nearest',
): void {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  // DOMRect uses transformed visual pixels, while scrollTop and clientHeight use layout pixels.
  const blockScale =
    container.clientHeight > 0 && containerRect.height > 0
      ? containerRect.height / container.clientHeight
      : 1;
  if (align === 'start' || elementRect.top < containerRect.top) {
    container.scrollTop += (elementRect.top - containerRect.top) / blockScale;
  } else if (elementRect.bottom > containerRect.bottom) {
    container.scrollTop += (elementRect.bottom - containerRect.bottom) / blockScale;
  }
}
