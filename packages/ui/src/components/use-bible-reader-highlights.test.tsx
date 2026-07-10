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
  // These tests exercise the authorized-write path, so seed the optimistic
  // permission cache. The auth-flow branches (missing session/permission) have
  // their own dedicated coverage.
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

describe('useBibleReaderHighlights — overlay confirmation', () => {
  it('drops the optimistic entry once the post-write refetch lands, so server truth wins', async () => {
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

    // The post-write refetch lands with different server truth for that verse
    // (e.g. another device re-colored it between our POST and the GET).
    mockUseHighlights({
      highlights: makeCollection([{ version_id: 111, passage_id: 'JHN.3.16', color: '00d6ff' }]),
    });
    rerender();

    // Without confirmation-clearing, the stale overlay entry would keep
    // rendering fffe00 until navigation.
    await waitFor(() => {
      expect(result.current.highlightedVerses).toEqual({ 16: '00d6ff' });
    });
  });
});

describe('useBibleReaderHighlights — remove', () => {
  it('removes optimistically and DELETEs only verses rendered in that color, as ranges', async () => {
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

    await waitFor(() => {
      expect(mocked.deleteHighlight).toHaveBeenCalledTimes(1);
    });
    expect(mocked.deleteHighlight).toHaveBeenCalledWith('JHN.3.16-17', { version_id: 111 });
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

  it("does not drain the new scope's optimistic overlay when a previous scope's write settles", async () => {
    // Chapter 3's create is deferred so it can settle AFTER we navigate away.
    let resolvePrevWrite: (value: unknown) => void = vi.fn();
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
    let rejectPrevWrite: (reason?: unknown) => void = vi.fn();
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
