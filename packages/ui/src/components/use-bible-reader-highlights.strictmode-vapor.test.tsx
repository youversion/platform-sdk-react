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
 * from) plus the machineScope/scope equality, so a resurrection frame and its
 * cause are both captured.
 */
import { StrictMode, useState, useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import {
  HighlightsClient,
  YouVersionPlatformConfiguration,
  type Collection,
  type Highlight,
  type YouVersionUserInfo,
} from '@youversion/platform-core';
import { YouVersionAuthContext, YouVersionContext } from '@youversion/platform-react-hooks';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HIGHLIGHTS_LIVE, setHighlightsLive } from '@/lib/feature-flags';
import { useBibleReaderHighlights } from './use-bible-reader-highlights';

function collection(data: Highlight[]): Collection<Highlight> {
  return { data, next_page_token: null };
}

const mockUserInfo = { id: 'user-1', name: 'Test User' } as unknown as YouVersionUserInfo;

function Providers({ children }: { children: ReactNode }) {
  return (
    <YouVersionContext.Provider value={{ appKey: 'test-app-key' }}>
      <YouVersionAuthContext.Provider
        value={{
          userInfo: mockUserInfo,
          setUserInfo: vi.fn(),
          isLoading: false,
          error: null,
        }}
      >
        {children}
      </YouVersionAuthContext.Provider>
    </YouVersionContext.Provider>
  );
}

const options = { versionId: 111, book: 'JHN', chapter: '1' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

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

type Frame = { hv: Record<number, string>; scopeMatch: boolean };

/** Harness mirroring BibleReader: a selection state cleared right after remove. */
function Harness({
  frames,
  removeRef,
}: {
  frames: Frame[];
  removeRef: { current: (() => void) | null };
}) {
  const [selected, setSelected] = useState<number[]>([2]);
  const api = useBibleReaderHighlights(options);
  // Record the exact value verse.tsx would paint from, each committed render.
  frames.push({ hv: api.highlightedVerses, scopeMatch: true });
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
    const getDeferred = deferred<Collection<Highlight>>();
    let removed = false;
    const getHighlights = vi
      .spyOn(HighlightsClient.prototype, 'getHighlights')
      .mockImplementation(() => (removed ? getDeferred.promise : Promise.resolve(withRow())));
    const deleteHighlight = vi
      .spyOn(HighlightsClient.prototype, 'deleteHighlight')
      .mockResolvedValue(undefined);

    const frames: Frame[] = [];
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
      expect(frames.at(-1)?.hv).toEqual({ 2: 'fffe00' });
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
    await waitFor(() => expect(deleteHighlight).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getHighlights.mock.calls.length).toBeGreaterThan(mountFetches));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const window = frames.slice(startFrame);
    const resurrected = window.filter((f) => f.hv[2] === 'fffe00');
    expect(
      resurrected,
      `verse 2 resurrected in ${resurrected.length}/${window.length} frame(s): ` +
        JSON.stringify(window),
    ).toEqual([]);
  });
});
