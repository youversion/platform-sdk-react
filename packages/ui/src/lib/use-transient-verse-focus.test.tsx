import { renderHook, act } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { StrictMode } from 'react';
import { useTransientVerseFocus, type VerseFocusRequest } from './use-transient-verse-focus';

function setup() {
  const scroller = document.createElement('div');
  scroller.style.overflowY = 'auto';
  const container = document.createElement('section');
  container.innerHTML =
    '<span class="yv-v" v="16"></span><span class="yv-v" v="17"></span><span class="yv-v" v="18"></span>';
  const verse = container.querySelector<HTMLElement>('[v="16"]')!;
  const scrollIntoView = vi.fn();
  verse.scrollIntoView = scrollIntoView;
  scroller.append(container);
  document.body.append(scroller);
  const request: VerseFocusRequest = {
    seq: 1,
    book: 'JHN',
    chapter: '3',
    verses: [16, 17],
    versionId: 111,
    passageId: 'JHN.3.16-17',
    showsFullChapter: true,
    scrollsToVerse: true,
    shouldFocus: true,
  };
  const containerRef = { current: container };
  const hook = renderHook(
    (props: { request: VerseFocusRequest; renderedReference: string }) =>
      useTransientVerseFocus({ ...props, containerRef }),
    { initialProps: { request, renderedReference: 'JHN.1' }, wrapper: StrictMode },
  );
  return {
    ...hook,
    scroller,
    container,
    verse,
    request,
    scrollIntoView,
    dispose() {
      hook.unmount();
      scroller.remove();
    },
  };
}

it('waits for layout and scroll completion, then holds the range until user input', () => {
  vi.useFakeTimers();
  const view = setup();
  try {
    expect(view.scrollIntoView).not.toHaveBeenCalled();
    view.rerender({ request: view.request, renderedReference: 'JHN.3' });
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(view.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
    for (let frame = 0; frame < 20; frame += 1) {
      act(() => {
        view.scroller.dispatchEvent(new Event('scroll'));
        vi.advanceTimersByTime(16);
      });
      expect(view.container).not.toHaveAttribute('data-yv-verse-focus');
    }
    act(() => {
      view.scroller.dispatchEvent(new Event('scrollend'));
    });
    expect(
      [...view.container.querySelectorAll('.yv-v-focused')].map((node) => node.getAttribute('v')),
    ).toEqual(['16', '17']);
    expect(view.verse).toHaveFocus();
    act(() => {
      view.scroller.dispatchEvent(new Event('scroll'));
    });
    expect(view.verse).toHaveClass('yv-v-focused');
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(view.container).toHaveAttribute('data-yv-verse-focus');

    view.rerender({
      request: { ...view.request, seq: 2, scrollsToVerse: false },
      renderedReference: 'JHN.3',
    });
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(view.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(view.verse).toHaveClass('yv-v-focused');
    act(() => {
      view.scroller.dispatchEvent(new Event('wheel'));
    });
    expect(view.container).not.toHaveAttribute('data-yv-verse-focus');
  } finally {
    view.dispose();
    vi.useRealTimers();
  }
});

it('cancels pending focus on user interaction and superseding requests, with a no-event scroll fallback', () => {
  vi.useFakeTimers();
  const view = setup();
  try {
    view.rerender({ request: view.request, renderedReference: 'JHN.3' });
    act(() => {
      vi.advanceTimersByTime(16);
      view.scroller.dispatchEvent(new Event('touchstart'));
      vi.advanceTimersByTime(2000);
    });
    expect(view.container).not.toHaveAttribute('data-yv-verse-focus');
    view.rerender({ request: { ...view.request, seq: 2 }, renderedReference: 'JHN.3' });
    act(() => {
      vi.advanceTimersByTime(16);
    });
    view.rerender({
      request: { ...view.request, seq: 3, verses: [18] },
      renderedReference: 'JHN.3',
    });
    view.container.querySelector<HTMLElement>('[v="18"]')!.scrollIntoView = vi.fn();
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(view.verse).not.toHaveClass('yv-v-focused');
    expect(view.container.querySelector('[v="18"]')).toHaveClass('yv-v-focused');
    expect(view.container.querySelector('[v="18"]')).toHaveFocus();
  } finally {
    view.dispose();
    vi.useRealTimers();
  }
});

it('honors reduced motion and never focuses ordinary navigation', () => {
  vi.useFakeTimers();
  const original = globalThis.matchMedia;
  // SAFETY: prefersReducedMotion only reads matches from this query result.
  globalThis.matchMedia = () => ({ matches: true }) as MediaQueryList;
  const view = setup();
  try {
    view.rerender({ request: view.request, renderedReference: 'JHN.3' });
    act(() => {
      vi.advanceTimersByTime(16);
    });
    expect(view.scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
    expect(view.verse).toHaveClass('yv-v-focused');
    view.rerender({
      request: { ...view.request, seq: 2, shouldFocus: false },
      renderedReference: 'JHN.3',
    });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(view.container).not.toHaveAttribute('data-yv-verse-focus');
  } finally {
    view.dispose();
    globalThis.matchMedia = original;
    vi.useRealTimers();
  }
});
