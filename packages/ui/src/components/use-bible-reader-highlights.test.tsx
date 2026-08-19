/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Collection, Highlight } from '@youversion/platform-core';
import { YouVersionAuthContext, type UseHighlightsResult } from '@youversion/platform-react-hooks';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HIGHLIGHTS_LIVE, setHighlightsLive } from '@/lib/feature-flags';
import { HookOverrideProvider } from '@/test/hook-overrides';
import { mockUserInfo } from '@/test/highlights-test-utils';
import { useBibleReaderHighlights } from './use-bible-reader-highlights';

function makeCollection(data: Highlight[]): Collection<Highlight> {
  return { data, next_page_token: null };
}

function defaultHighlightsResult(): UseHighlightsResult {
  return {
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
  };
}

let highlightsResult: UseHighlightsResult = defaultHighlightsResult();
const useHighlightsOverride = vi.fn(() => highlightsResult);

function mockUseHighlights(overrides: Partial<UseHighlightsResult> = {}): UseHighlightsResult {
  highlightsResult = { ...defaultHighlightsResult(), ...overrides };
  useHighlightsOverride.mockClear();
  useHighlightsOverride.mockImplementation(() => highlightsResult);
  return highlightsResult;
}

/**
 * Auth wrapper whose signed-in state can be flipped between rerenders (the
 * wrapper re-runs on `rerender()`, picking up the new value).
 */
let signedIn = true;
function HighlightsWrapper({ children }: { children: ReactNode }) {
  return (
    <HookOverrideProvider overrides={{ useHighlights: useHighlightsOverride }}>
      {children}
    </HookOverrideProvider>
  );
}

