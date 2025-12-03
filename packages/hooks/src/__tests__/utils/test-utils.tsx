import React from 'react';
import { YouVersionAuthProvider } from '../../context/YouVersionAuthProvider';
import { useYouVersionAuthContext } from '../../context/YouVersionAuthContext';
import type { AuthConfig } from '../../types/auth';

/**
 * Creates a test wrapper component with YouVersionAuthProvider
 * @param config Optional auth configuration
 */
export const createAuthProviderWrapper = (
  config: AuthConfig = {
    appKey: 'test-app-key',
    apiHost: 'test-api.example.com',
  },
): React.ComponentType<{ children: React.ReactNode }> => {
  return ({ children }: { children: React.ReactNode }) => (
    <YouVersionAuthProvider config={config}>{children}</YouVersionAuthProvider>
  );
};

/**
 * Test component to access auth context for testing
 */
export function TestAuthChild({ onRender }: { onRender?: (data: any) => void }): React.JSX.Element {
  const context = useYouVersionAuthContext();

  React.useEffect(() => {
    if (onRender) {
      onRender(context);
    }
  }, [context, onRender]);

  return (
    <div>
      <div data-testid="user-info">
        {context.userInfo ? JSON.stringify(context.userInfo) : 'null'}
      </div>
      <div data-testid="is-loading">{context.isLoading.toString()}</div>
      <div data-testid="error">{context.error ? context.error.message : 'null'}</div>
    </div>
  );
}
