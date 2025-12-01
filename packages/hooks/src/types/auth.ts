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
}

export interface AuthProviderProps {
  config: AuthConfig;
  children: React.ReactNode;
}
