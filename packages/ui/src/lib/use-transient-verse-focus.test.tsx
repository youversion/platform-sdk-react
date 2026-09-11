/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { type RefObject } from 'react';
import {
  SEARCH_VERSE_FOCUS_HOLD_MS,
  useTransientVerseFocus,
  type VerseFocusRequest,
} from './use-transient-verse-focus';

function renderFocus(
  request: VerseFocusRequest | null,
  renderedReference: string,
  container: HTMLElement,
) {
  const containerRef: RefObject<HTMLElement | null> = { current: container };
  return renderHook(
    (props: { request: VerseFocusRequest | null; renderedReference: string }) =>
      useTransientVerseFocus({
        request: props.request,
        renderedReference: props.renderedReference,
        containerRef,
      }),
    { initialProps: { request, renderedReference } },
  );
}

describe('useTransientVerseFocus', () => {
  let container: HTMLElement;
  let verse: HTMLElement;
  let scrollIntoView: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('section');
    container.setAttribute('data-slot', 'yv-bible-renderer');
    verse = document.createElement('span');
    verse.className = 'yv-v';
    verse.setAttribute('v', '16');
    scrollIntoView = vi.fn();
    verse.scrollIntoView = scrollIntoView;
    container.append(verse);
    document.body.append(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    container.remove();
  });

  it('waits for the destination chapter, then paints, scrolls, and clears after the hold', () => {
    const request: VerseFocusRequest = {
      seq: 1,
      book: 'JHN',
      chapter: '3',
      verses: [16],
    };
    const { result, rerender } = renderFocus(request, 'JHN.1', container);

    expect(result.current.focusedVerses).toEqual([]);
    expect(container.hasAttribute('data-yv-verse-focus')).toBe(false);

    rerender({ request, renderedReference: 'JHN.3' });

    expect(result.current.focusedVerses).toEqual([16]);
    expect(container.getAttribute('data-yv-verse-focus')).toBe('');
    expect(verse.classList.contains('yv-v-focused')).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });

    act(() => {
      vi.advanceTimersByTime(SEARCH_VERSE_FOCUS_HOLD_MS);
    });

    expect(result.current.focusedVerses).toEqual([]);
    expect(container.hasAttribute('data-yv-verse-focus')).toBe(false);
    expect(verse.classList.contains('yv-v-focused')).toBe(false);
  });

  it('re-applies when seq bumps for the same verse', () => {
    const first: VerseFocusRequest = { seq: 1, book: 'JHN', chapter: '3', verses: [16] };
    const { rerender } = renderFocus(first, 'JHN.3', container);

    act(() => {
      vi.advanceTimersByTime(SEARCH_VERSE_FOCUS_HOLD_MS);
    });
    expect(verse.classList.contains('yv-v-focused')).toBe(false);

    rerender({
      request: { seq: 2, book: 'JHN', chapter: '3', verses: [16] },
      renderedReference: 'JHN.3',
    });

    expect(verse.classList.contains('yv-v-focused')).toBe(true);
  });
});
