export function revealElementWithinScrollContainer(
  element: Element,
  container: HTMLElement,
  align: 'nearest' | 'start' = 'nearest',
): void {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  // offsetHeight includes the borders and scrollbar represented in the visual rect.
  const scale = container.offsetHeight ? containerRect.height / container.offsetHeight : 1;
  if (!scale || !container.clientHeight) return;

  const scrollportTop = containerRect.top + container.clientTop * scale;
  const scrollportBottom = scrollportTop + container.clientHeight * scale;
  const start = elementRect.top - scrollportTop;
  const end = elementRect.bottom - scrollportBottom;
  if (align === 'start') {
    container.scrollTop += start / scale;
    return;
  }
  if ((start < 0 && end > 0) || (start >= 0 && end <= 0)) return;

  const fits = elementRect.height <= container.clientHeight * scale;
  container.scrollTop += (fits === (start < 0) ? start : end) / scale;
}

export function findNearestVerticalScrollContainer(element: HTMLElement): HTMLElement | undefined {
  const { ownerDocument } = element;
  const view = ownerDocument.defaultView;
  if (!view) return;
  let node: Element = element;
  for (;;) {
    const root = node.getRootNode();
    const parent = node.parentElement ?? (root instanceof view.ShadowRoot ? root.host : null);
    if (!parent || parent === ownerDocument.body || parent === ownerDocument.documentElement) return;
    if (
      parent instanceof view.HTMLElement &&
      parent.scrollHeight > parent.clientHeight &&
      ['auto', 'scroll', 'overlay'].includes(view.getComputedStyle(parent).overflowY)
    ) {
      return parent;
    }
    node = parent;
  }
}
