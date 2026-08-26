'use client';

import { useContext } from 'react';
import { YouVersionAuthContext } from '../context/YouVersionAuthContext';

/**
 * This function returns a `queryKey` segment for hooks that load user data.
 * `useHighlights` is one of these hooks.
 *
 * The return value is one of three things:
 * - the user id, when a user is signed in and identified;
 * - `'anon'`, when no user can be signed in (auth is off) or no user is signed in;
 * - `null`, when the scope is not known yet or the signed-in user has no usable id.
 *
 * A `null` scope is not a cache key. Hooks that get `null` must not fetch,
 * because two different accounts would otherwise share one cache entry.
 * `useHighlights` sets `enabled: false` while the scope is `null`.
 *
 * The scope is not known when auth is still loading. A signed-in user has no
 * usable id when the profile has not resolved, the token has no id claim, or the
 * id is an empty string. `userId` is an optional string on `YouVersionUserInfo`
 * and the schema accepts `''`, so all of these states are possible.
 *
 * The `queryKey` includes this value.
 * As a result, each account has its own cache entry.
 * A change in auth does not need a manual cache clear.
 *
 * This function reads `YouVersionAuthContext`.
 * When `includeAuth` is off, data hooks must still work.
 * This function does not call `useYouVersionAuthContext()`.
 * When auth is off, `useYouVersionAuthContext()` throws.
 *
 * The React Native Expo SDK also puts `userInfo` in this context.
 */
export function useUserScope(): string | null {
  const auth = useContext(YouVersionAuthContext);
  // No auth context: the host never signs anyone in, so there is one scope.
  if (!auth) return 'anon';
  // Auth is resolving. The scope is not known yet.
  if (auth.isLoading) return null;
  // Auth resolved with no user.
  if (!auth.userInfo) return 'anon';
  // Signed in. A missing or empty id leaves the account unidentified, so there is
  // no safe key for it: two such accounts would otherwise share one cache entry.
  return auth.userInfo.userId || null;
}
