import { useLayoutEffect, useRef, type RefObject } from 'react';
import type { BibleReaderNavigationRequest } from '@/components/bible-reader-navigation';

export type VerseFocusRequest = BibleReaderNavigationRequest &
  Readonly<{
    /** Monotonic. Re-selecting the same verse must re-trigger, like `clearSelectionSignal`. */
    seq: number;
  }>;

function paintFocus(container: HTMLElement, verses: readonly number[]): void {
  container.setAttribute('data-yv-verse-focus', '');
  const wanted = new Set(verses);
  container.querySelectorAll('.yv-v[v]').forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
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

function prefersReducedMotion(): boolean {
  return Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

function overflowAncestor(start: HTMLElement): HTMLElement {
  let node: HTMLElement | null = start;
  while (node !== null) {
    const overflowY = globalThis.getComputedStyle(node).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return node;
    }
    node = node.parentElement;
  }
  return document.documentElement;
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
    const reference = request.showsFullChapter
      ? `${request.book}.${request.chapter}`
      : request.passageId;
    if (renderedReference !== reference) {
      return;
    }

    const verses = request.verses;
    const first = verses[0];
    const target = container.querySelector(`.yv-v[v="${String(first)}"]`);
    const scroller = overflowAncestor(container);
    const scrollEvents = scroller === document.documentElement ? document : scroller;
    let waiting = false;
    let cleared = false;
    let settle: ReturnType<typeof setTimeout> | undefined;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const clear = (): void => {
      cleared = true;
      waiting = false;
      globalThis.clearTimeout(settle);
      globalThis.clearTimeout(fallback);
      clearFocusPaint(container);
    };
    const landed = (): void => {
      handledSeq.current = request.seq;
      waiting = false;
      globalThis.clearTimeout(settle);
      globalThis.clearTimeout(fallback);
      if (cleared || !request.shouldFocus || verses.length === 0) return;
      paintFocus(container, verses);
      if (target instanceof HTMLElement) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    };
    const onScroll = (): void => {
      if (!waiting) return;
      globalThis.clearTimeout(settle);
      settle = globalThis.setTimeout(landed, 100);
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
    const frame = globalThis.requestAnimationFrame(() => {
      if (cleared) return;
      if (!request.scrollsToVerse) {
        landed();
        return;
      }
      const reducedMotion = prefersReducedMotion();
      waiting = true;
      const destination =
        request.showsFullChapter && target instanceof HTMLElement ? target : container;
      destination.scrollIntoView({
        block: request.showsFullChapter && target instanceof HTMLElement ? 'center' : 'start',
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
      if (reducedMotion) {
        landed();
        return;
      }
      // scrollend is not universal, and a no-op scroll emits no events.
      settle = globalThis.setTimeout(landed, 100);
      fallback = globalThis.setTimeout(landed, 2000);
    });

    return () => {
      globalThis.cancelAnimationFrame(frame);
      scrollEvents.removeEventListener('scroll', onScroll);
      scrollEvents.removeEventListener('scrollend', onScrollEnd);
      for (const event of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
        scroller.removeEventListener(event, onInteract);
      }
      clear();
    };
  }, [request, renderedReference, containerRef]);
}
