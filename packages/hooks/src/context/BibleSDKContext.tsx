'use client';

import { createContext } from 'react';

type BibleSDKContextData = {
  appKey: string;
  apiHost?: string;
  installationId?: string;
};

export const BibleSDKContext = createContext<BibleSDKContextData | null>(null);
