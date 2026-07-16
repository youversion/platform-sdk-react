/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Collection, Highlight } from '@youversion/platform-core';
import { useHighlights, YouVersionAuthContext } from '@youversion/platform-react-hooks';
import {
  YouVersionPlatformConfiguration,
  type YouVersionUserInfo,
} from '@youversion/platform-core';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HIGHLIGHTS_LIVE, setHighlightsLive } from '@/lib/feature-flags';
import { useBibleReaderHighlights } from './use-bible-reader-highlights';

vi.mock('@youversion/platform-react-hooks', async () => {
  const actual = await vi.importActual('@youversion/platform-react-hooks');
  return {
    ...actual,
    useHighlights: vi.fn(),
  };
});

const mockUserInfo = { id: 'user-1', name: 'Test User' } as unknown as YouVersionUserInfo;

function makeCollection(data: Highlight[]): Collection<Highlight> {
  return { data, next_page_token: null };
}

function mockUseHighlights(
  overrides: Partial<ReturnType<typeof useHighlights>> = {},
): ReturnType<typeof useHighlights> {
  const value: ReturnType<typeof useHighlights> = {
    highlights: makeCollection([]),
    loading: false,
    error: null,
    refetch: vi.fn(),
    createHighlight: vi.fn().mockResolvedValue({
      version_id: 111,
      passage_id: 'JHN.3.16',
      color: 'fffe00',
    }),
    deleteHighlight: vi.fn().mockResolvedValue(undefined),
    getRecentColors: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  vi.mocked(useHighlights).mockReturnValue(value);
  return value;
}

/**
 * Auth wrapper whose signed-in state can be flipped between rerenders (the
 * wrapper re-runs on `rerender()`, picking up the new value).
 */
let signedIn = true;
function AuthWrapper({ children }: { children: ReactNode }) {
  return (
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
  );
}

const defaultOptions = { versionId: 111, book: 'JHN', chapter: '3' };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  signedIn = true;
  setHighlightsLive(true);
  // The permission cache is user-scoped, so it only takes effect once a matching
  // userInfo is persisted (the auth provider does this at sign-in). Seed both so
  // the authorized-write path is exercised. The auth-flow branches (missing
  // session/permission) have their own dedicated coverage.
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1', name: 'Test User' });
  YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
});

afterEach(() => {
  setHighlightsLive(HIGHLIGHTS_LIVE);
  localStorage.clear();
  sessionStorage.clear();
});

describe('useBibleReaderHighlights — flag off (dark launch)', () => {
  it('is fully inert: fetch disabled, empty map, writes are no-ops', () => {
    setHighlightsLive(false);
    const mocked = mockUseHighlights({
      highlights: makeCollection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
    });

    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    // The fetch gate is `enabled: false` — useApiData skips the request entirely.
    expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
      { version_id: 111, passage_id: 'JHN.3' },
      { enabled: false },
    );
    // Even stale fetched data must not render while the flag is off.
    expect(result.current.highlightedVerses).toEqual({});

    act(() => {
      result.current.apply('fffe00', [16, 17]);
      result.current.remove('fffe00', [16]);
    });
    expect(mocked.createHighlight).not.toHaveBeenCalled();
    expect(mocked.deleteHighlight).not.toHaveBeenCalled();
    expect(result.current.highlightedVerses).toEqual({});
  });
});

describe('useBibleReaderHighlights — auth guarding', () => {
  it('renders without crashing when no auth provider is mounted, treated as signed out', () => {
    const mocked = mockUseHighlights();

    // No wrapper: YouVersionAuthContext is null (useYVAuth would throw here).
    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions));

    expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
      { version_id: 111, passage_id: 'JHN.3' },
      { enabled: false },
    );
    expect(result.current.highlightedVerses).toEqual({});

    act(() => {
      result.current.apply('fffe00', [16]);
    });
    expect(mocked.createHighlight).not.toHaveBeenCalled();
  });

  it('is non-interactive with no auth provider, even with the flag on (inert color row)', () => {
    mockUseHighlights();

    // Flag on but no auth provider: the machine is disabled, so a color tap can
    // never do anything. The color-swatch row must not render — this flag is
    // what BibleReader ANDs with the feature flag to hide it.
    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions));
    expect(result.current.highlightsInteractive).toBe(false);
  });

  it('is interactive when an auth provider is mounted (flag on), even signed out', () => {
    mockUseHighlights();
    signedIn = false;

    // Signed out but with an auth provider present: a tap still enters the
    // sign-in flow, so the row stays interactive.
    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });
    expect(result.current.highlightsInteractive).toBe(true);
  });

  it('clears rendered highlights immediately when the user signs out', () => {
    mockUseHighlights({
      highlights: makeCollection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
    });

    const { result, rerender } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    // Sign out: the mock still returns fetched data (like a not-yet-cleared
    // cache would), so this pins the hook's own render gate.
    signedIn = false;
    rerender();
    expect(result.current.highlightedVerses).toEqual({});
  });
});

