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
    redirectUrl: string,
    permissions?: SignInWithYouVersionPermissionValues[],
  ) => Promise<void>;
  signOut: () => void;
  fetchUserInfo: () => Promise<YouVersionUserInfo>;
} {
  const { auth, signOut, fetchUserInfo, client: _client } = useYVP();

  const signIn = useCallback(
    async (redirectUrl: string, permissions: SignInWithYouVersionPermissionValues[] = []) => {
      return await YouVersionAPIUsers.signIn(new Set(permissions), redirectUrl);
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
