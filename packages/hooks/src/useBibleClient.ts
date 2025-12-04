'use client';

import { useContext, useMemo } from 'react';
import { YouVersionContext } from './context';
import { BibleClient, ApiClient } from '@youversion/platform-core';

export function useBibleClient(): BibleClient {
  const context = useContext(YouVersionContext);

  return useMemo(() => {
    if (!context?.appKey) {
      throw new Error(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    }

    return new BibleClient(
      new ApiClient({
        appKey: context.appKey,
        apiHost: context.apiHost,
        installationId: context.installationId,
      }),
    );
  }, [context?.apiHost, context?.appKey, context?.installationId]);
}