describe('useBibleReaderHighlights — fetched highlights', () => {
  it('maps per-verse USFMs for the current chapter into the verse map', () => {
    mockUseHighlights({
      highlights: makeCollection([
        { version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' },
        { version_id: 111, passage_id: 'JHN.3.17', color: '5DFF79' }, // uppercase from server
        { version_id: 111, passage_id: 'JHN.4.1', color: '00d6ff' }, // other chapter
        { version_id: 999, passage_id: 'JHN.3.2', color: '00d6ff' }, // other version
      ]),
    });

    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
      { version_id: 111, passage_id: 'JHN.3' },
      { enabled: true },
    );
    expect(result.current.highlightedVerses).toEqual({
      16: 'fffe00',
      17: '5dff79',
    });
  });
});

describe('useBibleReaderHighlights — apply', () => {
  it('applies optimistically and POSTs contiguous runs as range USFMs', async () => {
    const mocked = mockUseHighlights();

    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    act(() => {
      result.current.apply('FFFE00', [16, 17, 18, 20]);
    });

    // Optimistic: rendered before any network round-trip settles.
    expect(result.current.highlightedVerses).toEqual({
      16: 'fffe00',
      17: 'fffe00',
      18: 'fffe00',
      20: 'fffe00',
    });

    await waitFor(() => {
      expect(mocked.createHighlight).toHaveBeenCalledTimes(2);
    });
    expect(mocked.createHighlight).toHaveBeenCalledWith({
      version_id: 111,
      passage_id: 'JHN.3.16-18',
      color: 'fffe00', // lowercased on the wire
    });
    expect(mocked.createHighlight).toHaveBeenCalledWith({
      version_id: 111,
      passage_id: 'JHN.3.20',
      color: 'fffe00',
    });
    // Two POSTs (two runs) but a SINGLE coalesced refetch for the batch (Fix 3).
    expect(mocked.refetch).toHaveBeenCalledTimes(1);
  });

  it('reverts the optimistic overlay and logs when the write fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    const mocked = mockUseHighlights({
      createHighlight: vi.fn().mockRejectedValue(new Error('network down')),
    });

    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    act(() => {
      result.current.apply('fffe00', [16, 17]);
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00', 17: 'fffe00' });

    await waitFor(() => {
      expect(result.current.highlightedVerses).toEqual({});
    });
    expect(mocked.createHighlight).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to apply highlight'),
      expect.objectContaining({ passageId: 'JHN.3.16-17' }),
    );
    consoleError.mockRestore();
  });
});

