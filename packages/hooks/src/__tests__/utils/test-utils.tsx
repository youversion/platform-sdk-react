import React from 'react';
import { YouVersionProvider } from '../../context/YouVersionProvider';

/**
 * Creates a test wrapper component with YouVersionAuthProvider
 * @param config Optional auth configuration
 */
export const createAuthProviderWrapper = (): React.ComponentType<{ children: React.ReactNode }> => {
  return ({ children }: { children: React.ReactNode }) => (
    <YouVersionProvider
      appKey="test-app-key"
      apiHost="test-api.example.com"
      includeAuth={true}
      authRedirectUrl="http://test.example.com"
    >
      {children}
    </YouVersionProvider>
  );
};
