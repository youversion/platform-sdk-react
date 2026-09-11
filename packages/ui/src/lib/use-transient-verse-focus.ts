import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

export const SEARCH_VERSE_FOCUS_HOLD_MS = 1500;

export type VerseFocusRequest = Readonly<{
  /** Monotonic. Re-selecting the same verse must re-trigger, like `clearSelectionSignal`. */
  seq: number;
  book: string;
  chapter: string;
  verses: readonly number[];
}>;

export type TransientVerseFocus = Readonly<{
  focusedVerses: readonly number[];
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

/**
 * Holds a focus request until `renderedReference` equals
 * `${request.book}.${request.chapter}`, then scrolls, paints, and starts the
 * hold. A newer `seq` cancels the pending timer. Paint adds `yv-v-focused` to
 * `.yv-v[v="N"]` and `data-yv-verse-focus` to the renderer root.
 */
export function useTransientVerseFocus(args: {
  readonly request: VerseFocusRequest | null;
  readonly renderedReference: string;
  readonly containerRef: RefObject<HTMLElement | null>;
}): TransientVerseFocus {
  const { request, renderedReference, containerRef } = args;
  const [focusedVerses, setFocusedVerses] = useState<readonly number[]>([]);
  const appliedSeqRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (request === null || container === null) {
      return;
    }
    if (appliedSeqRef.current === request.seq) {
      return;
    }
    if (renderedReference !== `${request.book}.${request.chapter}`) {
      return;
    }

    appliedSeqRef.current = request.seq;

    const verses = request.verses;
    if (verses.length === 0) {
      return;
    }

    const first = verses[0];
    const target = container.querySelector(`.yv-v[v="${String(first)}"]`);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({
        block: 'center',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
    paintFocus(container, verses);
    setFocusedVerses(verses);

    let cleared = false;
    const clear = (): void => {
      if (cleared) return;
      cleared = true;
      clearFocusPaint(container);
      setFocusedVerses([]);
    };

    const hold = globalThis.setTimeout(clear, SEARCH_VERSE_FOCUS_HOLD_MS);
    const onInteract = (): void => {
      clear();
    };
    const attachId = globalThis.requestAnimationFrame(() => {
      container.addEventListener('pointerdown', onInteract);
      container.addEventListener('keydown', onInteract);
      container.addEventListener('scroll', onInteract, true);
    });

    return () => {
      globalThis.clearTimeout(hold);
      globalThis.cancelAnimationFrame(attachId);
      container.removeEventListener('pointerdown', onInteract);
      container.removeEventListener('keydown', onInteract);
      container.removeEventListener('scroll', onInteract, true);
      if (!cleared) {
        clearFocusPaint(container);
      }
    };
  }, [request, renderedReference, containerRef]);

  return { focusedVerses };
}
