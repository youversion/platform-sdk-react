/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React, { useContext } from 'react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { YouVersionContext } from '@youversion/platform-react-hooks';
import { YouVersionProvider } from '@/components/YouVersionProvider';

function AdditionalHeadersProbe(): React.ReactElement {
  const headers = useContext(YouVersionContext)?.additionalHeaders;
  return <div data-testid="headers">{headers ? JSON.stringify(headers) : 'none'}</div>;
}

describe('UI YouVersionProvider', () => {
  it('forwards additionalHeaders to the underlying hooks provider', () => {
    const additionalHeaders = { 'X-YVP-Sdk': 'ReactNativeSDK=1.2.3' };

    render(
      <YouVersionProvider appKey="test-key" additionalHeaders={additionalHeaders}>
        <AdditionalHeadersProbe />
      </YouVersionProvider>,
    );

    expect(screen.getByTestId('headers').textContent).toBe(JSON.stringify(additionalHeaders));
  });

  it('omits additionalHeaders when not provided', () => {
    render(
      <YouVersionProvider appKey="test-key">
        <AdditionalHeadersProbe />
      </YouVersionProvider>,
    );

    expect(screen.getByTestId('headers').textContent).toBe('none');
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
      // The actionable guidance for developers lives in console.error, not the panel.
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('appKey'));

      errorSpy.mockRestore();
    },
  );
});
