/**
 * @vitest-environment jsdom
 *
 * Integration coverage for the seam hook through the REAL `useHighlights` and
 * `useApiData` (nothing from the hooks package is module-mocked; only the core
 * client's network method is stubbed). This exists because wholesale-mocking
 * `useHighlights` hid a real bug: `useApiData`'s fetch effect didn't re-run
 * when `enabled` flipped false→true, so a signed-in session resolving after
 * mount never fetched highlights at all.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
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

let signedIn = false;

function Providers({ children }: { children: ReactNode }) {
  return (
    <YouVersionContext.Provider value={{ appKey: 'test-app-key' }}>
      <YouVersionAuthContext.Provider
        value={{
          userInfo: signedIn ? mockUserInfo : null,
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

const defaultOptions = { versionId: 111, book: 'JHN', chapter: '3' };

beforeEach(() => {
  vi.restoreAllMocks();
  signedIn = false;
  setHighlightsLive(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  setHighlightsLive(HIGHLIGHTS_LIVE);
});

describe('useBibleReaderHighlights — real useHighlights/useApiData', () => {
  it('fetches and renders highlights when auth resolves after mount (enabled false→true)', async () => {
    const getHighlights = vi.spyOn(HighlightsClient.prototype, 'getHighlights').mockResolvedValue({
      data: [
        { version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' },
        { version_id: 111, passage_id: 'JHN.3.17', color: '5dff79' },
      ],
      next_page_token: null,
    });

    // Mount signed out — mirrors YouVersionAuthProvider, which initializes
    // userInfo to null and resolves the session asynchronously.
    const { result, rerender } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: Providers,
    });

    expect(getHighlights).not.toHaveBeenCalled();
    expect(result.current.highlightedVerses).toEqual({});

    // The session resolves: only `enabled` flips — no other dep changes.
    signedIn = true;
    rerender();

    await waitFor(() => {
      expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00', 17: '5dff79' });
    });
    expect(getHighlights).toHaveBeenCalledTimes(1);
    expect(getHighlights).toHaveBeenCalledWith({ version_id: 111, passage_id: 'JHN.3' });
  });

  it('un-renders highlights immediately on sign-out and does not refetch', async () => {
    const getHighlights = vi.spyOn(HighlightsClient.prototype, 'getHighlights').mockResolvedValue({
      data: [{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }],
      next_page_token: null,
    });

    signedIn = true;
    const { result, rerender } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: Providers,
    });

    await waitFor(() => {
      expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });
    });

    signedIn = false;
    rerender();

    expect(result.current.highlightedVerses).toEqual({});
    await act(async () => {
      await Promise.resolve();
    });
    expect(getHighlights).toHaveBeenCalledTimes(1);
  });
});

describe('useBibleReaderHighlights — recent colors', () => {
  function stubHighlights() {
    vi.spyOn(HighlightsClient.prototype, 'getHighlights').mockResolvedValue({
      data: [],
      next_page_token: null,
    });
  }

  it('fetches recent colors when auth resolves after mount (signed-out → signed-in flip)', async () => {
    stubHighlights();
    const getRecentColors = vi
      .spyOn(HighlightsClient.prototype, 'getRecentColors')
      .mockResolvedValue(['00d6ff', 'ff0000', '5dff79']);

    // Mount signed out — mirrors YouVersionAuthProvider, which initializes
    // userInfo to null and resolves the session asynchronously. The production
    // edge is always this flip, never a synchronously-signed-in mount.
    const { result, rerender } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: Providers,
    });

    expect(getRecentColors).not.toHaveBeenCalled();
    expect(result.current.recentColors).toBeNull();

    signedIn = true;
    rerender();

    await waitFor(() => {
      expect(result.current.recentColors).toEqual(['00d6ff', 'ff0000', '5dff79']);
    });
    expect(getRecentColors).toHaveBeenCalledTimes(1);
  });

  it('reports null until the fetch resolves, then swaps in the server list', async () => {
    stubHighlights();
    let resolveColors!: (colors: string[]) => void;
    vi.spyOn(HighlightsClient.prototype, 'getRecentColors').mockReturnValue(
      new Promise<string[]>((resolve) => {
        resolveColors = resolve;
      }),
    );

    signedIn = true;
    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: Providers,
    });

    // Pending fetch → null, so the popover renders its default palette meanwhile.
    expect(result.current.recentColors).toBeNull();

    await act(async () => {
      resolveColors(['abcdef']);
      await Promise.resolve();
    });
    expect(result.current.recentColors).toEqual(['abcdef']);
  });

  it('does not fetch and stays null when signed out', async () => {
    stubHighlights();
    const getRecentColors = vi
      .spyOn(HighlightsClient.prototype, 'getRecentColors')
      .mockResolvedValue(['00d6ff']);

    signedIn = false;
    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: Providers,
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.recentColors).toBeNull();
    expect(getRecentColors).not.toHaveBeenCalled();
  });

  it('does not fetch and stays null when the flag is off', async () => {
    setHighlightsLive(false);
    stubHighlights();
    const getRecentColors = vi
      .spyOn(HighlightsClient.prototype, 'getRecentColors')
      .mockResolvedValue(['00d6ff']);

    signedIn = true;
    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: Providers,
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.recentColors).toBeNull();
    expect(getRecentColors).not.toHaveBeenCalled();
  });

  it('falls back to null when the fetch fails (e.g. 403 without permission)', async () => {
    stubHighlights();
    vi.spyOn(HighlightsClient.prototype, 'getRecentColors').mockRejectedValue(
      Object.assign(new Error('HTTP 403'), { status: 403 }),
    );

    signedIn = true;
    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: Providers,
    });

    // Give the rejected promise a tick to settle.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.recentColors).toBeNull();
  });

  it('drops recent colors on sign-out', async () => {
    stubHighlights();
    vi.spyOn(HighlightsClient.prototype, 'getRecentColors').mockResolvedValue(['00d6ff']);

    signedIn = true;
    const { result, rerender } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: Providers,
    });

    await waitFor(() => {
      expect(result.current.recentColors).toEqual(['00d6ff']);
    });

    signedIn = false;
    rerender();
    expect(result.current.recentColors).toBeNull();
  });
});

/**
 * Write-path coverage through the REAL `useHighlights` + `useApiData` chain
 * (only `HighlightsClient.prototype` network methods are spied). Auth is
 * mounted signed OUT and flipped, matching the async session hydration of the
 * shipped provider — never a synchronously-signed-in mount.
 */
