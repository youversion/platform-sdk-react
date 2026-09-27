import { renderToString } from 'react-dom/server';
import { act, render, waitFor } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { YouVersionContext } from '@youversion/platform-react-hooks';
import { describe, expect, it, vi } from 'vitest';
import { FootnoteContent, ProfileAvatar, Separator } from './index';

describe('leaf component shadow isolation', () => {
  it.each([
    {
      name: 'ProfileAvatar',
      element: createElement(ProfileAvatar, { name: 'Cam Anderson' }),
      hostElement: 'span',
      selector: '[data-slot="avatar"]',
    },
    {
      name: 'Separator',
      element: createElement(Separator),
      hostElement: 'div',
      selector: '[data-slot="separator"]',
    },
    {
      name: 'FootnoteContent',
      element: createElement(FootnoteContent, {
        verseNum: '16',
        notes: ['A note'],
        verseHtml: 'For God so loved the world.',
        reference: 'John 3',
      }),
      hostElement: 'div',
      selector: '[data-slot="yv-bible-note"]',
    },
  ] satisfies Array<{
    name: string;
    element: ReactElement;
    hostElement: 'div' | 'span';
    selector: string;
  }>)(
    '$name renders one automatic boundary with its production element inside',
    async ({ element, hostElement, selector }) => {
      expect(renderToString(element)).toBe(
        `<${hostElement} data-yv-shadow-host="true"></${hostElement}>`,
      );

      const { container, unmount } = render(element);
      const host = await waitFor(() => {
        const candidate = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
        const scope = candidate?.shadowRoot?.querySelector('[data-yv-shadow-content-wrapper]');
        if (
          !scope?.hasAttribute('data-yv-sdk') ||
          !candidate?.shadowRoot?.querySelector(selector)
        ) {
          throw new Error('production element not mounted inside an open shadow root');
        }
        return candidate;
      });

      expect(container.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(1);
      expect(host.shadowRoot).not.toBeNull();
      expect(host.shadowRoot?.querySelector('[data-yv-shadow-content-wrapper]')).toHaveAttribute(
        'data-yv-theme',
        'light',
      );
      unmount();
    },
  );

  it('preserves the avatar phrasing host through server parsing and hydration', async () => {
    const element = (
      <p>
        Before <ProfileAvatar name="Cam Anderson" /> after
      </p>
    );
    const serverMarkup = renderToString(element);
    expect(serverMarkup).toBe('<p>Before <span data-yv-shadow-host="true"></span> after</p>');

    const container = document.createElement('div');
    container.innerHTML = serverMarkup;
    document.body.append(container);
    const serverHost = container.querySelector('[data-yv-shadow-host]');
    const recoverableErrors: unknown[] = [];
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let root: ReturnType<typeof hydrateRoot> | undefined;

    try {
      await act(async () => {
        root = hydrateRoot(container, element, {
          onRecoverableError: (error) => recoverableErrors.push(error),
        });
      });

      expect(container.children).toHaveLength(1);
      expect(container.firstElementChild).toHaveProperty('tagName', 'P');
      expect(container.querySelector('[data-yv-shadow-host]')).toBe(serverHost);
      expect(recoverableErrors).toEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      await act(async () => root?.unmount());
      consoleError.mockRestore();
      container.remove();
    }
  });

  it('carries the resolved provider theme into an automatic boundary', async () => {
    const { container } = render(
      <YouVersionContext.Provider value={{ appKey: 'test', theme: 'dark' }}>
        <ProfileAvatar name="Cam Anderson" />
      </YouVersionContext.Provider>,
    );

    await waitFor(() => {
      expect(
        container
          .querySelector<HTMLElement>('[data-yv-shadow-host]')
          ?.shadowRoot?.querySelector('[data-yv-shadow-content-wrapper]'),
      ).toHaveAttribute('data-yv-theme', 'dark');
    });
  });
});
