import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { URLBuilder } from '../URLBuilder';
import { YouVersionPlatformConfiguration } from '../YouVersionPlatformConfiguration';

describe('URLBuilder', () => {
  let originalApiHost: string;

  beforeEach(() => {
    originalApiHost = YouVersionPlatformConfiguration.apiHost;
    YouVersionPlatformConfiguration.apiHost = 'api-dev.youversion.com';
  });

  afterEach(() => {
    YouVersionPlatformConfiguration.apiHost = originalApiHost;
  });

  it('should exist as a class', () => {
    expect(URLBuilder).toBeDefined();
  });
});
