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
  public readonly permissions: SignInWithYouVersionPermissionValues[];
  public readonly errorMsg: string | null;
  public readonly yvpUserId: string | null;

  constructor(url: URL) {
    const queryParams = new URLSearchParams(url.search);

    const status = queryParams.get('status');
    const userId = queryParams.get('yvp_user_id');
    const latValue = queryParams.get('lat');
    const grants = queryParams.get('grants');

    const perms =
      grants
        ?.split(',')
        .map((grant) => grant.trim())
        .filter((grant) =>
          Object.values(SignInWithYouVersionPermission).includes(
            grant as SignInWithYouVersionPermissionValues,
          ),
        )
        .map((grant) => grant as SignInWithYouVersionPermissionValues) ?? [];

    if (status === 'success' && latValue && userId) {
      this.accessToken = latValue;
      this.permissions = perms;
      this.errorMsg = null;
      this.yvpUserId = userId;
    } else if (status === 'canceled') {
      this.accessToken = null;
      this.permissions = [];
      this.errorMsg = null;
      this.yvpUserId = null;
    } else {
      this.accessToken = null;
      this.permissions = [];
      this.errorMsg = 'Authentication failed';
      this.yvpUserId = null;
    }
  }
}
