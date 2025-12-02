'use client';

import { createContext } from 'react';

type YouVersionContextData = {
  appKey: string;
  apiHost?: string;
  installationId?: string;
};

export const YouVersionContext = createContext<YouVersionContextData | null>(null);
