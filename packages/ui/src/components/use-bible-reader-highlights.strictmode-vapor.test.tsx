/**
 * @vitest-environment jsdom
 *
 * Faithful reproduction of the LIVE vapor flash reported by the coordinator:
 * a SERVER-TRUTH highlight (fresh page load, no in-session apply) that, when
 * removed, disappears optimistically, REAPPEARS at DELETE-settle time (before
 * any refetch response), then disappears when the refetch lands.
 *
 * Ingredients that distinguish this from the earlier passing suites:
 *   1. React.StrictMode (double-invoked effects / actor lifecycle).
 *   2. A parent `selectedVerses` state cleared right after the remove
 *      (the popover close → selection-clear re-render).
 *   3. The refetch held UNRESOLVED to widen the settle→response window.
 *   4. Source is initial-fetch server truth, never an in-session apply.
 *
 * We record every committed `highlightedVerses` (the value verse.tsx paints
 * from), so a resurrection frame is captured.
 */
import { StrictMode, useState, useEffect } from 'react';
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

const options = { versionId: 111, book: 'JHN', chapter: '1' };

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setHighlightsLive(true);
  // Signed-in-from-first-render: server truth arrives via the initial fetch.
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1', name: 'Test User' });
  YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
});

afterEach(() => {
  vi.restoreAllMocks();
  setHighlightsLive(HIGHLIGHTS_LIVE);
  localStorage.clear();
  sessionStorage.clear();
});

/** Harness mirroring BibleReader: a selection state cleared right after remove. */
function Harness({
  frames,
  removeRef,
}: {
  frames: Record<number, string>[];
  removeRef: { current: (() => void) | null };
}) {
  const [selected, setSelected] = useState<number[]>([2]);
  const api = useBibleReaderHighlights(options);
  // Record the exact value verse.tsx would paint from, each committed render.
  frames.push(api.highlightedVerses);
  // Expose the popover "remove" action: remove + close/clear selection, exactly
  // as BibleReader.handleClearHighlight → closeAndClearSelection does.
  useEffect(() => {
    removeRef.current = () => {
      api.remove('fffe00', selected);
      setSelected([]);
    };
  });
  return <div data-selected={selected.join(',')} />;
}

describe('vapor flash — StrictMode + server-truth remove + selection-clear + held refetch', () => {
  it('never repaints verse 2 between remove-click and the (held) refetch response', async () => {
    // StrictMode double-mounts → the mount fires TWO fetches; only the
    // POST-remove refetch is the one we hold. Phase-gate the mock so every
    // mount fetch resolves server truth (verse 2) and the settle refetch stays
    // unresolved to widen the settle→response window the live repaint lives in.
    const withRow = () => collection([{ version_id: 111, passage_id: 'JHN.1.2', color: 'fffe00' }]);
    // The post-remove refetch is held unresolved to widen the settle→response
    // window the live repaint lives in; it never settles.
    const heldRefetch = new Promise<Collection<Highlight>>(vi.fn());
    let removed = false;
    const getHighlights = vi
      .spyOn(HighlightsClient.prototype, 'getHighlights')
      .mockImplementation(() => (removed ? heldRefetch : Promise.resolve(withRow())));
    const deleteHighlight = vi
      .spyOn(HighlightsClient.prototype, 'deleteHighlight')
      .mockResolvedValue(undefined);

    const frames: Record<number, string>[] = [];
    const removeRef: { current: (() => void) | null } = { current: null };

    render(
      <StrictMode>
        <Providers>
          <Harness frames={frames} removeRef={removeRef} />
        </Providers>
      </StrictMode>,
    );

    // Wait for server truth to render verse 2 highlighted.
    await waitFor(() => {
      expect(frames.at(-1)).toEqual({ 2: 'fffe00' });
    });
    const mountFetches = getHighlights.mock.calls.length;

    const startFrame = frames.length;

    // Tap the remove checkmark → optimistic unpaint + selection clear.
    act(() => {
      removed = true;
      removeRef.current?.();
    });

    // Let the DELETE settle (fires the held refetch) and flush microtasks —
    // this is the window the live repro repaints in (before any GET response).
    // These two waits are synchronization gates, not the assertions under test;
    // the uncontrolled REMOVE → xstate → deleteHighlight path can be starved past
    // the default 1s window on a loaded CI runner, so give the gates headroom.
    await waitFor(() => expect(deleteHighlight).toHaveBeenCalledTimes(1), { timeout: 5000 });
    await waitFor(() => expect(getHighlights.mock.calls.length).toBeGreaterThan(mountFetches), {
      timeout: 5000,
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const window = frames.slice(startFrame);
    const resurrected = window.filter((f) => f[2] === 'fffe00');
    expect(
      resurrected,
      `verse 2 resurrected in ${resurrected.length}/${window.length} frame(s): ` +
        JSON.stringify(window),
    ).toEqual([]);
  });
});
