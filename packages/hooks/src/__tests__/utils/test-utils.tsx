import React from 'react';
import { YouVersionProvider } from '../../context/YouVersionProvider';
import { useYouVersionAuthContext } from '../../context/YouVersionAuthContext';

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
