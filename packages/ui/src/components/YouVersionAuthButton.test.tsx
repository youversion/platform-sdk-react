/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { YouVersionAPIUsers, YouVersionPlatformConfiguration } from '@youversion/platform-core';
import { YouVersionProvider } from '@youversion/platform-react-hooks';
import { describe, expect, it, vi } from 'vitest';
import { requireShadowRoot } from '@/test/dom-stubs';
import { YouVersionAuthButton } from './YouVersionAuthButton';

describe('YouVersionAuthButton', () => {
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
    const shadowRoot = within(await waitFor(() => requireShadowRoot(container)));
    const explicitSignInButton = await shadowRoot.findByRole('button', { name: /sign in/i });
    await waitFor(() => expect(explicitSignInButton).toBeEnabled());
    fireEvent.click(explicitSignInButton);

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(clearAuthTokens).not.toHaveBeenCalled();

    rerender(renderButton());
    const defaultButton = await shadowRoot.findByRole('button', { name: /sign in/i });
    fireEvent.click(defaultButton);

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));
    expect(clearAuthTokens).not.toHaveBeenCalled();

    rerender(renderButton('auto'));
    const autoButton = await shadowRoot.findByRole('button', { name: /sign out/i });
    fireEvent.click(autoButton);

    expect(clearAuthTokens).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledTimes(2);

    signIn.mockRestore();
    clearAuthTokens.mockRestore();
  });
});
