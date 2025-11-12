export interface YouVersionUserInfoJSON {
  first_name?: string;
  last_name?: string;
  id?: string;
  avatar_url?: string;
}

export class YouVersionUserInfo {
  readonly firstName?: string;
  readonly lastName?: string;
  readonly userId?: string;
  readonly avatarUrlFormat?: string;

  constructor(data: YouVersionUserInfoJSON) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid user data provided');
    }

    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.userId = data.id;
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
