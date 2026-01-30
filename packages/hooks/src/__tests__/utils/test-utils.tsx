import React from 'react';
import { render, type RenderResult } from '@testing-library/react';
import { YouVersionProvider } from '../../context/YouVersionProvider';
import { useYouVersionAuthContext } from '../../context/YouVersionAuthContext';
import { ReaderProvider } from '../../context/ReaderProvider';
import type { ReaderProviderOptions } from '../../types/bibles';
import {
  createMockBook,
  createMockChapter,
  createMockVerse,
  createMockVersion,
} from '../mocks/bibles';

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

/**
 * Renders a component wrapped in ReaderProvider for testing
 * @param ui Component to render
 * @param options Optional provider props to override defaults
 */
export const renderWithReaderProvider = (
  ui: React.ReactNode,
  {
    currentVersion = createMockVersion(),
    currentBook = createMockBook(),
    currentChapter = createMockChapter(),
    currentVerse = createMockVerse(),
  }: Partial<ReaderProviderOptions> = {},
): RenderResult => {
  return render(
    <ReaderProvider
      currentVersion={currentVersion}
      currentBook={currentBook}
      currentChapter={currentChapter}
      currentVerse={currentVerse}
    >
      {ui}
    </ReaderProvider>,
  );
};
