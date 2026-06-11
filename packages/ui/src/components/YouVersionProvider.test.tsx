/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { YouVersionProvider } from '@/components/YouVersionProvider';

const baseProviderMock =
  vi.fn<(props: Record<string, unknown> & { children?: React.ReactNode }) => React.ReactElement>();
baseProviderMock.mockImplementation(({ children }) => <>{children}</>);

vi.mock('@youversion/platform-react-hooks', () => ({
  YouVersionProvider: (props: Record<string, unknown> & { children?: React.ReactNode }) =>
    baseProviderMock(props),
  useYVAuth: vi.fn(),
}));

describe('UI YouVersionProvider', () => {
  it('forwards additionalHeaders to the underlying hooks provider', () => {
    const additionalHeaders = { 'X-YVP-Sdk': 'ReactNativeSDK=1.2.3' };

    render(
      <YouVersionProvider appKey="test-key" additionalHeaders={additionalHeaders}>
        <div data-testid="child">hello</div>
      </YouVersionProvider>,
    );

    expect(baseProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        appKey: 'test-key',
        additionalHeaders,
      }),
    );
  });

  it('omits additionalHeaders when not provided', () => {
    render(
      <YouVersionProvider appKey="test-key">
        <div data-testid="child">hello</div>
      </YouVersionProvider>,
    );

    const lastCall = baseProviderMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall?.appKey).toBe('test-key');
    expect(lastCall?.additionalHeaders).toBeUndefined();
  });

  it.each([
    ['undefined', undefined],
    ['empty string', ''],
    ['whitespace only', '   '],
  ])(
    'renders the missing-app-key message and skips the base provider when appKey is %s',
    (_label, appKey) => {
      baseProviderMock.mockClear();

      render(
        // @ts-expect-error -- exercising the runtime guard with an invalid appKey
        <YouVersionProvider appKey={appKey}>
          <div data-testid="child">hello</div>
        </YouVersionProvider>,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Missing app key')).toBeInTheDocument();
      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
      expect(baseProviderMock).not.toHaveBeenCalled();
    },
  );
});
