import type {
  SignInWithYouVersionPermission,
  SignInWithYouVersionResult,
} from '../SignInWithYouVersionResult';

export type SignInWithYouVersionPermissionValues =
  (typeof SignInWithYouVersionPermission)[keyof typeof SignInWithYouVersionPermission];

export interface AuthenticationState {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  idToken: string | null;
  result: SignInWithYouVersionResult | null;
  error: Error | null;
}

export type AuthenticationScopes = 'profile' | 'email';
