import { act, renderHook, waitFor } from '@testing-library/react';
import {
  HighlightsClient,
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration,
} from '@youversion/platform-core';
import { YouVersionAuthContext, YouVersionContext } from '@youversion/platform-react-hooks';
import type { ReactNode } from 'react';
import { expect, it, onTestFinished, vi } from 'vitest';
import { isHighlightsLive, setHighlightsLive } from '@/lib/feature-flags';
import { readPendingHighlights } from '@/lib/pending-highlight';
import { mockUserInfo } from '@/test/highlights-test-utils';
import { TestQueryClientProvider } from '@/test/hook-overrides';
import { useBibleReaderHighlights } from './use-bible-reader-highlights';

function withReaderAuth(userInfo: typeof mockUserInfo | null) {
  const auth = {
    userInfo,
    setUserInfo: vi.fn(),
    isLoading: false,
    error: null,
    redirectUri: 'https://host.example/callback',
  };
  return function ReaderAuth({ children }: { children: ReactNode }) {
    return (
      <YouVersionContext.Provider value={{ appKey: 'test-app-key', apiHost: 'api.example.com' }}>
        <YouVersionAuthContext.Provider value={auth}>
          <TestQueryClientProvider>{children}</TestQueryClientProvider>
        </YouVersionAuthContext.Provider>
      </YouVersionContext.Provider>
    );
  };
}

it('requests Notes scopes when confirming highlight sign-in and applies the saved highlight on return', async () => {
  const highlightsWereLive = isHighlightsLive();
  setHighlightsLive(true);
  localStorage.clear();
  sessionStorage.clear();
  const read = vi.spyOn(HighlightsClient.prototype, 'getHighlights').mockResolvedValue({
    data: [],
    next_page_token: null,
  });
  const signIn = vi.spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);
  const createHighlight = vi
    .spyOn(HighlightsClient.prototype, 'createHighlight')
    .mockResolvedValue({ version_id: 111, passage_id: 'JHN.3.16', color: 'ffec5b' });
  onTestFinished(() => {
    setHighlightsLive(highlightsWereLive);
    read.mockRestore();
    signIn.mockRestore();
    createHighlight.mockRestore();
    localStorage.clear();
    sessionStorage.clear();
  });

  const options = { versionId: 111, book: 'JHN', chapter: '3' };
  const { result, unmount } = renderHook(() => useBibleReaderHighlights(options), {
    wrapper: withReaderAuth(null),
  });
  act(() => {
    expect(result.current.apply('FFEC5B', [16])).toBe('flow');
  });
  expect(result.current.signInDialogOpen).toBe(true);
  expect(readPendingHighlights()[0]).toMatchObject({
    verses: [16],
    color: 'ffec5b',
    versionId: 111,
    chapter: '3',
  });
  expect(signIn).not.toHaveBeenCalled();
  expect(createHighlight).not.toHaveBeenCalled();

  act(() => result.current.confirmSignInDialog());
  expect(signIn).toHaveBeenCalledWith(
    'https://host.example/callback',
    ['profile', 'read_notes', 'write_notes'],
    ['highlights'],
  );
  unmount();

  YouVersionPlatformConfiguration.saveUserInfo({ id: mockUserInfo.userId });
  YouVersionPlatformConfiguration.saveGrantedPermissions(['highlights']);
  renderHook(() => useBibleReaderHighlights(options), {
    wrapper: withReaderAuth(mockUserInfo),
  });
  await waitFor(() => {
    expect(createHighlight).toHaveBeenCalledWith({
      version_id: 111,
      passage_id: 'JHN.3.16',
      color: 'ffec5b',
    });
  });
  expect(readPendingHighlights()).toEqual([]);
});
