/**
 * @vitest-environment jsdom
 */
import { act, waitFor } from '@testing-library/react';
import type { HookOverrides } from '@youversion/platform-react-hooks';
import type { ReactElement } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { HookOverrideProvider } from '@/test/hook-overrides';
import { installResizeObserverStub } from '@/test/dom-stubs';
import { BibleChapterPicker, type BibleChapterPickerPressData } from './bible-chapter-picker';
import {
  BibleLanguagePickerContent,
  BibleVersionPicker,
  BibleVersionPickerLanguageTrigger,
  type BibleVersionPickerPressData,
} from './bible-version-picker';

installResizeObserverStub();

const overrides: HookOverrides = {
  useBooks: () => ({
    books: { data: [], next_page_token: null },
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
  useVersion: () => ({
    version: null,
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useLanguages: () => ({
    languages: { data: [], next_page_token: null },
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useLanguage: () => ({
    language: null,
    loading: false,
    error: null,
    refetch: () => undefined,
  }),
  useFilteredVersions: () => [],
  useOrganizations: () => ({ organizations: new Map() }),
};

function chapterPicker() {
  const onPress = vi.fn<(data: BibleChapterPickerPressData) => void>();
  const element: ReactElement = (
    <BibleChapterPicker.Root book="GEN" chapter="1" versionId={111} onChapterPickerPress={onPress}>
      <BibleChapterPicker.Trigger>
        <button type="button" data-testid="picker-trigger">
          Chapter
        </button>
      </BibleChapterPicker.Trigger>
      <BibleChapterPicker.Content />
    </BibleChapterPicker.Root>
  );
  return { element, expectedPress: { book: 'GEN', chapter: '1', versionId: 111 }, onPress };
}

function versionPicker() {
  const onPress = vi.fn<(data: BibleVersionPickerPressData) => void>();
  const element: ReactElement = (
    <BibleVersionPicker.Root versionId={111} onVersionPickerPress={onPress}>
      <BibleVersionPicker.Trigger>
        <button type="button" data-testid="picker-trigger">
          Version
        </button>
      </BibleVersionPicker.Trigger>
      <BibleVersionPicker.Content open />
      <BibleVersionPickerLanguageTrigger />
      <BibleLanguagePickerContent open />
    </BibleVersionPicker.Root>
  );
  return { element, expectedPress: { languageId: 'en', versionId: 111 }, onPress };
}

describe('Bible picker public shadow boundaries', () => {
  it.each([
    ['BibleChapterPicker.Root', chapterPicker],
    ['BibleVersionPicker.Root', versionPicker],
  ])('%s owns one empty SSR host and reuses it during hydration', async (_, picker) => {
    const fixture = picker();
    const element = (
      <HookOverrideProvider overrides={overrides}>{fixture.element}</HookOverrideProvider>
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
        if (!candidate?.shadowRoot) throw new Error('picker shadow root not attached');
        return candidate;
      });

      expect(container.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(1);
      expect(host).toBe(serverHost);
      expect(host.childNodes).toHaveLength(0);
      expect(host.shadowRoot?.querySelectorAll('[data-yv-shadow-host]')).toHaveLength(0);
      const trigger = host.shadowRoot?.querySelector<HTMLButtonElement>(
        '[data-testid="picker-trigger"]',
      );
      expect(trigger).not.toBeNull();
      await act(async () => trigger?.click());
      expect(fixture.onPress).toHaveBeenCalledOnce();
      expect(fixture.onPress).toHaveBeenCalledWith(fixture.expectedPress);
      expect(recoverableErrors).toEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      if (root) await act(async () => root?.unmount());
      consoleError.mockRestore();
      container.remove();
    }
  });
});
