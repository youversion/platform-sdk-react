import type {
  SignInWithYouVersionPermission,
  SignInWithYouVersionResult,
} from '../SignInWithYouVersionResult';

export type SignInWithYouVersionPermissionValues =
  (typeof SignInWithYouVersionPermission)[keyof typeof SignInWithYouVersionPermission];

export interface AuthenticationState {
  readonly isAuthenticated: boolean;
  readonly isLoading: boolean;
  readonly accessToken: string | null;
  readonly idToken: string | null;
  readonly result: SignInWithYouVersionResult | null;
  readonly error: Error | null;
}

export type AuthenticationScopes = 'profile' | 'email';
