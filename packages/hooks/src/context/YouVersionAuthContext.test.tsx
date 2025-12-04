import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { type ReactNode } from 'react';
import { YouVersionAuthContext, useYouVersionAuthContext } from './YouVersionAuthContext';
import type { AuthContextValue } from '../types/auth';

const mockContextValue: AuthContextValue = {
  userInfo: {
    userId: '123',
    name: 'John Doe',
    email: 'john@example.com',
    avatarUrlFormat: 'https://example.com/avatar.jpg',
    getAvatarUrl: () => new URL('https://example.com/avatar.jpg'),
    avatarUrl: new URL('https://example.com/avatar.jpg'),
  },
  setUserInfo: () => {
    // Mock function for testing
  },
  isLoading: false,
  error: null,
};

function TestWrapper({
  children,
  value = mockContextValue,
}: {
  children: ReactNode;
  value?: AuthContextValue | null;
}) {
  return <YouVersionAuthContext.Provider value={value}>{children}</YouVersionAuthContext.Provider>;
}

describe('YouVersionAuthContext', () => {
  describe('useYouVersionAuthContext', () => {
    it('should return context value when used within provider', () => {
      const { result } = renderHook(() => useYouVersionAuthContext(), {
        wrapper: ({ children }) => <TestWrapper>{children}</TestWrapper>,
      });

      expect(result.current).toEqual(mockContextValue);
      expect(result.current.userInfo).toEqual(mockContextValue.userInfo);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.setUserInfo).toBe('function');
    });

    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useYouVersionAuthContext());
      }).toThrow(
        'useYouVersionAuthContext must be used within an auth provider. ' +
          'Make sure your app is wrapped with <YouVersionAuthProvider> from @youversion/platform-react-hooks ' +
          'or create your own provider using YouVersionAuthContext from @youversion/platform-react-hooks.',
      );
    });

    it('should throw error when context value is null', () => {
      expect(() => {
        renderHook(() => useYouVersionAuthContext(), {
          wrapper: ({ children }) => <TestWrapper value={null}>{children}</TestWrapper>,
        });
      }).toThrow(
        'useYouVersionAuthContext must be used within an auth provider. ' +
          'Make sure your app is wrapped with <YouVersionAuthProvider> from @youversion/platform-react-hooks ' +
          'or create your own provider using YouVersionAuthContext from @youversion/platform-react-hooks.',
      );
    });

    it('should work with different context values', () => {
      const customContextValue: AuthContextValue = {
        userInfo: null,
        setUserInfo: () => {
          // Mock function for testing
        },
        isLoading: true,
        error: new Error('Test error'),
      };

      const { result } = renderHook(() => useYouVersionAuthContext(), {
        wrapper: ({ children }) => <TestWrapper value={customContextValue}>{children}</TestWrapper>,
      });

      expect(result.current.userInfo).toBe(null);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error?.message).toBe('Test error');
    });
  });
});
