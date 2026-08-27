'use client';

import { useContext } from 'react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { YouVersionAuthContext } from '../context/YouVersionAuthContext';

/**
 * Returns the `queryKey` segment for hooks that load user data, such as
 * `useHighlights`.
 *
 * The return value is one of three values:
 * - the user id, when a signed-in user has a non-empty id;
 * - `'anon'`, when no access token is set and either the host has no auth
 *   context or no user is signed in;
 * - `null`, when no safe cache key exists.
 *
 * The `queryKey` includes this value, so each account has its own cache
 * entry. A change in auth does not need a manual cache clear.
 *
 * Hooks that get `null` must not fetch. Without this rule, two accounts can
 * share one cache entry. No safe key exists in three states:
 * - the auth context has not resolved;
 * - the signed-in profile has a missing or empty id (the schema permits both);
 * - an access token is set while no user identity is known (with or without
 *   an auth context mounted).
 *
 * The third state guards the `'anon'` scope. This hook reads identity from
 * the auth context. The request layer reads its token from
 * `YouVersionPlatformConfiguration.accessToken`. When the two disagree, a
 * fetch caches the account data for that token under the shared `'anon'` key.
 * The token read occurs at render time and is not reactive. That is enough:
 * each path that changes the token also changes the auth context, and the
 * context change re-renders this hook.
 *
 * This hook reads `YouVersionAuthContext` directly. It does not call
 * `useYouVersionAuthContext()`, because that call throws when auth is off,
 * and data hooks must work without auth. No auth context means that the host
 * owns identity, so one scope covers any token the host sets. The React
 * Native Expo SDK also puts `userInfo` in this context.
 */
export function useUserScope(): string | null {
  const auth = useContext(YouVersionAuthContext);
  // No auth context: the SDK has no identity signal at all. A token set on the
  // static config still authenticates requests, though, and successive tokens
  // can belong to different accounts — so a set token means no safe key, the
  // same rule as the token-without-user state below. Hosts that set tokens
  // directly must render the auth provider (`includeAuth`) or supply
  // `userInfo`; token-only identity is unsupported.
  if (!auth) {
    return YouVersionPlatformConfiguration.accessToken ? null : 'anon';
  }
  // The auth context has not resolved yet.
  if (auth.isLoading) return null;
  // No signed-in user. If a token is set, the request layer and this context
  // disagree about identity, and no key is safe.
  if (!auth.userInfo) {
    return YouVersionPlatformConfiguration.accessToken ? null : 'anon';
  }
  // A missing or empty id leaves the account with no safe key of its own.
  return auth.userInfo.userId || null;
}
