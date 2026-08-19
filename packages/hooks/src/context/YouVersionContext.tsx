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
