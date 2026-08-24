/**
 * @vitest-environment jsdom
 *
 * Vapor-flash reproduction (YPE-1034). The existing integration suite only
 * asserts the FINAL rendered map after a remove settles. The reported bug is a
 * TRANSIENT frame: the removed verse disappears (optimistic), REAPPEARS for a
 * split second, then disappears forever. To catch a one-frame regression this
 * suite records EVERY committed render of `highlightedVerses` and asserts the
 * removed verse never reappears at any frame between "remove tapped" and
 * "server truth converges".
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  HighlightsClient,
  YouVersionPlatformConfiguration,
  type Collection,
  type Highlight,
} from '@youversion/platform-core';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HIGHLIGHTS_LIVE, setHighlightsLive } from '@/lib/feature-flags';
import {
  collection,
  deferred,
  mockUserInfo,
  Providers as BaseProviders,
} from '@/test/highlights-test-utils';
import { useBibleReaderHighlights } from './use-bible-reader-highlights';

let signedIn = false;

// Signed-in state flips between rerenders; the wrapper re-reads `signedIn`.
function Providers({ children }: { children: ReactNode }) {
  return <BaseProviders userInfo={signedIn ? mockUserInfo : null}>{children}</BaseProviders>;
}

const defaultOptions = { versionId: 111, book: 'JHN', chapter: '3' };

beforeEach(() => {
  vi.restoreAllMocks();
  signedIn = false;
  setHighlightsLive(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  setHighlightsLive(HIGHLIGHTS_LIVE);
  localStorage.clear();
  sessionStorage.clear();
});

/**
 * Records `highlightedVerses` on EVERY committed render (this testing-library
 * build has no `result.all`). The hook runs inside a real render, so `renderLog`
 * captures the exact frames the DOM would paint.
 */
function mountFlipped(renderLog: Record<number, string>[]) {
  localStorage.clear();
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1', name: 'Test User' });
  YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
  // Bearer token for tests that drive the REAL client via a global.fetch stub.
  // Harmless for tests that spy on HighlightsClient.prototype directly.
  localStorage.setItem('accessToken', 'test-access-token');
  const view = renderHook(
    () => {
      const api = useBibleReaderHighlights(defaultOptions);
      renderLog.push(api.highlightedVerses);
      return api;
    },
    { wrapper: Providers },
  );
  signedIn = true;
  view.rerender();
  return view;
}

