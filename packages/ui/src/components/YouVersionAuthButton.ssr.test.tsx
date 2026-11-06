/**
 * @vitest-environment jsdom
 */
import { PassThrough } from 'node:stream';
import { act, waitFor } from '@testing-library/react';
import { YouVersionProvider } from '@youversion/platform-react-hooks';
import type { ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToPipeableStream } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { requireShadowRoot } from '@/test/dom-stubs';
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

it('preserves auth-button phrasing content through streaming SSR and hydration', async () => {
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
