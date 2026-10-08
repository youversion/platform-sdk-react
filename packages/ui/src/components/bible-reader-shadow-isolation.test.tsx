/**
 * @vitest-environment jsdom
 */
import { act, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { BibleBook, BibleVersion } from '@youversion/platform-core';
import type { HookOverrides } from '@youversion/platform-react-hooks';
import { type ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { installResizeObserverStub } from '@/test/dom-stubs';
import { HookOverrideProvider } from '@/test/hook-overrides';
import { BibleReader } from './bible-reader';
import { BibleReaderSearch } from './bible-reader-search';
import { ProfileAvatar } from './profile-avatar';

installResizeObserverStub();

const books: BibleBook[] = [
  {
    id: 'JHN',
    title: 'John',
    full_title: 'The Gospel According to John',
    abbreviation: 'John',
    canon: 'new_testament',
    chapters: [{ id: '1', title: '1', passage_id: 'JHN.1' }],
  },
];

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
  useBooks: () => ({
    books: { data: books, next_page_token: null },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  usePassage: () => ({
    passage: {
      id: 'JHN.1',
      reference: 'John 1',
      content: '<p><span class="yv-v" v="1"></span>Reader scripture</p>',
    },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useVersion: () => ({ version, loading: false, error: null, refetch: () => undefined }),
  useLanguages: () => ({
    languages: { data: [], next_page_token: null },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useLanguage: () => ({
    language: { id: 'en', language: 'English', display_names: { en: 'English' } },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useVersions: () => ({
    versions: { data: [], next_page_token: null },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useFilteredVersions: () => [],
  useOrganizations: () => ({ organizations: new Map() }),
  useBibleSearch: () => ({
    query: '',
    phase: { kind: 'trending', queries: [], loading: false },
    setQuery: () => undefined,
    submit: () => undefined,
    selectSuggestion: () => undefined,
    loadMore: () => undefined,
    retry: () => undefined,
  }),
};

function withOverrides(element: ReactElement): ReactElement {
  return <HookOverrideProvider overrides={overrides}>{element}</HookOverrideProvider>;
}

describe('BibleReader.Root public shadow boundary', () => {
  it('owns one empty SSR host and reuses it for all reader-owned content', async () => {
    const scrollToDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTo');
    const showPopoverDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'showPopover',
    );
    const hidePopoverDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'hidePopover',
    );
    Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', {
      configurable: true,
      value: vi.fn(),
    });
    const element = withOverrides(
      <BibleReader.Root defaultBook="JHN" defaultChapter="1" defaultVersionId={111} highlights={[]}>
        <BibleReader.Content />
        <BibleReader.Toolbar />
      </BibleReader.Root>,
    );
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
        if (!candidate?.shadowRoot?.querySelector('[data-slot="yv-bible-renderer"]')) {
          throw new Error('reader content not mounted inside its open shadow root');
        }
        return candidate;
      });

      expect(host).toBe(serverHost);
      expect(host.childNodes).toHaveLength(0);
      expect(container.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(1);
      expect(host.shadowRoot?.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(0);
      expect(
        host.shadowRoot?.querySelector('button[aria-label="Change Bible book and chapter"]'),
      ).toBeInTheDocument();
      expect(
        host.shadowRoot?.querySelector('button[aria-label="Change Bible version"]'),
      ).toBeInTheDocument();
      const settingsTrigger = host.shadowRoot?.querySelector<HTMLButtonElement>(
        'button[aria-label="Settings"]',
      );
      expect(settingsTrigger).toBeInTheDocument();
      await userEvent.click(settingsTrigger!);
      const settings = await waitFor(() => {
        const candidate = host.shadowRoot?.querySelector<HTMLElement>('[role="dialog"]');
        if (!candidate?.textContent?.includes('Reader Settings')) {
          throw new Error('reader settings did not open in the reader root');
        }
        return candidate;
      });
      expect(settings.getRootNode()).toBe(host.shadowRoot);
      expect(settings.querySelector('[data-yv-shadow-host]')).toBeNull();
      expect(host.shadowRoot?.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(0);
      expect(settings.querySelector('[data-testid="increase-font-size"]')?.getRootNode()).toBe(
        host.shadowRoot,
      );
      expect(recoverableErrors).toEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      if (root) await act(async () => root?.unmount());
      consoleError.mockRestore();
      container.remove();
      if (scrollToDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'scrollTo', scrollToDescriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'scrollTo');
      }
      if (showPopoverDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'showPopover', showPopoverDescriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'showPopover');
      }
      if (hidePopoverDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'hidePopover', hidePopoverDescriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover');
      }
    }
  });

  it('relocates consumer children while preserving intentional nested roots and direct search', async () => {
    const { container } = render(
      withOverrides(
        <BibleReader.Root defaultBook="JHN" defaultChapter="1" defaultVersionId={111}>
          <p data-testid="consumer-child">Consumer child</p>
          <BibleReaderSearch />
          <ProfileAvatar name="Nested avatar" />
        </BibleReader.Root>,
      ),
    );

    const host = await waitFor(() => {
      const candidate = container.querySelector<HTMLElement>('[data-yv-shadow-host]');
      if (!candidate?.shadowRoot?.querySelector('[data-testid="consumer-child"]')) {
        throw new Error('consumer child not relocated into reader root');
      }
      return candidate;
    });
    const readerRoot = host.shadowRoot!;
    const nestedHost = readerRoot.querySelector<HTMLElement>('[data-yv-shadow-host]');

    expect(container.querySelector('[data-testid="consumer-child"]')).toBeNull();
    expect(document.querySelector('[data-testid="consumer-child"]')).toBeNull();
    expect(readerRoot.querySelector('button[aria-label="Search the Bible"]')).toBeInTheDocument();
    expect(nestedHost?.shadowRoot?.querySelector('[data-slot="avatar"]')).toBeInTheDocument();
  });
});
