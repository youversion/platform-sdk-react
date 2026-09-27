import { renderToString } from 'react-dom/server';
import { render, waitFor } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { FootnoteContent, ProfileAvatar, Separator } from './index';

describe('leaf component shadow isolation', () => {
  it.each([
    {
      name: 'ProfileAvatar',
      element: createElement(ProfileAvatar, { name: 'Cam Anderson' }),
      selector: '[data-slot="avatar"]',
    },
    {
      name: 'Separator',
      element: createElement(Separator),
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
      selector: '[data-slot="yv-bible-note"]',
    },
  ] satisfies Array<{ name: string; element: ReactElement; selector: string }>)(
    '$name renders one automatic boundary with its production element inside',
    async ({ element, selector }) => {
      expect(renderToString(element)).toBe('<div data-yv-shadow-host="true"></div>');

      const { container, unmount } = render(element);
      const host = await waitFor(() => {
        const candidate = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
        if (!candidate?.shadowRoot?.querySelector(selector)) {
          throw new Error('production element not mounted inside an open shadow root');
        }
        return candidate;
      });

      expect(container.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(1);
      expect(host.shadowRoot).not.toBeNull();
      unmount();
    },
  );
});
