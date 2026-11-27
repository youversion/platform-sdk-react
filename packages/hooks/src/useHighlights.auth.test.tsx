import { act, renderHook, waitFor } from '@testing-library/react';
import {
  HighlightsClient,
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration as config,
} from '@youversion/platform-core';
import type { PropsWithChildren } from 'react';
import { expect, it, onTestFinished, vi } from 'vitest';
import { YouVersionProvider } from './context/YouVersionProvider';
import { useHighlights } from './useHighlights';
import { useYVAuth } from './useYVAuth';

function WebAuthWrapper({ children }: PropsWithChildren) {
  return (
    <YouVersionProvider
      appKey="test-app-key"
      authRedirectUrl="https://example.com/callback"
      includeAuth
    >
      {children}
    </YouVersionProvider>
  );
}

it('loads highlights only after staged credentials and the stored account agree', async () => {
  YouVersionAPIUsers.signOut();
  config.saveUserInfo({ id: 'alice' });
  config.saveAuthData('expired-access', 'expired-refresh', new Date('2000-01-01'));
  localStorage.setItem('youversion-auth-state', 'alice-notes-grant');
  localStorage.setItem('youversion-auth-code-verifier', 'test-verifier');
  const refresh = vi
    .spyOn(YouVersionAPIUsers, 'refreshTokenIfNeeded')
    .mockImplementation(async () => {
      config.saveAuthData(null, null, null);
      return false;
    });
  const highlights = {
    data: [{ version_id: 111, passage_id: 'JHN.3.16', color: 'fffe00' }],
    next_page_token: null,
  };
  const get = vi.spyOn(HighlightsClient.prototype, 'getHighlights').mockResolvedValue(highlights);
  onTestFinished(() => {
    refresh.mockRestore();
    get.mockRestore();
    YouVersionAPIUsers.signOut();
  });

  const options = { version_id: 111, passage_id: 'JHN.3' };
  const { result } = renderHook(
    () => ({ session: useYVAuth(), highlights: useHighlights(options) }),
    { wrapper: WebAuthWrapper },
  );
  await waitFor(() => expect(result.current.session.auth.isLoading).toBe(false));
  expect(result.current.session.userInfo).toBeNull();
  expect(config.storedUserInfo?.id).toBe('alice');
  expect(YouVersionAPIUsers.isSignInPending('alice-notes-grant')).toBe(true);

  await act(async () => {
    config.saveAuthData('bob-access', 'bob-refresh', new Date('2100-01-01'), {
      scope: 'profile',
      userId: 'bob',
    });
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }),
    );
  });
  expect.soft(result.current.session.userInfo).toBeNull();
  expect.soft(get).not.toHaveBeenCalled();
  expect(result.current.highlights.highlights).toBeNull();

  await act(async () => {
    const oldValue = localStorage.getItem('userInfo');
    config.saveUserInfo({ id: 'bob' });
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'userInfo',
        oldValue,
        newValue: localStorage.getItem('userInfo'),
        storageArea: localStorage,
      }),
    );
  });
  await waitFor(() => expect(result.current.highlights.highlights).toEqual(highlights));
  expect(result.current.session.userInfo?.userId).toBe('bob');
  expect(get).toHaveBeenCalledExactlyOnceWith(options, 'bob-access');

  // A refetch can follow a same-account token rotation before a React update.
  config.saveAuthData('rotated-bob-access', 'rotated-bob-refresh', new Date('2100-01-01'), {
    scope: 'profile',
    userId: 'bob',
  });
  act(() => result.current.highlights.refetch());
  await waitFor(() => expect(get).toHaveBeenLastCalledWith(options, 'rotated-bob-access'));
});
