import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';

export class YouVersionAPI {
  static addStandardHeaders(url: URL): Request {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    // Add app ID header
    const appId = YouVersionPlatformConfiguration.appId;
    if (appId) {
      headers['X-App-Id'] = appId;
    }

    // Add installation ID header
    const installationId = YouVersionPlatformConfiguration.installationId;
    if (installationId) {
      headers['x-yvp-installation-id'] = installationId;
    }

    const request = new Request(url.toString(), {
      headers,
    });
    return request;
  }
}
