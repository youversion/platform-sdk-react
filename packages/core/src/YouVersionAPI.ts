import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';
import { SDK_VERSION_HEADER_NAME, buildSdkVersionHeaderValue } from './version';

export class YouVersionAPI {
  static addStandardHeaders(url: URL): Request {
    const headers = new Headers({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      [SDK_VERSION_HEADER_NAME]: buildSdkVersionHeaderValue(),
    });

    const appKey = YouVersionPlatformConfiguration.appKey;
    if (appKey) {
      headers.set('X-YVP-App-Key', appKey);
    }

    const installationId = YouVersionPlatformConfiguration.installationId;
    if (installationId) {
      headers.set('X-YVP-Installation-ID', installationId);
    }

    return new Request(url.toString(), {
      headers,
    });
  }
}
