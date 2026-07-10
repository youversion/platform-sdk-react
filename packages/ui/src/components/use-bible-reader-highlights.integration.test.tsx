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
import { HighlightsClient, type YouVersionUserInfo } from '@youversion/platform-core';
import { YouVersionAuthContext, YouVersionContext } from '@youversion/platform-react-hooks';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HIGHLIGHTS_LIVE, setHighlightsLive } from '@/lib/feature-flags';
import { useBibleReaderHighlights } from './use-bible-reader-highlights';

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
