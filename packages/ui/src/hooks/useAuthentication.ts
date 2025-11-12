import { useYVP } from '../providers/YVPProvider';
import {
  YouVersionAPIUsers,
  type AuthenticationState,
  type YouVersionUserInfo,
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
  const { auth, signOut, fetchUserInfo, client: _client } = useYVP();

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

  return {
    auth,
    signIn,
    signOut,
    fetchUserInfo,
  };
}
