import type { KeyboardEvent } from 'react';
import { tabbable } from 'tabbable';

/** @internal Keeps Tab navigation inside popover content that crosses a shadow boundary. */
export function handleShadowPopoverTabLoop(event: KeyboardEvent<HTMLElement>): void {
  if (
    event.defaultPrevented ||
    event.key !== 'Tab' ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return;
  }

  // Radix's focus loop relies on document.activeElement and a light-DOM scan.
  // Take over when this Popover is in or owns a shadow tree.
  const candidates = tabbable(event.currentTarget, { getShadowRoot: true });
  const contentRoot = event.currentTarget.getRootNode();
  const ownsNestedShadowTree = candidates.some(
    (candidate) => candidate.getRootNode() !== contentRoot,
  );
  if (contentRoot === event.currentTarget.ownerDocument && !ownsNestedShadowTree) return;

  const eventPath = event.nativeEvent.composedPath();
  if (!eventPath.includes(event.currentTarget)) return;

  const [realTarget] = eventPath;
  const currentIndex = candidates.findIndex((candidate) => candidate === realTarget);
  if (
    !ownsNestedShadowTree &&
    currentIndex !== -1 &&
    (event.shiftKey ? currentIndex !== 0 : currentIndex !== candidates.length - 1)
  ) {
    return;
  }
  const nextIndex = event.shiftKey
    ? currentIndex <= 0
      ? candidates.length - 1
      : currentIndex - 1
    : currentIndex === -1 || currentIndex === candidates.length - 1
      ? 0
      : currentIndex + 1;
  const nextCandidate = candidates[nextIndex];

  event.preventDefault();
  if (nextCandidate?.getRootNode() === contentRoot) {
    queueMicrotask(() => nextCandidate.isConnected && nextCandidate.focus());
  } else {
    nextCandidate?.focus();
  }
}