function AuthWrapper({ children }: { children: ReactNode }) {
  return (
    <HighlightsWrapper>
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
    </HighlightsWrapper>
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
    expect(useHighlightsOverride).toHaveBeenCalledWith(
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

    // No auth wrapper: YouVersionAuthContext is null (useYVAuth would throw here).
    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: HighlightsWrapper,
    });

    expect(useHighlightsOverride).toHaveBeenCalledWith(
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
    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: HighlightsWrapper,
    });
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

    expect(useHighlightsOverride).toHaveBeenCalledWith(
      { version_id: 111, passage_id: 'JHN.3' },
      { enabled: true },
    );
    expect(result.current.highlightedVerses).toEqual({
      16: 'fffe00',
      17: '5dff79',
    });
  });

  it('drops invalid hex from the fetched server path (parseServerColors)', () => {
    mockUseHighlights({
      highlights: makeCollection([
        { version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' },
        { version_id: 111, passage_id: 'JHN.3.17', color: 'gggggg' },
        { version_id: 111, passage_id: 'JHN.3.18', color: 'aabbcc' },
      ]),
    });

    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    expect(result.current.highlightedVerses).toEqual({
      16: 'fffe00',
      18: 'aabbcc',
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

  it('rejects non-palette apply colors without writing', () => {
    const mocked = mockUseHighlights();

    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    act(() => {
      expect(result.current.apply('aabbcc', [16])).toBe('noop');
    });

    expect(result.current.highlightedVerses).toEqual({});
    expect(mocked.createHighlight).not.toHaveBeenCalled();
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

  it('clears valid non-palette highlights on the selected verses', async () => {
    const custom = 'aabbcc';
    const mocked = mockUseHighlights({
      highlights: makeCollection([
        { version_id: 111, passage_id: 'JHN.3.16', color: custom },
        { version_id: 111, passage_id: 'JHN.3.17', color: 'fffe00' },
      ]),
    });

    const { result } = renderHook(() => useBibleReaderHighlights(defaultOptions), {
      wrapper: AuthWrapper,
    });

    expect(result.current.highlightedVerses).toEqual({ 16: custom, 17: 'fffe00' });

    act(() => {
      result.current.remove(custom, [16, 17]);
    });

    expect(result.current.highlightedVerses).toEqual({ 17: 'fffe00' });

    await waitFor(() => {
      expect(mocked.deleteHighlight).toHaveBeenCalledTimes(1);
    });
    expect(mocked.deleteHighlight).toHaveBeenCalledWith('JHN.3.16', { version_id: 111 });
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

  it("does not drain the new scope's optimistic overlay when a previous scope's write settles", async () => {
    // Chapter 3's create is deferred so it can settle AFTER we navigate away.
    let resolvePrevWrite: (value: Highlight) => void = vi.fn();
    const prevWrite = new Promise((resolve) => {
      resolvePrevWrite = resolve;
    });
    mockUseHighlights({
      createHighlight: vi.fn().mockReturnValue(prevWrite),
    });

    const { result, rerender } = renderHook(
      (props: { versionId: number; book: string; chapter: string }) =>
        useBibleReaderHighlights(props),
      { wrapper: AuthWrapper, initialProps: defaultOptions },
    );

    // Highlight JHN.3.16 — write is in flight (deferred, has not settled).
    act(() => {
      result.current.apply('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    // Navigate to JHN.4: the overlay resets. Give this chapter its own
    // never-settling write so its optimistic entry survives on its own terms.
    mockUseHighlights({
      createHighlight: vi.fn().mockReturnValue(new Promise<never>(vi.fn())),
    });
    rerender({ versionId: 111, book: 'JHN', chapter: '4' });
    expect(result.current.highlightedVerses).toEqual({});

    // Highlight JHN.4.16 — same verse number, different chapter.
    act(() => {
      result.current.apply('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    // Chapter 3's stale write finally settles. It must NOT enroll verse 16 in
    // the confirmed set, because we have since left its scope.
    await act(async () => {
      resolvePrevWrite({ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' });
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    // A refetch lands for JHN.4 (new `highlights` identity fires the drain
    // effect). A leaked cross-scope confirmation would erase JHN.4.16 here.
    mockUseHighlights({
      createHighlight: vi.fn().mockReturnValue(new Promise<never>(vi.fn())),
      highlights: makeCollection([]),
    });
    rerender({ versionId: 111, book: 'JHN', chapter: '4' });

    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });
  });

  it("does not revert the new scope's optimistic overlay when a previous scope's write fails", async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(vi.fn());

    // Chapter 3's create is deferred so it can fail AFTER we navigate away.
    let rejectPrevWrite: (reason?: Error) => void = vi.fn();
    const prevWrite = new Promise((_resolve, reject) => {
      rejectPrevWrite = reject;
    });
    mockUseHighlights({
      createHighlight: vi.fn().mockReturnValue(prevWrite),
    });

    const { result, rerender } = renderHook(
      (props: { versionId: number; book: string; chapter: string }) =>
        useBibleReaderHighlights(props),
      { wrapper: AuthWrapper, initialProps: defaultOptions },
    );

    // Highlight JHN.3.16 — write is in flight (deferred, will fail later).
    act(() => {
      result.current.apply('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    // Navigate to JHN.4: the overlay resets. This chapter gets its own
    // never-settling write so its optimistic entry survives on its own terms.
    mockUseHighlights({
      createHighlight: vi.fn().mockReturnValue(new Promise<never>(vi.fn())),
    });
    rerender({ versionId: 111, book: 'JHN', chapter: '4' });
    expect(result.current.highlightedVerses).toEqual({});

    // Highlight JHN.4.16 — same verse number, different chapter.
    act(() => {
      result.current.apply('fffe00', [16]);
    });
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    // Chapter 3's stale write finally fails. Its snapshot ({}) lacks verse 16,
    // so an ungated revert would `delete` JHN.4.16's optimistic entry. The
    // scope gate skips the revert since we've left that scope.
    await act(async () => {
      rejectPrevWrite(new Error('network down'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });
    // The failure is still logged unconditionally.
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to apply highlight'),
      expect.objectContaining({ passageId: 'JHN.3.16' }),
    );
    consoleError.mockRestore();
  });
});

describe('useBibleReaderHighlights — controlled mode (YPE-3705)', () => {
  it('keeps the fetch disabled and projects from the host prop, even with the flag off', () => {
    setHighlightsLive(false);
    const mocked = mockUseHighlights({
      highlights: makeCollection([{ version_id: 111, passage_id: 'JHN.3.16', color: '00d6ff' }]),
    });

    const { result } = renderHook(
      () =>
        useBibleReaderHighlights({
          ...defaultOptions,
          controlled: {
            highlights: [
              { version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' },
              { version_id: 111, passage_id: 'JHN.3.17-18', color: '5dff79' },
              { version_id: 111, passage_id: 'JHN.3.1', color: 'abcdef' }, // outside palette
            ],
          },
        }),
      { wrapper: AuthWrapper },
    );

    expect(useHighlightsOverride).toHaveBeenCalledWith(
      { version_id: 111, passage_id: 'JHN.3' },
      { enabled: false },
    );
    expect(mocked.createHighlight).not.toHaveBeenCalled();
    expect(result.current.highlightedVerses).toEqual({
      1: 'abcdef',
      16: 'fffe00',
      17: '5dff79',
      18: '5dff79',
    });
  });

  it('emits apply/remove intents with no optimistic paint and no network', () => {
    const onApply = vi.fn();
    const onRemove = vi.fn();
    const mocked = mockUseHighlights();

    const { result, rerender } = renderHook(
      ({ highlights }: { highlights: Highlight[] }) =>
        useBibleReaderHighlights({
          ...defaultOptions,
          controlled: { highlights, onApply, onRemove },
        }),
      {
        wrapper: AuthWrapper,
        initialProps: {
          highlights: [{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }],
        },
      },
    );

    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    act(() => {
      result.current.apply('5dff79', [17, 18]);
    });
    // Pure projection: paint waits for the host round-trip.
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith({
      versionId: 111,
      book: 'JHN',
      chapter: '3',
      verses: [17, 18],
      passageIds: ['JHN.3.17', 'JHN.3.18'],
      color: '5dff79',
    });
    expect(mocked.createHighlight).not.toHaveBeenCalled();

    act(() => {
      result.current.remove('fffe00', [16, 17]);
    });
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith({
      versionId: 111,
      book: 'JHN',
      chapter: '3',
      verses: [16],
      passageIds: ['JHN.3.16'],
      color: 'fffe00',
    });
    expect(mocked.deleteHighlight).not.toHaveBeenCalled();
    // Still no optimistic un-paint.
    expect(result.current.highlightedVerses).toEqual({ 16: 'fffe00' });

    // Host round-trip.
    rerender({ highlights: [] });
    expect(result.current.highlightedVerses).toEqual({});
  });

  it('rejects non-palette apply intents in controlled mode', () => {
    const onApply = vi.fn();

    const { result } = renderHook(
      () =>
        useBibleReaderHighlights({
          ...defaultOptions,
          controlled: { highlights: [], onApply },
        }),
      { wrapper: HighlightsWrapper },
    );

    act(() => {
      expect(result.current.apply('aabbcc', [16])).toBe('noop');
    });
    expect(onApply).not.toHaveBeenCalled();
  });

  it('emits remove intents for valid non-palette colors', () => {
    const custom = 'aabbcc';
    const onRemove = vi.fn();

    const { result } = renderHook(
      () =>
        useBibleReaderHighlights({
          ...defaultOptions,
          controlled: {
            highlights: [{ version_id: 111, passage_id: 'JHN.3.16', color: custom }],
            onRemove,
          },
        }),
      { wrapper: HighlightsWrapper },
    );

    act(() => {
      result.current.remove(custom, [16]);
    });

    expect(onRemove).toHaveBeenCalledWith({
      versionId: 111,
      book: 'JHN',
      chapter: '3',
      verses: [16],
      passageIds: ['JHN.3.16'],
      color: custom,
    });
  });
});
