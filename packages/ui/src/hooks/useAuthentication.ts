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
    redirectUrl: string,
    permissions?: SignInWithYouVersionPermissionValues[],
  ) => Promise<SignInWithYouVersionResult | void>;
  signOut: () => void;
  fetchUserInfo: () => YouVersionUserInfo;
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
