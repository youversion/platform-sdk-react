import { YouVersionPlatformConfiguration } from './YouVersionPlatformConfiguration';

export class URLBuilder {
  private static get baseURL(): URL {
    return new URL(`https://${YouVersionPlatformConfiguration.apiHost}`);
  }
}
