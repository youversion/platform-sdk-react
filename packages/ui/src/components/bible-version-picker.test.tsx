/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ResizeObserver is used by VersionAbbreviationIcon and @floating-ui/dom (Radix Popover)
class ResizeObserverMock {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

import { BibleVersionPicker } from './bible-version-picker';
import {
  useVersions,
  useVersion,
  useLanguages,
  useLanguage,
  useFilteredVersions,
  useTheme,
} from '@youversion/platform-react-hooks';
import type { BibleVersion } from '@youversion/platform-core';

vi.mock('@youversion/platform-react-hooks');

const mockVersions: BibleVersion[] = [
  {
    id: 111,
    title: 'New International Version',
    abbreviation: 'NIV',
    localized_title: 'New International Version',
    localized_abbreviation: 'NIV',
    language_tag: 'en',
    books: ['GEN', 'EXO'],
    youversion_deep_link: 'https://bible.com/versions/111',
  },
  {
    id: 206,
    title: 'New Living Translation',
    abbreviation: 'NLT',
    localized_title: 'New Living Translation',
    localized_abbreviation: 'NLT',
    language_tag: 'en',
    books: ['GEN', 'EXO'],
    youversion_deep_link: 'https://bible.com/versions/206',
  },
];

function setupDefaultMocks({
  versionsLoading = false,
  filteredVersions = mockVersions,
}: {
  versionsLoading?: boolean;
  filteredVersions?: BibleVersion[];
} = {}) {
  vi.mocked(useVersions).mockReturnValue({
    versions: versionsLoading ? null : { data: mockVersions, next_page_token: null },
    loading: versionsLoading,
    error: null,
    refetch: vi.fn(),
  });

  vi.mocked(useVersion).mockReturnValue({
    version: mockVersions[0]!,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });

  vi.mocked(useLanguages).mockReturnValue({
    languages: { data: [], next_page_token: null },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });

  vi.mocked(useLanguage).mockReturnValue({
    language: { id: 'en', display_names: { en: 'English' }, language: 'English' },
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as ReturnType<typeof useLanguage>);

  vi.mocked(useFilteredVersions).mockReturnValue(filteredVersions);

  vi.mocked(useTheme).mockReturnValue('light');
}

function renderPicker() {
  return render(
    <BibleVersionPicker.Root versionId={111} onVersionChange={vi.fn()}>
      <BibleVersionPicker.Trigger>
        <button type="button">Open</button>
      </BibleVersionPicker.Trigger>
      <BibleVersionPicker.Content />
    </BibleVersionPicker.Root>,
  );
}

async function openPicker() {
  const trigger = screen.getByRole('button', { name: /open/i });
  await userEvent.click(trigger);
}

describe('BibleVersionPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('loading state', () => {
    it('should show spinner in version list when versions are loading', async () => {
      setupDefaultMocks({ versionsLoading: true, filteredVersions: [] });
      renderPicker();
      await openPicker();

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const spinner = dialog.querySelector('svg.yv\\:animate-spin');
        expect(spinner).not.toBeNull();
      });

      expect(screen.queryByText('No versions found')).toBeNull();
    });

    it('should show spinner in badge when versions are loading', async () => {
      setupDefaultMocks({ versionsLoading: true, filteredVersions: [] });
      renderPicker();
      await openPicker();

      await waitFor(() => {
        const languageButton = screen.getByRole('button', { name: /select language/i });
        const badge = languageButton.querySelector('[data-slot="badge"]');
        expect(badge).not.toBeNull();

        const spinner = badge!.querySelector('svg');
        expect(spinner).not.toBeNull();

        expect(badge!.textContent).not.toContain('0');
      });
    });
  });

  describe('empty state', () => {
    it('should show "No versions found" when not loading and results are empty', async () => {
      setupDefaultMocks({ versionsLoading: false, filteredVersions: [] });
      renderPicker();
      await openPicker();

      await waitFor(() => {
        expect(screen.getByText('No versions found')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const spinners = dialog.querySelectorAll('svg.yv\\:animate-spin');
      expect(spinners).toHaveLength(0);
    });
  });

  describe('loaded state', () => {
    it('should show version count in badge when loaded', async () => {
      setupDefaultMocks({ versionsLoading: false, filteredVersions: mockVersions });
      renderPicker();
      await openPicker();

      await waitFor(() => {
        const languageButton = screen.getByRole('button', { name: /select language/i });
        const badge = languageButton.querySelector('[data-slot="badge"]');
        expect(badge).not.toBeNull();
        expect(badge!.textContent).toBe('2');
      });
    });

    it('should render version items when loaded', async () => {
      setupDefaultMocks({ versionsLoading: false, filteredVersions: mockVersions });
      renderPicker();
      await openPicker();

      await waitFor(() => {
        expect(
          screen.getByRole('listitem', { name: /new international version/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('listitem', { name: /new living translation/i }),
        ).toBeInTheDocument();
      });
    });
  });
});
