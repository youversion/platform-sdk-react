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
  yvpUserId?: string;
  name?: string;
  profilePicture?: string;
  email?: string;
  permissions?: string[];
};
export class SignInWithYouVersionResult {
  public readonly accessToken: string | undefined;
  public readonly expiryDate: Date | undefined;
  public readonly refreshToken: string | undefined;
  public readonly yvpUserId: string | undefined;
  public readonly name: string | undefined;
  public readonly profilePicture: string | undefined;
  public readonly email: string | undefined;
  /**
   * Data-exchange permissions the server reported as granted for this sign-in
   * (parsed from `granted_permissions` on the callback). Empty when the callback
   * carried none. Additive: existing consumers can ignore it.
   */
  public permissions: string[];

  constructor({
    accessToken,
    expiresIn,
    refreshToken,
    yvpUserId,
    name,
    profilePicture,
    email,
    permissions,
  }: SignInWithYouVersionResultProps) {
    this.accessToken = accessToken;
    this.expiryDate = expiresIn ? new Date(Date.now() + expiresIn * 1000) : new Date();
    this.refreshToken = refreshToken;
    this.yvpUserId = yvpUserId;
    this.name = name;
    this.profilePicture = profilePicture;
    this.email = email;
    this.permissions = permissions ?? [];
  }
}
