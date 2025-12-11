'use client';

import { createContext } from 'react';

type YouVersionContextData = {
  appKey: string;
  apiHost?: string;
  installationId?: string;
  theme?: 'light' | 'dark';
};

export const YouVersionContext = createContext<YouVersionContextData | null>(null);