describe('useBibleReaderHighlights — overlay reconciliation (Fix 2)', () => {
  it('holds the overlay until a fetch REFLECTS the write, then retires it to server truth', async () => {
    const mocked = mockUseHighlights();

    const { result, rerender } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    act(() => {
      result.current.apply('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    // Let the write settle successfully.
    await waitFor(() => {
      expect(mocked.createHighlight).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    // The post-write GET lands but does NOT yet contain the write (read-after-
    // write lag). The overlay must WIN — no flicker out and back.
    mockUseHighlights({ highlights: makeCollection([]) });
    rerender();
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    // A later GET reflects the write (verse present in the written color).
    mockUseHighlights({
      highlights: makeCollection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
    });
    rerender();
    await waitFor(() => {
      expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });
    });

    // Prove the overlay entry was retired: with the entry gone, server truth now
    // drives the verse, so clearing it server-side un-paints it.
    mockUseHighlights({ highlights: makeCollection([]) });
    rerender();
    await waitFor(() => {
      expect(result.current.highlightedVerses).toEqual({});
    });
  });

  it('holds the overlay when the server converges on a DIFFERENT color (overlay wins until navigation)', async () => {
    const mocked = mockUseHighlights();

    const { result, rerender } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    act(() => {
      result.current.apply('fffe00', [16]);
    });
    await waitFor(() => {
      expect(mocked.createHighlight).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    // A GET returns the verse in a color that is NOT what we wrote. That doesn't
    // reflect our write, so the overlay is held rather than snapping to it.
    mockUseHighlights({
      highlights: makeCollection([{ version_id: 111, passage_id: 'JHN.3.16', color: '00d6ff' }]),
    });
    rerender();
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });
  });
});

describe('useBibleReaderHighlights — vapor bug (removed highlight resurrection)', () => {
  // Regression for the staging "vapor" report: a deleted highlight reappears for
  // a split second, then disappears. Root cause: the reconcile step retired a
  // REMOVE overlay entry as soon as any fetch reflected the removal; a later
  // response from a stale read replica that still contained the highlight then
  // had nothing suppressing it, so the verse repainted until the next fetch.
  it('a stale fetch after a settled+reflected DELETE does not resurrect the removed highlight', async () => {
    const mocked = mockUseHighlights({
      highlights: makeCollection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
    });

    const { result, rerender } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    act(() => {
      result.current.remove('fffe00', [16]);
    });
    // Optimistic removal.
    expect(result.current.highlightedVerses).toEqual({});

    await waitFor(() => {
      expect(mocked.deleteHighlight).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Fetch A reflects the removal (server no longer shows the color).
    mockUseHighlights({ highlights: makeCollection([]) });
    rerender();
    expect(result.current.highlightedVerses).toEqual({});

    // Fetch B is a STALE read replica that still contains the removed highlight.
    // The removal overlay must be HELD so the highlight does not resurrect.
    mockUseHighlights({
      highlights: makeCollection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
    });
    rerender();
    expect(result.current.highlightedVerses).toEqual({});

    // Fetch C is consistent again (still removed) — no flicker at any point.
    mockUseHighlights({ highlights: makeCollection([]) });
    rerender();
    expect(result.current.highlightedVerses).toEqual({});
  });
});

describe('useBibleReaderHighlights — remove', () => {
  it('removes optimistically and DELETEs one passage-id per verse (never a range)', async () => {
    const mocked = mockUseHighlights({
      highlights: makeCollection([
        { version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' },
        { version_id: 111, passage_id: 'JHN.3.17', color: 'fffe00' },
        { version_id: 111, passage_id: 'JHN.3.18', color: '5dff79' }, // different color, stays
      ]),
    });

    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    act(() => {
      result.current.remove('fffe00', [16, 17, 18]);
    });

    // Optimistic: yellow verses gone immediately, green untouched.
    expect(result.current.highlightedVerses).toEqual({ 18: '5dff79' });

    // Contiguous [16,17] must NOT collapse to `JHN.3.16-17` — range delete is
    // unsupported server-side (Fix 4). One DELETE per verse instead.
    await waitFor(() => {
      expect(mocked.deleteHighlight).toHaveBeenCalledTimes(2);
    });
    expect(mocked.deleteHighlight).toHaveBeenCalledWith('JHN.3.16', { version_id: 111 });
    expect(mocked.deleteHighlight).toHaveBeenCalledWith('JHN.3.17', { version_id: 111 });
    // The whole removal coalesces into a single refetch (Fix 3).
    expect(mocked.refetch).toHaveBeenCalledTimes(1);
  });

  it('reverts the optimistic removal and logs when the delete fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    mockUseHighlights({
      highlights: makeCollection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
      deleteHighlight: vi.fn().mockRejectedValue(new Error('network down')),
    });

    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    act(() => {
      result.current.remove('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({});

    await waitFor(() => {
      expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });
    });
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to remove highlight'),
      expect.objectContaining({ passageId: 'JHN.3.16' }),
    );
    consoleError.mockRestore();
  });

  it('is a no-op when no selected verse is rendered in the given color', () => {
    const mocked = mockUseHighlights({
      highlights: makeCollection([{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }]),
    });

    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    act(() => {
      result.current.remove('5dff79', [16]);
    });
    expect(mocked.deleteHighlight).not.toHaveBeenCalled();
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });
  });
});

describe('useBibleReaderHighlights — scope changes', () => {
  it('drops the optimistic overlay when the chapter changes', () => {
    const neverSettles = new Promise<never>(vi.fn());
    mockUseHighlights({
      createHighlight: vi.fn().mockReturnValue(neverSettles),
    });

    const { result, rerender } = renderHook(
      (props: { versionId: number; book: string; chapter: string }) =>
        useBibleReaderHighlights(props),
      { wrapper: AuthWrapper, initialProps: defaultOptions },
    );

    act(() => {
      result.current.apply('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    rerender({ versionId: 111, book: 'JHN', chapter: '4' });
    expect(result.current.highlightedVerses).toEqual({});
  });
});
