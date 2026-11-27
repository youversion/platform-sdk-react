import { expect, it, onTestFinished, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import {
  type SignInWithYouVersionResult,
  type YouVersionUserInfoJSON,
  YouVersionAPIUsers,
  YouVersionPlatformConfiguration as config,
} from '@youversion/platform-core';
import { createMockAuthResult } from '../__tests__/mocks/auth';
import { useYouVersionAuthContext } from './YouVersionAuthContext';
import YouVersionAuthProvider from './YouVersionAuthProvider';

function AuthWrapper({ children }: PropsWithChildren) {
  return (
    <YouVersionAuthProvider config={{ appKey: 'test-app-key' }}>{children}</YouVersionAuthProvider>
  );
}

function openCallback(search: string, callback: () => Promise<SignInWithYouVersionResult | null>) {
  YouVersionAPIUsers.signOut();
  window.history.replaceState(null, '', search);
  const handleCallback = vi
    .spyOn(YouVersionAPIUsers, 'handleAuthCallback')
    .mockImplementation(callback);
  onTestFinished(() => {
    handleCallback.mockRestore();
    window.history.replaceState(null, '', '/');
    YouVersionAPIUsers.signOut();
  });
  return handleCallback;
}

it('keeps auth pending on the initial OAuth hop without a code', async () => {
  const intermediate = Promise.withResolvers<null>();
  const handleCallback = openCallback('?state=first-hop', () => intermediate.promise);
  const { result } = renderHook(useYouVersionAuthContext, { wrapper: AuthWrapper });
  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    intermediate.resolve(null);
  });
  expect(handleCallback).toHaveBeenCalled();
  expect(result.current.error).toBeNull();
  expect(result.current.isLoading).toBe(true);
});

it('publishes a verified callback completed after the same account rotates its token', async () => {
  const callback = Promise.withResolvers<SignInWithYouVersionResult>();
  openCallback('?state=notes-grant&code=grant-code', () => callback.promise);
  config.saveAuthData('old-access', 'old-refresh', null);
  config.saveUserInfo({ id: 'alice' });
  const { result } = renderHook(useYouVersionAuthContext, { wrapper: AuthWrapper });

  act(() => {
    config.saveAuthData('rotated-access', 'rotated-refresh', null);
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'accessToken', storageArea: localStorage }),
    );
  });
  expect(result.current.userInfo?.userId).toBe('alice');
  expect(result.current.isLoading).toBe(true);

  await act(async () => {
    config.saveAuthData('granted-access', 'granted-refresh', null);
    callback.resolve(
      createMockAuthResult({
        accessToken: 'granted-access',
        refreshToken: 'granted-refresh',
        yvpUserId: 'alice',
      }),
    );
  });
  expect(result.current.isLoading).toBe(false);
  expect(result.current.oauthCallbackState).toBe('notes-grant');
  expect(result.current.userInfo?.userId).toBe('alice');

  act(() => {
    config.saveUserInfo({ id: 'other-account' });
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'userInfo', storageArea: localStorage }),
    );
  });
  expect(result.current.userInfo?.userId).toBe('other-account');
  expect(result.current.oauthCallbackState).toBeNull();
});

it('ignores a successful callback after another account has already replaced its session', async () => {
  const callback = Promise.withResolvers<SignInWithYouVersionResult>();
  openCallback('?state=notes-grant&code=grant-code', () => callback.promise);
  const { result } = renderHook(useYouVersionAuthContext, { wrapper: AuthWrapper });

  await act(async () => {
    config.saveAuthData('replacement-access', 'replacement-refresh', null);
    config.saveUserInfo({ id: 'bob' });
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'userInfo', storageArea: localStorage }),
    );
    callback.resolve(createMockAuthResult({ accessToken: 'old-access', yvpUserId: 'alice' }));
  });
  expect(result.current.isLoading).toBe(false);
  expect(result.current.userInfo?.userId).toBe('bob');
  expect(result.current.oauthCallbackState).toBeNull();
  expect(result.current.oauthCallbackSuperseded).toBe(true);
});

it.each([
  {
    scenario: 'a matched exchange fails',
    name: 'TypeError',
    pendingAtStart: true,
    superseded: false,
    recover: true,
  },
  {
    scenario: 'a matched hosted denial returns',
    name: 'Error',
    pendingAtStart: true,
    superseded: false,
    recover: true,
  },
  {
    scenario: 'the attempt is replaced during exchange',
    name: 'OAuthCallbackSupersededError',
    pendingAtStart: true,
    superseded: true,
    recover: false,
  },
  {
    scenario: 'the attempt is already absent',
    name: 'Error',
    pendingAtStart: false,
    superseded: false,
    recover: false,
  },
])(
  'only identifies recoverable failures when $scenario',
  async ({ name, pendingAtStart, superseded, recover }) => {
    const error = Object.assign(new Error('Authorization failed'), { name });
    const pending = vi.spyOn(YouVersionAPIUsers, 'isSignInPending').mockReturnValue(pendingAtStart);
    onTestFinished(() => pending.mockRestore());
    const query = name === 'Error' ? 'error=access_denied' : 'code=grant-code';
    openCallback(`?state=older-grant&${query}`, () => {
      pending.mockReturnValue(false);
      return Promise.reject(error);
    });
    config.saveAuthData('active-access', 'active-refresh', null);
    config.saveUserInfo({ id: 'alice' });

    const { result } = renderHook(useYouVersionAuthContext, { wrapper: AuthWrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.userInfo?.userId).toBe('alice');
    expect(result.current.oauthCallbackState).toBeNull();
    expect(result.current.oauthCallbackSuperseded).toBe(superseded);
    expect(result.current.oauthFailedCallbackState).toBe(recover ? 'older-grant' : null);
  },
);

it('keeps the account synced from another tab when the previous account refresh fails', async () => {
  config.saveAuthData('old-access-token', 'old-refresh-token', new Date(0));
  config.saveUserInfo({ id: 'old-account' });
  const oldRefresh = Promise.withResolvers<boolean>();
  const refresh = vi
    .spyOn(YouVersionAPIUsers, 'refreshTokenIfNeeded')
    .mockReturnValue(oldRefresh.promise);

  try {
    const { result } = renderHook(useYouVersionAuthContext, { wrapper: AuthWrapper });
    expect(result.current.isLoading).toBe(true);

    act(() => {
      config.saveAuthData('new-access-token', 'new-refresh-token', null);
      config.saveUserInfo({ id: 'new-account' });
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'userInfo', storageArea: localStorage }),
      );
    });
    expect(result.current.userInfo?.userId).toBe('new-account');

    await act(async () => {
      oldRefresh.resolve(false);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.userInfo?.userId).toBe('new-account');

    act(() => {
      YouVersionAPIUsers.signOut();
      window.dispatchEvent(new StorageEvent('storage', { storageArea: localStorage }));
    });
    expect(result.current.userInfo).toBeNull();
  } finally {
    refresh.mockRestore();
    YouVersionAPIUsers.signOut();
  }
});

