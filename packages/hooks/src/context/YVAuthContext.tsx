'use client';

import { createContext, useContext } from 'react';
import type { AuthContextValue } from '../types/auth';

export const YVAuthContext = createContext<AuthContextValue | null>(null);

export function useYVAuthContext(): AuthContextValue {
  const context = useContext(YVAuthContext);

  if (!context) {
    throw new Error(
      'useYVAuthContext must be used within an auth provider. ' +
        'Make sure your app is wrapped with <YVAuthProvider> from @youversion/platform-react-hooks ' +
        'or create your own provider using YVAuthContext from @youversion/platform-react-hooks.',
    );
  }

  return context;
}
