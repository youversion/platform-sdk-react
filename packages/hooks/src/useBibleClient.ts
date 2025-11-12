'use client';

import { useContext, useMemo } from 'react';
import { BibleSDKContext } from './context';
import { BibleClient, ApiClient, YouVersionPlatformConfiguration } from '@youversion/platform-core';

export function useBibleClient(): BibleClient {
  const context = useContext(BibleSDKContext);
  return useMemo(() => {
    if (!context?.appId) {
      throw new Error(
        'BibleSDK context not found. Make sure your component is wrapped with BibleSDKProvider and an API key is provided.',
      );
    }
    return new BibleClient(
      new ApiClient({
        appId: context.appId,
        installationId: YouVersionPlatformConfiguration.installationId,
      }),
    );
  }, [context?.appId]);
}
