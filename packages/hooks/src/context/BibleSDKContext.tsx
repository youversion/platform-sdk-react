'use client';

import { createContext } from 'react';

type BibleSDKContextData = {
  appKey: string;
};

export const BibleSDKContext = createContext<BibleSDKContextData | null>(null);
