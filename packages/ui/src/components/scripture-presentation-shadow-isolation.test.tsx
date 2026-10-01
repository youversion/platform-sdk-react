/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import type { HookOverrides } from '@youversion/platform-react-hooks';
import type { BibleVersion } from '@youversion/platform-core';
import { createRef, type ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HookOverrideProvider } from '@/test/hook-overrides';
import { installResizeObserverStub } from '@/test/dom-stubs';
import { BibleCard } from './bible-card';
import { BibleTextView } from './verse';
import { VerseOfTheDay } from './verse-of-the-day';

installResizeObserverStub();

const passage = {
  id: 'JHN.3.16',
  content: '<p class="yv-p">For God so loved the world</p>',
  reference: 'John 3:16',
};

const version: BibleVersion = {
  id: 111,
  title: 'New International Version',
  abbreviation: 'NIV',
  localized_title: 'New International Version',
  localized_abbreviation: 'NIV',
  language_tag: 'en',
  books: ['JHN'],
  youversion_deep_link: 'https://bible.com/versions/111',
};

const overrides: HookOverrides = {
  useVerseOfTheDay: () => ({
    data: { day: 1, passage_id: 'JHN.3.16' },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  usePassage: () => ({ passage, loading: false, error: null, refetch: () => undefined }),
  useVersion: () => ({ version, loading: false, error: null, refetch: () => undefined }),
};

function withOverrides(element: ReactElement): ReactElement {
  return <HookOverrideProvider overrides={overrides}>{element}</HookOverrideProvider>;
}

describe('scripture presentation public shadow boundaries', () => {
  it.each([
    [
      'BibleTextView',
      withOverrides(<BibleTextView reference="JHN.3.16" versionId={111} />),
      '[data-slot="yv-bible-renderer"]',
    ],
    [
      'VerseOfTheDay',
      withOverrides(<VerseOfTheDay dayOfYear={1} versionId={111} />),
      'section[data-size="default"]',
    ],
    [
      'BibleCard',
      withOverrides(<BibleCard reference="JHN.3.16" versionId={111} showVersionPicker />),
      'section[data-yv-sdk]',
    ],
  ])(
    '%s owns one empty SSR host and reuses it without nested roots',
    async (_, element, selector) => {
      const serverMarkup = renderToString(element);

      expect(serverMarkup).toBe('<div data-yv-shadow-host="true"></div>');

      const container = document.createElement('div');
      container.innerHTML = serverMarkup;
      document.body.append(container);
      const serverHost = container.firstElementChild;
      const recoverableErrors: unknown[] = [];
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      let root: Root | undefined;

      try {
        await act(async () => {
          root = hydrateRoot(container, element, {
            onRecoverableError: (error) => recoverableErrors.push(error),
          });
        });

        const host = await waitFor(() => {
          const candidate = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
          if (!candidate?.shadowRoot?.querySelector(selector)) {
            throw new Error('scripture presentation shadow root not attached');
          }
          return candidate;
        });

        expect(container.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(1);
        expect(host).toBe(serverHost);
        expect(host.childNodes).toHaveLength(0);
        expect(host.shadowRoot?.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(0);
        expect(recoverableErrors).toEqual([]);
        expect(consoleError).not.toHaveBeenCalled();

        const internalTarget = host.shadowRoot?.querySelector(selector);
        const outsideTargets: EventTarget[] = [];
        container.addEventListener('click', (event) => outsideTargets.push(event.target!), {
          once: true,
        });
        internalTarget?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
        expect(outsideTargets).toEqual([host]);
      } finally {
        if (root) await act(async () => root?.unmount());
        consoleError.mockRestore();
        container.remove();
      }
    },
  );

  it('preserves open-root queries, selection callbacks, and the forwarded ref', async () => {
    const onVerseSelect = vi.fn<(verses: number[]) => void>();
    const readerRef = createRef<HTMLDivElement>();
    const passageWithVerse = {
      ...passage,
      content:
        '<div class="p"><span class="yv-v" v="16"></span><span class="yv-vlbl">16</span>For God so loved the world.</div>',
    };
    const { container } = render(
      <HookOverrideProvider
        overrides={{
          usePassage: () => ({ passage, loading: false, error: null, refetch: () => undefined }),
        }}
      >
        <BibleTextView
          ref={readerRef}
          reference="JHN.3.16"
          versionId={111}
          passageState={{ passage: passageWithVerse, loading: false, error: null }}
          onVerseSelect={onVerseSelect}
        />
      </HookOverrideProvider>,
    );
    const host = await waitFor(() => {
      const candidate = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
      if (!candidate?.shadowRoot?.querySelector('[data-slot="yv-bible-renderer"]')) {
        throw new Error('BibleTextView shadow root not attached');
      }
      return candidate;
    });
    const shadowRoot = host.shadowRoot!;
    const renderer = shadowRoot.querySelector<HTMLDivElement>('[data-slot="yv-bible-renderer"]');
    const verse = shadowRoot.querySelector<HTMLElement>('.yv-v[v="16"]');
    if (!renderer || !verse) throw new Error('BibleTextView selection fixture not rendered');
    fireEvent.click(verse);

    expect(onVerseSelect).toHaveBeenCalledWith([16]);
    expect(readerRef.current).toBe(renderer);
    expect(container.querySelector('[data-slot="yv-bible-renderer"]')).toBeNull();
  });
});
