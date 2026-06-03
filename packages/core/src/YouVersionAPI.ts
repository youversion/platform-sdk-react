import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import { SDK_VERSION_HEADER_NAME, buildSdkVersionHeaderValue } from './version';

export class YouVersionAPI {
  static addStandardHeaders(url: URL): Request {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [SDK_VERSION_HEADER_NAME]: buildSdkVersionHeaderValue(),
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
