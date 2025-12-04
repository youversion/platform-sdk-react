import type { SignInWithYouVersionPermissionValues } from './types';

export const SignInWithYouVersionPermission = {
  bibles: 'bibles',
  highlights: 'highlights',
  votd: 'votd',
  demographics: 'demographics',
  bibleActivity: 'bible_activity',
} as const;

type SignInWithYouVersionResultProps = {
  accessToken?: string;
  expiresIn?: number;
  refreshToken?: string;
  idToken?: string;
  permissions?: SignInWithYouVersionPermissionValues[];
  yvpUserId?: string;
  name?: string;
  profilePicture?: string;
  email?: string;
};
export class SignInWithYouVersionResult {
  public readonly accessToken: string | undefined;
  public readonly expiryDate: Date | undefined;
  public readonly refreshToken: string | undefined;
  public readonly idToken: string | undefined;
  public readonly permissions: SignInWithYouVersionPermissionValues[] | undefined;
  public readonly yvpUserId: string | undefined;
  public readonly name: string | undefined;
  public readonly profilePicture: string | undefined;
  public readonly email: string | undefined;

  constructor({
    accessToken,
    expiresIn,
    refreshToken,
    idToken,
    permissions,
    yvpUserId,
    name,
    profilePicture,
    email,
  }: SignInWithYouVersionResultProps) {
    this.accessToken = accessToken;
    this.expiryDate = expiresIn ? new Date(Date.now() + expiresIn * 1000) : new Date();
    this.refreshToken = refreshToken;
    this.idToken = idToken;
    this.permissions = permissions;
    this.yvpUserId = yvpUserId;
    this.name = name;
    this.profilePicture = profilePicture;
    this.email = email;
  }
}
