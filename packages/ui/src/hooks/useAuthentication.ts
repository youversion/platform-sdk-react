import { useYVP } from '../providers/YVPProvider';
import {
  YouVersionAPIUsers,
  YouVersionUserInfo,
  type AuthenticationState,
  type SignInWithYouVersionPermissionValues,
  type SignInWithYouVersionResult,
} from '@youversion/platform-core';
import { useCallback } from 'react';

export function useAuthentication(): {
  auth: AuthenticationState;
  signIn: (
    requiredPermissions?: SignInWithYouVersionPermissionValues[],
    optionalPermissions?: SignInWithYouVersionPermissionValues[],
  ) => Promise<SignInWithYouVersionResult>;
  signOut: () => void;
  fetchUserInfo: () => Promise<YouVersionUserInfo>;
} {
  const { auth, signOut, client: _client } = useYVP();

  const signIn = useCallback(
    async (
      requiredPermissions: SignInWithYouVersionPermissionValues[] = [],
      optionalPermissions: SignInWithYouVersionPermissionValues[] = [],
    ) => {
      return await YouVersionAPIUsers.signIn(
        new Set(requiredPermissions),
        new Set(optionalPermissions),
      );
    },
    [],
  );

  const fetchUserInfo = useCallback((): Promise<YouVersionUserInfo> => {
    // User info now comes from JWT in SignInWithYouVersionResult
    if (!auth.result) {
      return Promise.reject(new Error('Not authenticated. Please sign in first.'));
    }

    // Extract user info from the sign-in result and create YouVersionUserInfo instance
    return Promise.resolve(
      new YouVersionUserInfo({
        id: auth.result.yvpUserId || '',
        first_name: auth.result.name?.split(' ')[0] || '',
        last_name: auth.result.name?.split(' ').slice(1).join(' ') || '',
        avatar_url: auth.result.profilePicture || undefined,
      }),
    );
  }, [auth.result]);

  return {
    auth,
    signIn,
    signOut,
    fetchUserInfo,
  };
}
