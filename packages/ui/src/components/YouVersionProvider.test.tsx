/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { YouVersionProvider } from '@/components/YouVersionProvider';
import i18n from '@/i18n';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';

const baseProviderMock =
  vi.fn<(props: Record<string, unknown> & { children?: React.ReactNode }) => React.ReactElement>();
baseProviderMock.mockImplementation(({ children }) => <>{children}</>);

vi.mock('@youversion/platform-react-hooks', () => ({
  YouVersionProvider: (props: Record<string, unknown> & { children?: React.ReactNode }) =>
    baseProviderMock(props),
  useYVAuth: vi.fn(),
}));

function VerseOfTheDayHeading() {
  const { t } = useTranslation(undefined, { i18n });
  return <p>{t('verseOfTheDay')}</p>;
}

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

  it('uses lng for bundled copy instead of the browser language', async () => {
    vi.stubGlobal('navigator', {
      language: 'en-US',
      languages: ['en-US', 'en'],
    });
    baseProviderMock.mockClear();

    const { rerender } = render(
      <YouVersionProvider appKey="test-key" lng="es">
        <VerseOfTheDayHeading />
      </YouVersionProvider>,
    );

    expect(await screen.findByText(es.verseOfTheDay)).toBeInTheDocument();
    expect(screen.queryByText(en.verseOfTheDay)).not.toBeInTheDocument();
    expect(baseProviderMock.mock.calls.at(-1)?.[0]).not.toHaveProperty('lng');

    rerender(
      <YouVersionProvider appKey="test-key" lng="es-MX">
        <VerseOfTheDayHeading />
      </YouVersionProvider>,
    );

    expect(await screen.findByText(es.verseOfTheDay)).toBeInTheDocument();

    await i18n.changeLanguage('en');
    vi.unstubAllGlobals();
  });
});
