/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import React, { useContext } from 'react';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { YouVersionContext } from '@youversion/platform-react-hooks';
import { YouVersionProvider } from '@/components/YouVersionProvider';
import i18n from '@/i18n';

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

  it('sends Accept-Language from locale', () => {
    render(
      <YouVersionProvider appKey="test-key" locale="es-MX">
        <AdditionalHeadersProbe />
      </YouVersionProvider>,
    );

    expect(screen.getByTestId('headers').textContent).toBe(
      JSON.stringify({ 'Accept-Language': 'es-MX' }),
    );
  });

  it('lets additionalHeaders override Accept-Language from locale', () => {
    render(
      <YouVersionProvider
        appKey="test-key"
        locale="es"
        additionalHeaders={{ 'Accept-Language': 'fr', 'X-Custom': '1' }}
      >
        <AdditionalHeadersProbe />
      </YouVersionProvider>,
    );

    expect(screen.getByTestId('headers').textContent).toBe(
      JSON.stringify({ 'Accept-Language': 'fr', 'X-Custom': '1' }),
    );
  });

  it('lets additionalHeaders override Accept-Language from locale regardless of header casing', () => {
    render(
      <YouVersionProvider
        appKey="test-key"
        locale="es-MX"
        additionalHeaders={{ 'accept-language': 'fr', 'X-Custom': '1' }}
      >
        <AdditionalHeadersProbe />
      </YouVersionProvider>,
    );

    expect(screen.getByTestId('headers').textContent).toBe(
      JSON.stringify({ 'accept-language': 'fr', 'X-Custom': '1' }),
    );
  });

  it('forwards appName and signInPromptMessage onto the shared core config', () => {
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
      expect(
        screen.getByText(
          "This Bible content couldn't be loaded because the app key is missing or invalid.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
      // The actionable guidance for developers lives in console.error, not the panel.
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('appKey'));

      errorSpy.mockRestore();
    },
  );

  it('translates the missing-app-key panel from locale without loading the full catalog', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      // @ts-expect-error -- exercising the runtime guard with an invalid appKey
      <YouVersionProvider appKey="" locale="es">
        <div data-testid="child">hello</div>
      </YouVersionProvider>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Este contenido bíblico no se pudo cargar porque la clave de la aplicación falta o no es válida.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('child')).not.toBeInTheDocument();

    errorSpy.mockRestore();
  });

  it('uses locale instead of the browser language', async () => {
    vi.stubGlobal('navigator', {
      language: 'en-US',
      languages: ['en-US', 'en'],
    });

    const { rerender } = render(
      <YouVersionProvider appKey="test-key" locale="es">
        <div />
      </YouVersionProvider>,
    );

    await waitFor(() => {
      expect(i18n.language).toBe('es');
    });

    rerender(
      <YouVersionProvider appKey="test-key" locale="es-MX">
        <div />
      </YouVersionProvider>,
    );

    await waitFor(() => {
      expect(i18n.language).toBe('es');
    });

    await i18n.changeLanguage('en');
    vi.unstubAllGlobals();
  });

  it('starts loading an explicit locale during SSR without waiting for layout effects', async () => {
    await i18n.changeLanguage('en');

    renderToString(
      <YouVersionProvider appKey="test-key" locale="es">
        <div />
      </YouVersionProvider>,
    );

    await waitFor(() => {
      expect(i18n.language).toBe('es');
    });

    await i18n.changeLanguage('en');
  });
});
