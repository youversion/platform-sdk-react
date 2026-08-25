'use client';

import { createContext } from 'react';
import type { BibleClient, LanguagesClient, OrganizationsClient } from '@youversion/platform-core';
import type { HookOverrides } from '../hook-overrides';

export type { HookOverrides };

export type YouVersionContextData = {
  appKey: string;
  apiHost?: string;
  installationId?: string;
  theme?: 'light' | 'dark';
  authEnabled?: boolean;
  additionalHeaders?: Record<string, string>;
  /**
   * @internal
   *
   * A JSON string of `additionalHeaders` with the keys in sorted order.
   * When `additionalHeaders` is not set, the value is `null`.
   * `YouVersionProvider` builds this string once.
   * The memo for the API client and the `queryKey` both use this string.
   * As a result, they use the same value for the same headers.
   */
  additionalHeadersKey?: string | null;
  /** Test seam: skip constructing a live BibleClient. */
  bibleClient?: BibleClient;
  /** Test seam: skip constructing a live LanguagesClient. */
  languagesClient?: LanguagesClient;
  /** Test seam: skip constructing a live OrganizationsClient. */
  organizationsClient?: OrganizationsClient;
  /** Test seam: return stub hook results without fetching. */
  hookOverrides?: HookOverrides;
};

export const YouVersionContext = createContext<YouVersionContextData | null>(null);
