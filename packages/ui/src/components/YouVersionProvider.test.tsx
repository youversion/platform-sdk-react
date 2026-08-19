/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
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

  it('sends Accept-Language from locale and does not forward locale to the hooks provider', () => {
    render(
      <YouVersionProvider appKey="test-key" locale="es-MX">
        <div data-testid="child">hello</div>
      </YouVersionProvider>,
    );

    const lastCall = baseProviderMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall?.locale).toBeUndefined();
    expect(lastCall?.additionalHeaders).toEqual({ 'Accept-Language': 'es-MX' });
  });

  it('lets additionalHeaders override Accept-Language from locale', () => {
    render(
      <YouVersionProvider
        appKey="test-key"
        locale="es"
        additionalHeaders={{ 'Accept-Language': 'fr', 'X-Custom': '1' }}
      >
        <div data-testid="child">hello</div>
      </YouVersionProvider>,
    );

    const lastCall = baseProviderMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastCall?.additionalHeaders).toEqual({
      'Accept-Language': 'fr',
      'X-Custom': '1',
    });
  });

  it('mirrors appName and signInPromptMessage onto the UI-bundled config', () => {
    YouVersionPlatformConfiguration.appName = undefined;
    YouVersionPlatformConfiguration.signInPromptMessage = undefined;

    render(
      <YouVersionProvider
        appKey="test-key"
        appName="SDK Demo"
        signInPromptMessage="Save your highlights to your YouVersion account."
      >
        <div data-testid="child">hello</div>
      </YouVersionProvider>,
    );

    expect(YouVersionPlatformConfiguration.appName).toBe('SDK Demo');
    expect(YouVersionPlatformConfiguration.signInPromptMessage).toBe(
      'Save your highlights to your YouVersion account.',
    );
  });

  it.each([
    ['undefined', undefined],
    ['empty string', ''],
    ['whitespace only', '   '],
  ])(
    'renders the missing-app-key message and skips the base provider when appKey is %s',
    (_label, appKey) => {
      baseProviderMock.mockClear();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      render(
        // @ts-expect-error -- exercising the runtime guard with an invalid appKey
        <YouVersionProvider appKey={appKey}>
          <div data-testid="child">hello</div>
        </YouVersionProvider>,
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
      expect(baseProviderMock).not.toHaveBeenCalled();
      // The actionable guidance for developers lives in console.error, not the panel.
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('appKey'));

      errorSpy.mockRestore();
    },
  );
});
