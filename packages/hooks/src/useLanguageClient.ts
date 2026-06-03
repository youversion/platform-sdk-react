'use client';

import { useContext, useMemo } from 'react';
import { YouVersionContext } from './context';
import { ApiClient, LanguagesClient } from '@youversion/platform-core';

export function useLanguagesClient(): LanguagesClient {
  const context = useContext(YouVersionContext);

  return useMemo(() => {
    if (!context?.appKey) {
      throw new Error(
        'YouVersion context not found. Make sure your component is wrapped with YouVersionProvider and an API key is provided.',
      );
    }

    return new LanguagesClient(
      new ApiClient({
        appKey: context.appKey,
        apiHost: context.apiHost,
        installationId: context.installationId,
        additionalHeaders: context.additionalHeaders,
      }),
    );
  }, [context?.apiHost, context?.appKey, context?.installationId, context?.additionalHeaders]);
}
