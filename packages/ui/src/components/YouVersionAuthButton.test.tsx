/**
 * @vitest-environment jsdom
 */
import { PassThrough } from 'node:stream';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { YouVersionAPIUsers, YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { YouVersionProvider } from '@youversion/platform-react-hooks';
import type { ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToPipeableStream } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { requireHtmlButton, requireShadowRoot } from '@/test/dom-stubs';
import { YouVersionAuthButton } from './YouVersionAuthButton';

function renderAfterAllReady(element: ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const destination = new PassThrough();
    let html = '';

    destination.setEncoding('utf8');
    destination.on('data', (chunk: string) => {
      html += chunk;
    });
    destination.on('end', () => resolve(html));
    destination.on('error', reject);

    const { pipe } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(destination);
      },
      onShellError: reject,
    });
  });
}

describe('YouVersionAuthButton', () => {
  it('preserves phrasing-content markup through streaming SSR and hydration', async () => {
    const element = (
      <YouVersionProvider
        appKey="test-app-key"
        authRedirectUrl="https://example.com/callback"
        includeAuth
      >
        <p>
          Before <YouVersionAuthButton /> after
        </p>
      </YouVersionProvider>
    );
    const serverMarkup = await renderAfterAllReady(element);

    expect(serverMarkup).toContain(
      '<span data-yv-shadow-host="true" style="display:contents"></span>',
    );

    const container = document.createElement('div');
    container.innerHTML = serverMarkup;
    document.body.append(container);
    const paragraph = container.querySelector('p');
    const serverHost = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
    const recoverableErrors: unknown[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let root: Root | undefined;

    try {
      expect(container.querySelectorAll('p')).toHaveLength(1);
      expect(paragraph).toContainElement(serverHost);
      expect(paragraph).toHaveTextContent('Before after');

      await act(async () => {
        root = hydrateRoot(container, element, {
          onRecoverableError: (error) => recoverableErrors.push(error),
        });
      });

      const shadowRoot = await waitFor(() => requireShadowRoot(container));
      expect(container.querySelector('[data-yv-shadow-host]')).toBe(serverHost);
      expect(shadowRoot.querySelector('button')).not.toBeNull();
      expect(recoverableErrors).toEqual([]);

      // The provider can emit unrelated multiple-renderer errors when server and client
      // renderers share this process, so only reject diagnostics for this regression.
      const invalidNestingDiagnostics = consoleError.mock.calls.filter((call) =>
        call.some((value) =>
          /cannot be a (?:child|descendant) of|cannot contain a nested|validateDOMNesting/i.test(
            String(value),
          ),
        ),
      );
      expect(invalidNestingDiagnostics).toEqual([]);
    } finally {
      if (root) await act(async () => root?.unmount());
      consoleError.mockRestore();
      container.remove();
    }
  });

  it('uses an explicit background for the automatic shadow theme scope', async () => {
    const { container } = render(
      <YouVersionProvider
        appKey="test-app-key"
        authRedirectUrl="https://example.com/callback"
        includeAuth
        theme="dark"
      >
        <YouVersionAuthButton background="light" />
      </YouVersionProvider>,
    );

    const shadowRoot = await waitFor(() => requireShadowRoot(container));
    await waitFor(() => {
      expect(shadowRoot.querySelector('[data-yv-shadow-content-wrapper]')).toHaveAttribute(
        'data-yv-theme',
        'light',
      );
      expect(shadowRoot.querySelector('button')).toHaveAttribute('data-yv-theme', 'light');
    });
  });

  it('uses mode, rather than authentication state alone, to choose the auth action', async () => {
    const signIn = vi.spyOn(YouVersionAPIUsers, 'signIn').mockResolvedValue(undefined);
    const clearAuthTokens = vi
      .spyOn(YouVersionPlatformConfiguration, 'clearAuthTokens')
      .mockImplementation(() => undefined);

    const renderButton = (mode?: 'signIn' | 'signOut' | 'auto') => (
      <YouVersionProvider
        appKey="test-app-key"
        authRedirectUrl="https://example.com/callback"
        includeAuth
        userInfo={{ id: 'authenticated-user' }}
      >
        <YouVersionAuthButton mode={mode} />
      </YouVersionProvider>
    );

    const { container, rerender } = render(renderButton('signIn'));
    const shadowRoot = await waitFor(() => requireShadowRoot(container));
    const findButton = (name: RegExp) =>
      waitFor(() => {
        const button = requireHtmlButton(shadowRoot.querySelector('button'));
        expect(button).toHaveAccessibleName(name);
        return button;
      });
    const explicitSignInButton = await findButton(/sign in/i);
    await waitFor(() => expect(explicitSignInButton).toBeEnabled());
    fireEvent.click(explicitSignInButton);

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(clearAuthTokens).not.toHaveBeenCalled();

    rerender(renderButton());
    const defaultButton = await findButton(/sign in/i);
    fireEvent.click(defaultButton);

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));
    expect(clearAuthTokens).not.toHaveBeenCalled();

    rerender(renderButton('auto'));
    const autoButton = await findButton(/sign out/i);
    fireEvent.click(autoButton);

    expect(clearAuthTokens).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledTimes(2);

    signIn.mockRestore();
    clearAuthTokens.mockRestore();
  });
});