describe('useBibleReaderHighlights — write reconciliation (Fix 2/3/4)', () => {
  function mountFlipped() {
    localStorage.clear();
    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
    const view = renderHook(() => useBibleReaderHighlights(defaultOptions), { wrapper: Providers });
    signedIn = true;
    view.rerender();
    return view;
  }

  it('apply: overlay wins when the post-write GET does not yet reflect the write (lag)', async () => {
    // Mount GET and the single post-write refetch both come back empty — the
    // server hasn't caught up to our POST yet (read-after-write lag).
    const getHighlights = vi
      .spyOn(HighlightsClient.prototype, 'getHighlights')
      .mockResolvedValue(collection([]));
    const createHighlight = vi
      .spyOn(HighlightsClient.prototype, 'createHighlight')
      .mockResolvedValue({ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' });

    const { result } = mountFlipped();
    await waitFor(() => expect(getHighlights).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.apply('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    await waitFor(() => expect(createHighlight).toHaveBeenCalledTimes(1));
    // Exactly one coalesced refetch after the write.
    await waitFor(() => expect(getHighlights).toHaveBeenCalledTimes(2));
    // The GET is still empty, but the overlay wins — the highlight stays painted.
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });
  });

  it('apply: once a GET reflects the write, server truth renders', async () => {
    const getHighlights = vi
      .spyOn(HighlightsClient.prototype, 'getHighlights')
      .mockResolvedValueOnce(collection([]))
      .mockResolvedValue(
        collection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
      );
    const createHighlight = vi
      .spyOn(HighlightsClient.prototype, 'createHighlight')
      .mockResolvedValue({ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' });

    const { result } = mountFlipped();
    await waitFor(() => expect(getHighlights).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.apply('fffe00', [16]);
    });
    await waitFor(() => expect(createHighlight).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getHighlights).toHaveBeenCalledTimes(2));

    // The refetch reflects the write; the verse renders (now from server truth).
    await waitFor(() => {
      expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });
    });
  });

  it('remove: overlay wins when the post-delete GET still contains the removed row (lag)', async () => {
    // Server starts with the row and, due to lag, still returns it after DELETE.
    const getHighlights = vi
      .spyOn(HighlightsClient.prototype, 'getHighlights')
      .mockResolvedValue(
        collection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
      );
    const deleteHighlight = vi
      .spyOn(HighlightsClient.prototype, 'deleteHighlight')
      .mockResolvedValue(undefined);

    const { result } = mountFlipped();
    await waitFor(() => expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' }));

    act(() => {
      result.current.remove('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({});

    await waitFor(() =>
      expect(deleteHighlight).toHaveBeenCalledWith('JHN.3.16', { version_id: 111 }),
    );
    await waitFor(() => expect(getHighlights).toHaveBeenCalledTimes(2));
    // The GET still contains the row, but the removal overlay wins — no resurrection.
    expect(result.current.highlightedVerses).toEqual({});
  });

  it('apply: a genuine write failure reverts the optimistic overlay', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.spyOn(HighlightsClient.prototype, 'getHighlights').mockResolvedValue(collection([]));
    vi.spyOn(HighlightsClient.prototype, 'createHighlight').mockRejectedValue(
      new Error('network down'),
    );

    const { result } = mountFlipped();
    await waitFor(() => {
      // wait for the mount fetch to settle
      expect(result.current.highlightedVerses).toEqual({});
    });

    act(() => {
      result.current.apply('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    await waitFor(() => {
      expect(result.current.highlightedVerses).toEqual({});
    });
    consoleError.mockRestore();
  });

  it('apply of [2,3,5] POSTs two runs but issues exactly one refetch (Fix 3)', async () => {
    const getHighlights = vi
      .spyOn(HighlightsClient.prototype, 'getHighlights')
      .mockResolvedValue(collection([]));
    const createHighlight = vi
      .spyOn(HighlightsClient.prototype, 'createHighlight')
      .mockResolvedValue({ version_id: 111, passage_id: 'JHN.3.2', color: 'fffe00' });

    const { result } = mountFlipped();
    await waitFor(() => expect(getHighlights).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.apply('fffe00', [2, 3, 5]);
    });

    await waitFor(() => expect(createHighlight).toHaveBeenCalledTimes(2));
    expect(createHighlight).toHaveBeenCalledWith({
      version_id: 111,
      passage_id: 'JHN.3.2-3',
      color: 'fffe00',
    });
    expect(createHighlight).toHaveBeenCalledWith({
      version_id: 111,
      passage_id: 'JHN.3.5',
      color: 'fffe00',
    });

    // One refetch for the whole batch → 2 GETs total (mount + 1).
    await waitFor(() => expect(getHighlights).toHaveBeenCalledTimes(2));
    await act(async () => {
      await Promise.resolve();
    });
    expect(getHighlights).toHaveBeenCalledTimes(2);
  });

  it('remove of a contiguous [2,3] issues per-verse DELETEs and one refetch (Fix 4 + 3)', async () => {
    const getHighlights = vi.spyOn(HighlightsClient.prototype, 'getHighlights').mockResolvedValue(
      collection([
        { version_id: 111, passage_id: 'JHN.3.2', color: 'fffe00' },
        { version_id: 111, passage_id: 'JHN.3.3', color: 'fffe00' },
      ]),
    );
    const deleteHighlight = vi
      .spyOn(HighlightsClient.prototype, 'deleteHighlight')
      .mockResolvedValue(undefined);

    const { result } = mountFlipped();
    await waitFor(() =>
      expect(result.current.highlightedVerses).toEqual({ 2: 'fffe00', 3: 'fffe00' }),
    );

    act(() => {
      result.current.remove('fffe00', [2, 3]);
    });

    await waitFor(() => expect(deleteHighlight).toHaveBeenCalledTimes(2));
    // Per-verse passage ids, NOT the range `JHN.3.2-3`.
    expect(deleteHighlight).toHaveBeenCalledWith('JHN.3.2', { version_id: 111 });
    expect(deleteHighlight).toHaveBeenCalledWith('JHN.3.3', { version_id: 111 });

    // One coalesced refetch for the whole removal → 2 GETs total (mount + 1).
    await waitFor(() => expect(getHighlights).toHaveBeenCalledTimes(2));
    await act(async () => {
      await Promise.resolve();
    });
    expect(getHighlights).toHaveBeenCalledTimes(2);
  });
});
