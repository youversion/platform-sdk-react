import type { YouVersionUserInfo } from '@youversion/platform-core';
import type { Dispatch, SetStateAction } from 'react';

export interface AuthConfig {
  appKey: string;
  apiHost?: string;
  redirectUri?: string;
}

export interface AuthContextValue {
  userInfo: YouVersionUserInfo | null;
  setUserInfo: Dispatch<SetStateAction<YouVersionUserInfo | null>>;
  isLoading: boolean;
  error: Error | null;
  redirectUri?: string;
  /** State of the verified OAuth callback handled by this provider. */
  oauthCallbackState?: string | null;
  /** Whether the OAuth callback was replaced by another authorization attempt or session. */
  oauthCallbackSuperseded?: boolean;
  /** Whether the host supplied the profile and owns sign-in. */
  isHostControlled?: boolean;
}

export interface AuthProviderProps {
  config: AuthConfig;
  children: React.ReactNode;
}
