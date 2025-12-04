'use client';

import { createContext, useContext } from 'react';
import type { AuthContextValue } from '../types/auth';

export const YouVersionAuthContext = createContext<AuthContextValue | null>(null);

export function useYouVersionAuthContext(): AuthContextValue {
  const context = useContext(YouVersionAuthContext);

  if (!context) {
    throw new Error(
      'useYouVersionAuthContext must be used within an auth provider. ' +
        'Make sure your app is wrapped with <YouVersionAuthProvider> from @youversion/platform-react-hooks ' +
        'or create your own provider using YouVersionAuthContext from @youversion/platform-react-hooks.',
    );
  }

  return context;
}
