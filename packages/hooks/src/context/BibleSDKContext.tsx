'use client';

import { createContext } from 'react';

type BibleSDKContextData = {
  appId: string;
};

export const BibleSDKContext = createContext<BibleSDKContextData | null>(null);
