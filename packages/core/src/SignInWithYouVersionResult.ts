import type { SignInWithYouVersionPermissionValues } from './types';

export const SignInWithYouVersionPermission = {
  bibles: 'bibles',
  highlights: 'highlights',
  votd: 'votd',
  demographics: 'demographics',
  bibleActivity: 'bible_activity',
} as const;

export class SignInWithYouVersionResult {
  public readonly accessToken: string | null;
  public readonly refreshToken: string | null;
  public readonly expiryDate: Date | null;
  public readonly permissions: SignInWithYouVersionPermissionValues[];
  public readonly yvpUserId: string | null;
  public readonly name: string | null;
  public readonly profilePicture: string | null;
  public readonly email: string | null;

  constructor(
    accessToken: string | null,
    expiresIn: string | null,
    refreshToken: string | null,
    permissions: SignInWithYouVersionPermissionValues[],
    yvpUserId?: string,
    name?: string,
    profilePicture?: string,
    email?: string,
  ) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    // Calculate expiry date from expires_in (in seconds)
    const seconds = parseInt(expiresIn || '0', 10);
    this.expiryDate = seconds > 0 ? new Date(Date.now() + seconds * 1000) : null;

    this.permissions = permissions;
    this.yvpUserId = yvpUserId || null;
    this.name = name || yvpUserId || null; // Use yvpUserId as fallback for name
    this.profilePicture = profilePicture || null;
    this.email = email || null;
  }
}