it('takes signed-in and signed-out state from the host across browser auth events', () => {
  openCallback('?error=access_denied', () => Promise.reject(new Error('Browser OAuth was called')));
  config.saveAuthData('browser-access-token', 'browser-refresh-token', null);
  config.saveUserInfo({ id: 'browser-account' });
  let hostUser: YouVersionUserInfoJSON | null = null;
  function HostAuthWrapper({ children }: PropsWithChildren) {
    return (
      <YouVersionAuthProvider config={{ appKey: 'test-app-key' }} userInfo={hostUser}>
        {children}
      </YouVersionAuthProvider>
    );
  }

  const { result, rerender } = renderHook(useYouVersionAuthContext, { wrapper: HostAuthWrapper });
  expect(result.current.isLoading).toBe(false);
  expect(result.current.userInfo).toBeNull();

  hostUser = { id: 'host-account' };
  rerender();
  expect(result.current.userInfo?.userId).toBe('host-account');

  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'userInfo', storageArea: localStorage }),
    );
  });
  expect(result.current.userInfo?.userId).toBe('host-account');
  expect(result.current.error).toBeNull();
  expect(result.current.oauthCallbackState).toBeNull();

  hostUser = null;
  rerender();
  expect(result.current.userInfo).toBeNull();
});

it('keeps the host profile after a mounted web provider switches to host ownership', async () => {
  YouVersionAPIUsers.signOut();
  onTestFinished(() => YouVersionAPIUsers.signOut());
  config.saveAuthData('browser-access', 'browser-refresh', new Date('2100-01-01'), {
    userId: 'browser-account',
    scope: 'profile',
  });
  config.saveUserInfo({ id: 'browser-account' });
  let hostUser: YouVersionUserInfoJSON | undefined;
  function ReaderAuth({ children }: PropsWithChildren) {
    return (
      <YouVersionAuthProvider config={{ appKey: 'test-app-key' }} userInfo={hostUser}>
        {children}
      </YouVersionAuthProvider>
    );
  }

  const { result, rerender } = renderHook(useYouVersionAuthContext, { wrapper: ReaderAuth });
  await waitFor(() => expect(result.current.userInfo?.userId).toBe('browser-account'));
  hostUser = { id: 'host-account' };
  rerender();
  expect(result.current.userInfo?.userId).toBe('host-account');

  act(() => {
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'userInfo', storageArea: localStorage }),
    );
  });
  expect(result.current.userInfo?.userId).toBe('host-account');
});

it.each([
  { scenario: 'a sign-out', intermediate: null, revision: 1 },
  { scenario: 'an account replacement', intermediate: { id: 'bob' }, revision: 2 },
  {
    scenario: 'only a profile update',
    intermediate: { id: 'alice', name: 'Updated Alice' },
    revision: 0,
  },
])(
  'processes $scenario from queued events after Alice is current again',
  async ({ intermediate, revision }) => {
    YouVersionAPIUsers.signOut();
    onTestFinished(() => YouVersionAPIUsers.signOut());
    config.saveAuthData('first-access', 'first-refresh', new Date('2100-01-01'), {
      scope: 'profile',
      userId: 'alice',
    });
    config.saveUserInfo({ id: 'alice' });
    const { result } = renderHook(useYouVersionAuthContext, { wrapper: AuthWrapper });
    await waitFor(() => expect(result.current.userInfo?.userId).toBe('alice'));
    const deletedProfile = localStorage.getItem('userInfo');
    expect(deletedProfile).not.toBeNull();

    act(() => {
      if (intermediate) config.saveUserInfo(intermediate);
      else YouVersionAPIUsers.signOut();
      const intermediateProfile = localStorage.getItem('userInfo');
      config.saveAuthData('next-access', 'next-refresh', new Date('2100-01-01'), {
        scope: 'profile',
        userId: 'alice',
      });
      config.saveUserInfo({ id: 'alice' });
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'userInfo',
          oldValue: deletedProfile,
          newValue: intermediateProfile,
          storageArea: localStorage,
        }),
      );
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'userInfo',
          oldValue: intermediateProfile,
          newValue: localStorage.getItem('userInfo'),
          storageArea: localStorage,
        }),
      );
    });
    expect(result.current.userInfo?.userId).toBe('alice');
    expect(result.current.accessToken).toBe('next-access');
    expect(result.current.accountRevision).toBe(revision);
  },
);
