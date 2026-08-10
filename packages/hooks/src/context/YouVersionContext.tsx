'use client';

import { createContext } from 'react';
import type { ApiClient } from '@youversion/platform-core';

type YouVersionContextData = {
  appKey: string;
  apiHost?: string;
  installationId?: string;
  theme?: 'light' | 'dark';
  authEnabled?: boolean;
  additionalHeaders?: Record<string, string>;
  /**
   * Per-request timeout in milliseconds, passed to `ApiClient`. Undefined keeps
   * the client's own 10000 ms default.
   */
  timeout?: number;
  /**
   * The one `ApiClient` every hook under this provider shares.
   *
   * `ApiClient` deduplicates concurrent GETs through a private per-instance map,
   * so sibling components only collapse their requests when they hold the *same*
   * instance. `YouVersionProvider` builds it once and puts it here.
   *
   * Optional because this context is public API: a consumer may render
   * `YouVersionContext.Provider` by hand. `useApiClient` falls back to building
   * a per-hook client in that case, which still works but does not share
   * in-flight requests between siblings.
   */
  apiClient?: ApiClient;
};

export const YouVersionContext = createContext<YouVersionContextData | null>(null);
