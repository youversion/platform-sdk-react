import { useYVP } from '../providers/YVPProvider';
import {
  YouVersionAPIUsers,
  type AuthenticationState,
  type YouVersionUserInfo,
  type SignInWithYouVersionPermissionValues,
} from '@youversion/platform-core';
import { useCallback } from 'react';

export function useAuthentication(): {
  auth: AuthenticationState;
  signIn: (
    permissions?: SignInWithYouVersionPermissionValues[],
    optionalPermissions?: SignInWithYouVersionPermissionValues[],
  ) => Promise<void>;
  signOut: () => void;
  fetchUserInfo: () => Promise<YouVersionUserInfo>;
} {
  const { auth, signOut, fetchUserInfo, client: _client } = useYVP();

  const signIn = useCallback(
    async (
      requiredPermissions: SignInWithYouVersionPermissionValues[] = [],
      optionalPermissions: SignInWithYouVersionPermissionValues[] = [],
    ) => {
      const allPermissions = [...requiredPermissions, ...optionalPermissions];
      return await YouVersionAPIUsers.signIn(new Set(allPermissions));
    },
    [],
  );

  return {
    auth,
    signIn,
    signOut,
    fetchUserInfo,
  };
}