describe('vapor flash — removed verse must never reappear at any frame', () => {
  it('stale refetch (read-replica lag still contains the row): no frame repaints verse 16', async () => {
    const getDeferred = deferred<Collection<Highlight>>();
    const getHighlights = vi
      .spyOn(HighlightsClient.prototype, 'getHighlights')
      // mount GET
      .mockResolvedValueOnce(
        collection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
      )
      // post-DELETE refetch: controlled, resolves STALE (still has the row)
      .mockReturnValueOnce(getDeferred.promise);
    const deleteHighlight = vi
      .spyOn(HighlightsClient.prototype, 'deleteHighlight')
      .mockResolvedValue(undefined);

    const renderLog: Record<number, string>[] = [];
    const { result } = mountFlipped(renderLog);
    await waitFor(() => expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' }));

    // The point at which we START watching for a resurrection.
    act(() => {
      result.current.remove('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({});

    const startFrame = renderLog.length;

    // Let the DELETE settle (fires the refetch), then resolve the STALE GET.
    await waitFor(() => expect(deleteHighlight).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getHighlights).toHaveBeenCalledTimes(2));
    await act(async () => {
      getDeferred.resolve(
        collection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
      );
      await Promise.resolve();
    });

    // Inspect EVERY committed frame from the remove onward.
    const frames = renderLog.slice(startFrame);
    const resurrected = frames.filter((f) => f[16] === 'fffe00');
    expect(
      resurrected,
      `verse 16 reappeared in ${resurrected.length} frame(s): ${JSON.stringify(frames)}`,
    ).toEqual([]);
    expect(result.current.highlightedVerses).toEqual({});
  });

  it('fresh refetch (no row): no frame repaints verse 16', async () => {
    const getDeferred = deferred<Collection<Highlight>>();
    vi.spyOn(HighlightsClient.prototype, 'getHighlights')
      .mockResolvedValueOnce(
        collection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
      )
      .mockReturnValueOnce(getDeferred.promise);
    const deleteHighlight = vi
      .spyOn(HighlightsClient.prototype, 'deleteHighlight')
      .mockResolvedValue(undefined);

    const renderLog: Record<number, string>[] = [];
    const { result } = mountFlipped(renderLog);
    await waitFor(() => expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' }));

    act(() => {
      result.current.remove('fffe00', [16]);
    });
    const startFrame = renderLog.length;

    await waitFor(() => expect(deleteHighlight).toHaveBeenCalledTimes(1));
    await act(async () => {
      getDeferred.resolve(collection([]));
      await Promise.resolve();
    });

    const frames = renderLog.slice(startFrame);
    const resurrected = frames.filter((f) => f[16] === 'fffe00');
    expect(resurrected, `verse 16 reappeared: ${JSON.stringify(frames)}`).toEqual([]);
    expect(result.current.highlightedVerses).toEqual({});
  });

  it('END-TO-END through the real client: a successful DELETE returning 200 empty-JSON must not flash the removed verse (live vapor)', async () => {
    // The actual live mechanism, exercised through the REAL HighlightsClient +
    // ApiClient (only global.fetch is stubbed). The server DELETES the row and
    // returns `200 application/json` with an EMPTY body. Before the core fix,
    // `response.json()` threw on that empty body, so `deleteHighlight` rejected
    // on a real success → settleWrite reverted the optimistic removal → the
    // verse repainted from raw server truth until the refetch, then vanished.
    // With the fix the DELETE resolves, the overlay holds, and no frame flashes.
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    // (mountFlipped seeds the bearer token the real client reads from localStorage.)

    // Wire format uses `bible_id` (mapped to `version_id` by the client).
    const wireRow = { bible_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' };
    let deletedOnServer = false;
    const jsonHeaders = { 'content-type': 'application/json' };

    vi.spyOn(global, 'fetch').mockImplementation((input, init) => {
      const url = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
      const method = (init?.method ?? 'GET').toUpperCase();
      if (url.includes('/v1/highlights') && method === 'DELETE') {
        deletedOnServer = true;
        // The bug shape: 200 OK, JSON content-type, EMPTY body.
        return Promise.resolve(new Response('', { status: 200, headers: jsonHeaders }));
      }
      if (url.includes('/v1/highlights') && method === 'GET') {
        const data = deletedOnServer ? [] : [wireRow];
        return Promise.resolve(
          new Response(JSON.stringify({ data, next_page_token: null }), {
            status: 200,
            headers: jsonHeaders,
          }),
        );
      }
      return Promise.resolve(new Response('{}', { status: 200, headers: jsonHeaders }));
    });

    const renderLog: Record<number, string>[] = [];
    const { result } = mountFlipped(renderLog);
    await waitFor(() => expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' }));

    act(() => {
      result.current.remove('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({});
    const startFrame = renderLog.length;

    await waitFor(() => expect(deletedOnServer).toBe(true));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const frames = renderLog.slice(startFrame);
    const resurrected = frames.filter((f) => f[16] === 'fffe00');
    expect(
      resurrected,
      `verse 16 resurrected in ${resurrected.length} frame(s): ${JSON.stringify(frames)}`,
    ).toEqual([]);
    expect(result.current.highlightedVerses).toEqual({});
  });

  it('out-of-order fetches through real useApiData: fresh reflects removal, then a NEWER refetch returns a stale replica row — no resurrection', async () => {
    // The one real-world path to deliver fresh→stale to the machine through
    // useApiData's requestSeq guard: two refetches where the SECOND (newer)
    // request hits a lagging replica. Refetch #1 (settle of the remove) reflects
    // the removal; refetch #2 (settle of a later apply on verse 20) is stale and
    // still carries verse 16. The held remove overlay must win.
    const getHighlights = vi
      .spyOn(HighlightsClient.prototype, 'getHighlights')
      // mount
      .mockResolvedValueOnce(
        collection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
      )
      // refetch #1: fresh, reflects the DELETE of 16
      .mockResolvedValueOnce(collection([]))
      // refetch #2: STALE replica — verse 16 is back (plus the just-applied 20)
      .mockResolvedValue(
        collection([
          { version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' },
          { version_id: 111, passage_id: 'JHN.3.20', color: '5dff79' },
        ]),
      );
    vi.spyOn(HighlightsClient.prototype, 'deleteHighlight').mockResolvedValue(undefined);
    vi.spyOn(HighlightsClient.prototype, 'createHighlight').mockResolvedValue({
      version_id: 111,
      passage_id: 'JHN.3.20',
      color: '5dff79',
    });

    const renderLog: Record<number, string>[] = [];
    const { result } = mountFlipped(renderLog);
    await waitFor(() => expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' }));

    act(() => {
      result.current.remove('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({});
    const startFrame = renderLog.length;

    // Refetch #1 lands (fresh).
    await waitFor(() => expect(getHighlights).toHaveBeenCalledTimes(2));
    await act(async () => {
      await Promise.resolve();
    });

    // A later apply on verse 20 fires refetch #2, which returns the stale replica.
    act(() => {
      result.current.apply('5dff79', [20]);
    });
    await waitFor(() => expect(getHighlights).toHaveBeenCalledTimes(3));
    await act(async () => {
      await Promise.resolve();
    });

    const frames = renderLog.slice(startFrame);
    const resurrected = frames.filter((f) => f[16] === 'fffe00');
    expect(
      resurrected,
      `verse 16 resurrected in ${resurrected.length} frame(s): ${JSON.stringify(frames)}`,
    ).toEqual([]);
    // Verse 20 (freshly applied) is legitimately present; verse 16 must be gone.
    expect(result.current.highlightedVerses[16]).toBeUndefined();
  });
});
