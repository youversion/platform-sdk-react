/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { render } from '@testing-library/react';
import { YVPErrorBoundary } from './YVPErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ message }: { message: string }) => {
  throw new Error(message);
};

// Component that doesn't throw
const SafeComponent = () => <div>Safe content</div>;

describe('YVPErrorBoundary - Environment-aware error handling', () => {
  let originalNodeEnv: string | undefined;
  let consoleErrorSpy: Mock<(...args: unknown[]) => void>;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
      // Intentionally empty - suppresses console.error output in tests
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    consoleErrorSpy.mockRestore();
  });

  describe('Production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should show generic error message without error details in production', () => {
      const { container, queryByText } = render(
        <YVPErrorBoundary>
          <ThrowError message="Sensitive production error with API details" />
        </YVPErrorBoundary>,
      );

      // Should show generic error message
      expect(queryByText('Something went wrong')).not.toBeNull();
      expect(
        queryByText('We encountered an error while loading YouVersion Platform components.'),
      ).not.toBeNull();

      // Should NOT show error details
      expect(queryByText(/Sensitive production error/i)).toBeNull();
      expect(container.querySelector('details')).toBeNull();
      expect(container.querySelector('pre')).toBeNull();
    });

    it('should NOT log error details to console in production', () => {
      render(
        <YVPErrorBoundary>
          <ThrowError message="Production error" />
        </YVPErrorBoundary>,
      );

      // The error boundary should not log in production
      // (React itself may still log, but our boundary shouldn't)
      const ourLogs = consoleErrorSpy.mock.calls.filter((call: unknown[]) =>
        call.some((arg: unknown) => typeof arg === 'string' && arg.includes('YVP Error Boundary')),
      );
      expect(ourLogs).toHaveLength(0);
    });

    it('should still call onError callback in production', () => {
      const onErrorMock = vi.fn();
      const errorMessage = 'Production error';

      render(
        <YVPErrorBoundary onError={onErrorMock}>
          <ThrowError message={errorMessage} />
        </YVPErrorBoundary>,
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: errorMessage,
        }),
        expect.objectContaining({
          componentStack: expect.any(String) as string,
        }),
      );
    });

    it('should render custom fallback in production if provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

      const { getByTestId, queryByText } = render(
        <YVPErrorBoundary fallback={customFallback}>
          <ThrowError message="Error" />
        </YVPErrorBoundary>,
      );

      expect(getByTestId('custom-fallback')).not.toBeNull();
      // Should not show default error message when custom fallback is provided
      expect(queryByText('Something went wrong')).toBeNull();
    });
  });

  describe('Development mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should show detailed error message with error details in development', () => {
      const errorMessage = 'Detailed development error for debugging';

      const { container, queryByText } = render(
        <YVPErrorBoundary>
          <ThrowError message={errorMessage} />
        </YVPErrorBoundary>,
      );

      // Should show generic error message
      expect(queryByText('Something went wrong')).not.toBeNull();

      // Should show error details in development
      expect(container.querySelector('details')).not.toBeNull();
      const summary = container.querySelector('summary');
      expect(summary).not.toBeNull();
      expect(summary?.textContent).toContain('Error details (development only)');

      // The error message should be in the pre tag
      const preElement = container.querySelector('pre');
      expect(preElement).not.toBeNull();
      expect(preElement?.textContent).toContain(errorMessage);
    });

    it('should log error details to console in development', () => {
      render(
        <YVPErrorBoundary>
          <ThrowError message="Development error" />
        </YVPErrorBoundary>,
      );

      // Should have logged with our custom message
      const ourLogs = consoleErrorSpy.mock.calls.filter((call: unknown[]) =>
        call.some((arg: unknown) => typeof arg === 'string' && arg.includes('YVP Error Boundary')),
      );
      expect(ourLogs.length).toBeGreaterThan(0);
    });

    it('should still call onError callback in development', () => {
      const onErrorMock = vi.fn();
      const errorMessage = 'Development error';

      render(
        <YVPErrorBoundary onError={onErrorMock}>
          <ThrowError message={errorMessage} />
        </YVPErrorBoundary>,
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: errorMessage,
        }),
        expect.any(Object),
      );
    });

    it('should render custom fallback in development if provided (ignoring error details)', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error UI</div>;

      const { getByTestId, queryByText } = render(
        <YVPErrorBoundary fallback={customFallback}>
          <ThrowError message="Error with details" />
        </YVPErrorBoundary>,
      );

      expect(getByTestId('custom-fallback')).not.toBeNull();
      // Should not show default error UI when custom fallback is provided
      expect(queryByText('Something went wrong')).toBeNull();
    });
  });

  describe('Happy path (no errors)', () => {
    it('should render children normally when no error occurs', () => {
      const { queryByText } = render(
        <YVPErrorBoundary>
          <SafeComponent />
        </YVPErrorBoundary>,
      );

      expect(queryByText('Safe content')).not.toBeNull();
      expect(queryByText('Something went wrong')).toBeNull();
    });

    it('should not call onError when no error occurs', () => {
      const onErrorMock = vi.fn();

      render(
        <YVPErrorBoundary onError={onErrorMock}>
          <SafeComponent />
        </YVPErrorBoundary>,
      );

      expect(onErrorMock).not.toHaveBeenCalled();
    });
  });

  describe('Error recovery', () => {
    it('should catch errors from deeply nested components', () => {
      const DeepChild = () => <ThrowError message="Deep error" />;
      const MiddleChild = () => <DeepChild />;

      const { queryByText } = render(
        <YVPErrorBoundary>
          <MiddleChild />
        </YVPErrorBoundary>,
      );

      expect(queryByText('Something went wrong')).not.toBeNull();
    });

    it('should provide error info to onError callback', () => {
      const onErrorMock = vi.fn();

      render(
        <YVPErrorBoundary onError={onErrorMock}>
          <ThrowError message="Test error" />
        </YVPErrorBoundary>,
      );

      expect(onErrorMock).toHaveBeenCalled();
      const callArgs = onErrorMock.mock.calls[0];
      expect(callArgs).toBeDefined();
      if (callArgs && callArgs.length >= 2) {
        const error = callArgs[0] as Error;
        const errorInfo = callArgs[1] as { componentStack: string };

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Test error');
        expect(errorInfo).toHaveProperty('componentStack');
        expect(typeof errorInfo.componentStack).toBe('string');
      }
    });
  });
});
