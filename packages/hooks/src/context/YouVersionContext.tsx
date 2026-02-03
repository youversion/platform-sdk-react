'use client';

import { createContext } from 'react';

type YouVersionContextData = {
  appKey: string;
  apiHost?: string;
  installationId?: string;
  theme?: 'light' | 'dark';
  authEnabled?: boolean;
};

export const YouVersionContext = createContext<YouVersionContextData | null>(null);
