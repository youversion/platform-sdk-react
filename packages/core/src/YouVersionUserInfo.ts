import type { YouVersionUserInfoJSON } from './schemas/user-info';

export type { YouVersionUserInfoJSON };

export class YouVersionUserInfo {
  readonly name?: string;
  readonly userId?: string;
  readonly email?: string;
  readonly avatarUrlFormat?: string;

  constructor(data: YouVersionUserInfoJSON) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid user data provided');
    }

    this.name = data.name;
    this.userId = data.id;
    this.email = data.email;
    this.avatarUrlFormat = data.avatar_url;
  }

  getAvatarUrl(width: number = 200, height: number = 200): URL | null {
    if (!this.avatarUrlFormat) {
      return null;
    }

    let urlString = this.avatarUrlFormat;

    if (urlString.startsWith('//')) {
      urlString = 'https:' + urlString;
    }

    urlString = urlString.replace('{width}', width.toString());
    urlString = urlString.replace('{height}', height.toString());

    try {
      return new URL(urlString);
    } catch {
      return null;
    }
  }

  get avatarUrl(): URL | null {
    return this.getAvatarUrl();
  }
}
