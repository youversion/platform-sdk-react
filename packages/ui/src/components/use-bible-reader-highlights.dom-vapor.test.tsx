/**
 * @vitest-environment jsdom
 *
 * DOM-level reproduction of the live vapor flash, mirroring the coordinator's
 * MutationObserver instrumentation on the verse wrapper's `style` attribute.
 * The earlier suites assert the hook's `highlightedVerses` output; this one
 * renders the REAL `Verse.Html` (whose `useLayoutEffect` imperatively paints
 * `backgroundColor` on `.yv-v[v]`) driven by the REAL adapter, and records every
 * background-color mutation. A one-frame resurrection that only shows up as an
 * imperative repaint — not in the hook's returned map — is caught here.
 */
import { StrictMode, useEffect, useState } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import {
  HighlightsClient,
  YouVersionPlatformConfiguration,
  type Collection,
  type Highlight,
} from '@youversion/platform-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HIGHLIGHTS_LIVE, setHighlightsLive } from '@/lib/feature-flags';
import { collection, Providers } from '@/test/highlights-test-utils';
import { useBibleReaderHighlights } from './use-bible-reader-highlights';
import { Verse } from './verse';

const options = { versionId: 111, book: 'JHN', chapter: '1' };
const CHAPTER_HTML =
  '<p class="yv-p"><span class="yv-v" v="2"><sup class="yv-vlbl">2</sup>' +
  '<span class="yv-txt">In the beginning was the Word.</span></span></p>';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setHighlightsLive(true);
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1', name: 'Test User' });
  YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
});

afterEach(() => {
  vi.restoreAllMocks();
  setHighlightsLive(HIGHLIGHTS_LIVE);
  localStorage.clear();
  sessionStorage.clear();
});

function Reader({ removeRef }: { removeRef: { current: (() => void) | null } }) {
  const [selected, setSelected] = useState<number[]>([2]);
  const api = useBibleReaderHighlights(options);
  useEffect(() => {
    removeRef.current = () => {
      api.remove('fffe00', selected);
      // Popover close → selection clear on a SEPARATE tick (Radix close), so the
      // clear re-render lands after the optimistic overlay commit — modeling the
      // real reader rather than a single batched update.
      setTimeout(() => setSelected([]), 0);
    };
  });
  return (
    <Verse.Html
      html={CHAPTER_HTML}
      selectedVerses={selected}
      highlightedVerses={api.highlightedVerses}
      onVerseSelect={() => undefined}
    />
  );
}

describe('vapor flash — real Verse.Html DOM paint (MutationObserver on style)', () => {
  it('the verse-2 background is never repainted to yellow after the optimistic unpaint', async () => {
    const withRow = () => collection([{ version_id: 111, passage_id: 'JHN.1.2', color: 'fffe00' }]);
    // The post-remove refetch is held unresolved to widen the settle→response
    // window the live flash lives in; it never settles.
    const heldRefetch = new Promise<Collection<Highlight>>(vi.fn());
    let removed = false;
    const getHighlights = vi
      .spyOn(HighlightsClient.prototype, 'getHighlights')
      .mockImplementation(() => (removed ? heldRefetch : Promise.resolve(withRow())));
    const deleteHighlight = vi
      .spyOn(HighlightsClient.prototype, 'deleteHighlight')
      // Real network gap: settle lands on a macrotask, well after the optimistic
      // render commits and paints — the window the live flash lives in.
      .mockImplementation(() => new Promise<void>((r) => setTimeout(r, 5)));

    const removeRef: { current: (() => void) | null } = { current: null };
    const { container } = render(
      <StrictMode>
        <Providers>
          <Reader removeRef={removeRef} />
        </Providers>
      </StrictMode>,
    );

    const verseEl = () => container.querySelector<HTMLElement>('.yv-v[v="2"]');
    // Wait until server truth has painted verse 2 yellow.
    await waitFor(() => {
      const bg = verseEl()?.style.backgroundColor ?? '';
      expect(bg).not.toBe('');
    });
    const mountFetches = getHighlights.mock.calls.length;

    // Instrument: record every background-color the verse-2 wrapper takes on
    // from here (after the optimistic unpaint we expect it to stay transparent).
    const paints: string[] = [];
    const el = verseEl()!;
    const observer = new MutationObserver(() => {
      paints.push(el.style.backgroundColor);
    });
    observer.observe(el, { attributes: true, attributeFilter: ['style'] });

    act(() => {
      removed = true;
      removeRef.current?.();
    });

    // These two waits are synchronization gates, not the assertions under test
    // (that's the paint-ordering check below). The uncontrolled REMOVE → xstate
    // transition → deleteHighlight invocation can be starved past the default
    // 1s window on a loaded CI runner, so give the gates explicit headroom.
    await waitFor(() => expect(deleteHighlight).toHaveBeenCalledTimes(1), { timeout: 5000 });
    await waitFor(() => expect(getHighlights.mock.calls.length).toBeGreaterThan(mountFetches), {
      timeout: 5000,
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    observer.disconnect();

    // The first mutation must be the optimistic unpaint (→ ''); no later mutation
    // may bring yellow back while the refetch is still in flight.
    const yellowAfterUnpaint = paints.filter((bg) => bg !== '');
    expect(
      yellowAfterUnpaint,
      `verse 2 repainted non-transparent after removal: ${JSON.stringify(paints)}`,
    ).toEqual([]);
    // Final DOM state: transparent.
    expect(verseEl()?.style.backgroundColor).toBe('');
  });
});
