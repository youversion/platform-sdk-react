/**
 * @vitest-environment jsdom
 *
 * Integration coverage for the highlight auth flow state machine (YPE-1034 PR2)
 * through the REAL `useHighlights` + `useHighlightAuthActions` hooks. Nothing
 * from the hooks package is module-mocked; only the core clients' network
 * methods (`HighlightsClient` / `DataExchangeClient` prototypes) and the sign-in
 * redirect are stubbed at the boundary — the same discipline that caught PR 1's
 * worst bug.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  DataExchangeClient,
  HighlightsClient,
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
} from '@youversion/platform-core';
import { YouVersionAuthContext, YouVersionContext } from '@youversion/platform-react-hooks';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HIGHLIGHTS_LIVE, setHighlightsLive } from '@/lib/feature-flags';
import { readPendingHighlights, stashPendingHighlight } from '@/lib/pending-highlight';
import { TestQueryClientProvider } from '@/test/hook-overrides';
import { mockUserInfo } from '@/test/highlights-test-utils';
import { useBibleReaderHighlights } from './use-bible-reader-highlights';

let signedIn = false;

function Providers({ children }: { children: ReactNode }) {
  return (
    <YouVersionContext.Provider value={{ appKey: 'test-app-key', apiHost: 'api.example.com' }}>
      <YouVersionAuthContext.Provider
        value={{
          userInfo: signedIn ? mockUserInfo : null,
          setUserInfo: vi.fn(),
          isLoading: false,
          error: null,
          redirectUri: 'https://host.example/callback',
        }}
      >
        <TestQueryClientProvider>{children}</TestQueryClientProvider>
      </YouVersionAuthContext.Provider>
    </YouVersionContext.Provider>
  );
}

const options = { versionId: 111, book: 'JHN', chapter: '3' };

function setLocation(href: string) {
  const url = new URL(href);
  Object.defineProperty(window, 'location', {
    value: { href: url.href, search: url.search, origin: url.origin, pathname: url.pathname },
    writable: true,
    configurable: true,
  });
}

function httpError(status: number): Error {
  return Object.assign(new Error(`HTTP ${status}`), { status });
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  signedIn = false;
  setHighlightsLive(true);
  // The permission cache is user-scoped: persist a matching userInfo (as the
  // auth provider does at sign-in) so granted permissions are readable. This
  // alone grants nothing — the cache stays empty until a grant lands.
  YouVersionPlatformConfiguration.saveUserInfo({ id: 'user-1', name: 'Test User' });
  setLocation('https://host.example/read');
  vi.spyOn(window.history, 'replaceState').mockImplementation(vi.fn());
  vi.spyOn(HighlightsClient.prototype, 'getHighlights').mockResolvedValue({
    data: [],
    next_page_token: null,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  setHighlightsLive(HIGHLIGHTS_LIVE);
  localStorage.clear();
  sessionStorage.clear();
});

describe('highlight auth flow — one-fell-swoop (signed out)', () => {
  it('color tap opens the sign-in dialog and stashes pending; confirm starts sign-in; granted return applies', async () => {
    const signIn = vi.spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);
    const createHighlight = vi
      .spyOn(HighlightsClient.prototype, 'createHighlight')
      .mockResolvedValue({ version_id: 111, passage_id: 'JHN.3.16', color: 'ffec5b' });

    const { result, unmount } = renderHook(() => useBibleReaderHighlights(options), {
      wrapper: Providers,
    });

    // NEW BEHAVIOR (PR-288): a signed-out color tap opens the sign-in dialog
    // instead of redirecting immediately. It stashes the pending intent and does
    // NOT launch OAuth until the user confirms.
    act(() => {
      expect(result.current.apply('FFEC5B', [16])).toBe('flow');
    });

    expect(result.current.signInDialogOpen).toBe(true);
    const pending = readPendingHighlights()[0];
    expect(pending).toMatchObject({ verses: [16], color: 'ffec5b', versionId: 111, chapter: '3' });
    expect(signIn).not.toHaveBeenCalled();
    expect(createHighlight).not.toHaveBeenCalled();

    // Confirm → launch the full-page sign-in redirect requesting `highlights`.
    act(() => {
      result.current.confirmSignInDialog();
    });
    expect(signIn).toHaveBeenCalledWith(
      'https://host.example/callback',
      ['profile'],
      ['highlights'],
    );

    // The confirm triggers a full-page redirect; simulate the reload on the
    // granted return — a fresh mount, now signed in with the permission granted
    // and the pending highlight still in sessionStorage.
    unmount();
    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
    signedIn = true;
    renderHook(() => useBibleReaderHighlights(options), { wrapper: Providers });

    await waitFor(() => {
      expect(createHighlight).toHaveBeenCalledWith({
        version_id: 111,
        passage_id: 'JHN.3.16',
        color: 'ffec5b',
      });
    });
    // Pending consumed (the write is the proof it applied).
    expect(readPendingHighlights()).toEqual([]);
  });
});

describe('highlight auth flow — sign-in dialog (signed out)', () => {
  it('a color tap opens the sign-in dialog and stashes pending without launching OAuth', () => {
    const signIn = vi.spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);

    const { result } = renderHook(() => useBibleReaderHighlights(options), { wrapper: Providers });

    act(() => {
      expect(result.current.apply('ffec5b', [16])).toBe('flow');
    });

    expect(result.current.signInDialogOpen).toBe(true);
    expect(readPendingHighlights()[0]).toMatchObject({ verses: [16], color: 'ffec5b' });
    expect(signIn).not.toHaveBeenCalled();
  });

  it('declining the sign-in dialog discards the pending highlight and does not sign in', () => {
    const signIn = vi.spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);

    const { result } = renderHook(() => useBibleReaderHighlights(options), { wrapper: Providers });

    act(() => {
      result.current.apply('ffec5b', [16]);
    });
    expect(result.current.signInDialogOpen).toBe(true);
    expect(readPendingHighlights()).not.toHaveLength(0);

    act(() => {
      result.current.cancelSignInDialog();
    });
    expect(result.current.signInDialogOpen).toBe(false);
    expect(readPendingHighlights()).toEqual([]);
    expect(signIn).not.toHaveBeenCalled();
  });
});

describe('highlight auth flow — just-in-time (signed in, no permission)', () => {
  beforeEach(() => {
    signedIn = true;
  });

  it('opens the confirm dialog and stashes pending; confirm starts data exchange', async () => {
    const updateToken = vi
      .spyOn(DataExchangeClient.prototype, 'updateToken')
      .mockResolvedValue('dx-token');
    const createHighlight = vi.spyOn(HighlightsClient.prototype, 'createHighlight');

    const { result } = renderHook(() => useBibleReaderHighlights(options), { wrapper: Providers });

    act(() => {
      expect(result.current.apply('ffec5b', [16])).toBe('flow');
    });

    expect(result.current.permissionDialogOpen).toBe(true);
    expect(readPendingHighlights()[0]).toMatchObject({ verses: [16], color: 'ffec5b' });
    expect(createHighlight).not.toHaveBeenCalled();

    await act(async () => {
      result.current.confirmPermissionDialog();
      await Promise.resolve();
    });

    expect(updateToken).toHaveBeenCalledWith(['highlights']);
    await waitFor(() => {
      expect(window.location.href).toContain('https://api.example.com/data-exchange');
    });
    // Pending survives the redirect so the resume effect can apply it on return.
    expect(readPendingHighlights()).not.toHaveLength(0);
  });

  it('declining the dialog discards only the pending highlight', () => {
    const { result } = renderHook(() => useBibleReaderHighlights(options), { wrapper: Providers });

    act(() => {
      result.current.apply('ffec5b', [16]);
    });
    expect(readPendingHighlights()).not.toHaveLength(0);

    act(() => {
      result.current.cancelPermissionDialog();
    });
    expect(result.current.permissionDialogOpen).toBe(false);
    expect(readPendingHighlights()).toEqual([]);
  });

  it('closes the dialog and clears pending when the host signs the user out mid-flow', () => {
    const updateToken = vi
      .spyOn(DataExchangeClient.prototype, 'updateToken')
      .mockResolvedValue('dx-token');

    const { result, rerender } = renderHook(() => useBibleReaderHighlights(options), {
      wrapper: Providers,
    });

    act(() => {
      result.current.apply('ffec5b', [16]);
    });
    expect(result.current.permissionDialogOpen).toBe(true);
    expect(readPendingHighlights()).toHaveLength(1);

    // The host signs the user out while the confirm dialog is still open. A
    // confirm now would start a data exchange that rejects unauthenticated, so
    // the flow must route back out of the dialog and drop the pending intent.
    signedIn = false;
    rerender();

    expect(result.current.permissionDialogOpen).toBe(false);
    expect(readPendingHighlights()).toEqual([]);

    // A confirm after the auto-close is a no-op: no data exchange is started.
    act(() => {
      result.current.confirmPermissionDialog();
    });
    expect(updateToken).not.toHaveBeenCalled();
  });
});

describe('highlight auth flow — data-exchange return', () => {
  it('applies the pending highlight on a granted return (async session hydration)', async () => {
    signedIn = false;
    setLocation(
      'https://host.example/read?data_exchange_status=granted&granted_permissions=highlights',
    );
    // Record the initiator as the redirect leg would have — the callback only
    // saves a grant for the user who started the exchange.
    YouVersionPlatformConfiguration.saveDataExchangeInitiator();
    // Pre-stash a pending highlight as the confirm path would have.
    stashPendingHighlight({
      verses: [16],
      color: 'ffec5b',
      versionId: 111,
      book: 'JHN',
      chapter: '3',
      timestamp: Date.now(),
    });
    const createHighlight = vi
      .spyOn(HighlightsClient.prototype, 'createHighlight')
      .mockResolvedValue({ version_id: 111, passage_id: 'JHN.3.16', color: 'ffec5b' });

    const { rerender } = renderHook(() => useBibleReaderHighlights(options), {
      wrapper: Providers,
    });

    // The session resolves after mount, as the shipped provider does.
    signedIn = true;
    rerender();

    await waitFor(() => {
      expect(createHighlight).toHaveBeenCalledWith({
        version_id: 111,
        passage_id: 'JHN.3.16',
        color: 'ffec5b',
      });
    });
    expect(YouVersionPlatformConfiguration.hasPermission('highlights')).toBe(true);
    expect(readPendingHighlights()).toEqual([]);
  });

  it('re-stashes pending and re-prompts when the resumed write fails 401 (async session hydration)', async () => {
    // Same granted-return path as above, but the resumed POST comes back 401.
    // The user's original color tap must NOT be silently lost: the pending is
    // re-stashed (from the op's own scope), the permission cache is invalidated,
    // and the permission dialog re-opens — the same handling as a user apply.
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    signedIn = false;
    setLocation(
      'https://host.example/read?data_exchange_status=granted&granted_permissions=highlights',
    );
    // Record the initiator as the redirect leg would have (see test above).
    YouVersionPlatformConfiguration.saveDataExchangeInitiator();
    stashPendingHighlight({
      verses: [16],
      color: 'ffec5b',
      versionId: 111,
      book: 'JHN',
      chapter: '3',
      timestamp: Date.now(),
    });
    const createHighlight = vi
      .spyOn(HighlightsClient.prototype, 'createHighlight')
      .mockRejectedValue(httpError(401));

    const { result, rerender } = renderHook(() => useBibleReaderHighlights(options), {
      wrapper: Providers,
    });

    signedIn = true;
    rerender();

    await waitFor(() => {
      expect(result.current.permissionDialogOpen).toBe(true);
    });
    // The resumed write was attempted, then failed.
    expect(createHighlight).toHaveBeenCalledWith({
      version_id: 111,
      passage_id: 'JHN.3.16',
      color: 'ffec5b',
    });
    // Server truth wins: cache invalidated, and the pending is re-stashed from the
    // op's own scope so a post-grant confirm can resume it.
    expect(YouVersionPlatformConfiguration.hasPermission('highlights')).toBe(false);
    expect(readPendingHighlights()[0]).toMatchObject({
      verses: [16],
      color: 'ffec5b',
      versionId: 111,
      chapter: '3',
    });
  });

  it('discards pending on a cancelled return and does not re-open the dialog (async session hydration)', async () => {
    // Mount signed OUT: the shipped YouVersionAuthProvider hydrates userInfo
    // asynchronously, so the first effect run after a redirect return is always
    // unauthenticated. The cancel discard must survive that flip — consuming
    // the status on run 1 and acting on it on run 2 is the bug this pins.
    signedIn = false;
    setLocation('https://host.example/read?data_exchange_status=cancel');
    stashPendingHighlight({
      verses: [16],
      color: 'ffec5b',
      versionId: 111,
      book: 'JHN',
      chapter: '3',
      timestamp: Date.now(),
    });
    const createHighlight = vi.spyOn(HighlightsClient.prototype, 'createHighlight');

    const { result, rerender } = renderHook(() => useBibleReaderHighlights(options), {
      wrapper: Providers,
    });

    // The session resolves after mount.
    signedIn = true;
    rerender();

    await waitFor(() => {
      expect(readPendingHighlights()).toEqual([]);
    });
    expect(result.current.permissionDialogOpen).toBe(false);
    expect(createHighlight).not.toHaveBeenCalled();
  });

  it('discards pending on a failure return and does not re-open the dialog (async session hydration)', async () => {
    signedIn = false;
    setLocation('https://host.example/read?data_exchange_status=something-unexpected');
    stashPendingHighlight({
      verses: [16],
      color: 'ffec5b',
      versionId: 111,
      book: 'JHN',
      chapter: '3',
      timestamp: Date.now(),
    });
    const createHighlight = vi.spyOn(HighlightsClient.prototype, 'createHighlight');

    const { result, rerender } = renderHook(() => useBibleReaderHighlights(options), {
      wrapper: Providers,
    });

    signedIn = true;
    rerender();

    await waitFor(() => {
      expect(readPendingHighlights()).toEqual([]);
    });
    expect(result.current.permissionDialogOpen).toBe(false);
    expect(createHighlight).not.toHaveBeenCalled();
  });
});

describe('highlight auth flow — write failure routing', () => {
  beforeEach(() => {
    signedIn = true;
    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
  });

  it('401 invalidates the permission cache, keeps pending, and re-prompts', async () => {
    vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.spyOn(HighlightsClient.prototype, 'createHighlight').mockRejectedValue(httpError(401));

    const { result } = renderHook(() => useBibleReaderHighlights(options), { wrapper: Providers });

    act(() => {
      expect(result.current.apply('ffec5b', [16])).toBe('applied');
    });

    await waitFor(() => {
      expect(result.current.permissionDialogOpen).toBe(true);
    });
    // Cache invalidated (server truth wins), overlay reverted, pending KEPT.
    expect(YouVersionPlatformConfiguration.hasPermission('highlights')).toBe(false);
    expect(result.current.highlightedVerses).toEqual({});
    expect(readPendingHighlights()[0]).toMatchObject({ verses: [16], color: 'ffec5b' });
  });

  it('5xx reverts the overlay, logs, and discards pending without re-prompting', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(vi.fn());
    vi.spyOn(HighlightsClient.prototype, 'createHighlight').mockRejectedValue(httpError(500));

    const { result } = renderHook(() => useBibleReaderHighlights(options), { wrapper: Providers });

    act(() => {
      result.current.apply('ffec5b', [16]);
    });

    await waitFor(() => {
      expect(result.current.highlightedVerses).toEqual({});
    });
    expect(result.current.permissionDialogOpen).toBe(false);
    expect(readPendingHighlights()).toEqual([]);
    expect(YouVersionPlatformConfiguration.hasPermission('highlights')).toBe(true);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to apply highlight'),
      expect.anything(),
    );
  });
});

describe('highlight auth flow — operation queue', () => {
  beforeEach(() => {
    signedIn = true;
    YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
  });

  it('serializes overlapping apply→remove so DELETE never overtakes the in-flight POST', async () => {
    const order: string[] = [];
    let releaseCreate!: () => void;
    const createGate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });

    vi.spyOn(HighlightsClient.prototype, 'createHighlight').mockImplementation(async () => {
      order.push('create:start');
      await createGate;
      order.push('create:end');
      return { version_id: 111, passage_id: 'JHN.3.16', color: 'ffec5b' };
    });
    vi.spyOn(HighlightsClient.prototype, 'deleteHighlight').mockImplementation(async () => {
      order.push('delete:start');
      await Promise.resolve();
    });

    const { result } = renderHook(() => useBibleReaderHighlights(options), { wrapper: Providers });

    // Apply then immediately remove the same verse.
    act(() => {
      result.current.apply('ffec5b', [16]);
    });
    act(() => {
      result.current.remove('ffec5b', [16]);
    });

    // Optimistic: last-issued (remove) wins the visual state.
    expect(result.current.highlightedVerses).toEqual({});

    // The DELETE must not start until the POST has fully settled.
    await waitFor(() => expect(order).toContain('create:start'));
    expect(order).not.toContain('delete:start');

    releaseCreate();

    await waitFor(() => expect(order).toContain('delete:start'));
    expect(order).toEqual(['create:start', 'create:end', 'delete:start']);
    // Settles to the last-issued operation's state.
    expect(result.current.highlightedVerses).toEqual({});
  });
});
