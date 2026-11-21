import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { BibleReaderNavigationRequest } from '@/components/bible-reader-navigation';
import { isElementFromOwnerDocument } from './shadow-root-host';

export type VerseFocusRequest = BibleReaderNavigationRequest &
  Readonly<{
    /** Monotonic. Re-selecting the same verse must re-trigger, like `clearSelectionSignal`. */
    seq: number;
  }>;

function paintFocus(container: HTMLElement, verses: readonly number[]): void {
  container.setAttribute('data-yv-verse-focus', '');
  const wanted = new Set(verses);
  container.querySelectorAll('.yv-v[v]').forEach((node) => {
    if (!isElementFromOwnerDocument(node, container, 'HTMLElement')) return;
    const verseNum = Number.parseInt(node.getAttribute('v') ?? '', 10);
    node.classList.toggle('yv-v-focused', wanted.has(verseNum));
  });
}

function clearFocusPaint(container: HTMLElement): void {
  container.removeAttribute('data-yv-verse-focus');
  container.querySelectorAll('.yv-v-focused').forEach((node) => {
    node.classList.remove('yv-v-focused');
  });
}

function prefersReducedMotion(ownerWindow: Window): boolean {
  return Boolean(ownerWindow.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function overflowAncestor(start: HTMLElement): HTMLElement {
  const ownerDocument = start.ownerDocument;
  let node: HTMLElement | null = start;
  while (node !== null) {
    const overflowY = ownerDocument.defaultView?.getComputedStyle(node).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return node;
    }
    node = node.parentElement;
  }
  return ownerDocument.documentElement;
}

/**
 * Holds a focus request until `renderedReference` equals
 * the requested passage, then scrolls and paints until user interaction.
 * A newer `seq` cancels pending focus. Paint adds `yv-v-focused` to
 * `.yv-v[v="N"]` and `data-yv-verse-focus` to the renderer root.
 */
export function useTransientVerseFocus(args: {
  readonly request: VerseFocusRequest | null;
  readonly renderedReference: string;
  readonly containerRef: RefObject<HTMLElement | null>;
}): void {
  const { request, renderedReference, containerRef } = args;
  const handledSeq = useRef<number | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (request === null || container === null || handledSeq.current === request.seq) {
      return;
    }
    const ownerDocument = container.ownerDocument;
    const ownerWindow = ownerDocument.defaultView;
    if (ownerWindow === null) return;
    const reference = request.showsFullChapter
      ? `${request.book}.${request.chapter}`
      : request.passageId;
    if (renderedReference !== reference) {
      return;
    }

    const verses = request.verses;
    const first = verses[0];
    const candidate = container.querySelector(`.yv-v[v="${String(first)}"]`);
    const target = isElementFromOwnerDocument(candidate, container, 'HTMLElement')
      ? candidate
      : null;
    const scroller = overflowAncestor(container);
    const scrollEvents = scroller === ownerDocument.documentElement ? ownerDocument : scroller;
    let waiting = false;
    let cleared = false;
    let settle: number | undefined;
    let fallback: number | undefined;
    const clear = (): void => {
      cleared = true;
      waiting = false;
      ownerWindow.clearTimeout(settle);
      ownerWindow.clearTimeout(fallback);
      clearFocusPaint(container);
    };
    const landed = (): void => {
      handledSeq.current = request.seq;
      waiting = false;
      ownerWindow.clearTimeout(settle);
      ownerWindow.clearTimeout(fallback);
      if (cleared || !request.shouldFocus || verses.length === 0) return;
      paintFocus(container, verses);
      if (target !== null) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    };
    const onScroll = (): void => {
      if (!waiting) return;
      ownerWindow.clearTimeout(settle);
      settle = ownerWindow.setTimeout(landed, 100);
    };
    const onScrollEnd = (): void => {
      if (waiting) landed();
    };
    scrollEvents.addEventListener('scroll', onScroll);
    scrollEvents.addEventListener('scrollend', onScrollEnd);
    // User intent cancels both pending and painted focus. Programmatic scroll
    // events only settle navigation; they cannot masquerade as user input.
    const onInteract = (): void => {
      handledSeq.current = request.seq;
      clear();
    };
    for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
      scroller.addEventListener(event, onInteract, { passive: true });
    }
    const frame = ownerWindow.requestAnimationFrame(() => {
      if (cleared) return;
      if (!request.scrollsToVerse) {
        landed();
        return;
      }
      const reducedMotion = prefersReducedMotion(ownerWindow);
      waiting = true;
      const scrollToVerse = request.showsFullChapter && target !== null;
      const destination = scrollToVerse ? target : container;
      destination.scrollIntoView({
        block: scrollToVerse ? 'center' : 'start',
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
      if (reducedMotion) {
        landed();
        return;
      }
      // scrollend is not universal, and a no-op scroll emits no events.
      settle = ownerWindow.setTimeout(landed, 100);
      fallback = ownerWindow.setTimeout(landed, 2000);
    });

    return () => {
      ownerWindow.cancelAnimationFrame(frame);
      scrollEvents.removeEventListener('scroll', onScroll);
      scrollEvents.removeEventListener('scrollend', onScrollEnd);
      for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
        scroller.removeEventListener(event, onInteract);
      }
      clear();
    };
  }, [request, renderedReference, containerRef]);
}
