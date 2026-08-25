'use client';

import { useContext } from 'react';
import { YouVersionAuthContext } from '../context/YouVersionAuthContext';

/**
 * This function returns a `queryKey` segment for hooks that load user data.
 * `useHighlights` is one of these hooks.
 * The return value is the user id.
 * When there is no user, the return value is `'anon'`.
 *
 * The `queryKey` includes this value.
 * As a result, each account has its own cache entry.
 * One user cannot see data from another user.
 * A change in auth does not need a manual cache clear.
 *
 * This function reads `YouVersionAuthContext`.
 * When `includeAuth` is off, data hooks must still work.
 * This function does not call `useYouVersionAuthContext()`.
 * When auth is off, `useYouVersionAuthContext()` throws.
 *
 * The React Native Expo SDK also puts `userInfo` in this context.
 */
export function useUserScope(): string {
  const auth = useContext(YouVersionAuthContext);
  return auth?.userInfo?.userId ?? 'anon';
}
