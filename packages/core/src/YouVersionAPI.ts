import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';

export class YouVersionAPI {
  static addStandardHeaders(url: URL): Request {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const appKey = YouVersionPlatformConfiguration.appKey;
    if (appKey) {
      headers['X-YVP-App-Key'] = appKey;
    }

    const installationId = YouVersionPlatformConfiguration.installationId;
    if (installationId) {
      headers['X-YVP-Installation-ID'] = installationId;
    }

    const request = new Request(url.toString(), {
      headers,
    });
    return request;
  }
}
