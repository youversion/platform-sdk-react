/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-empty-function */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type * as PlatformHooks from '@youversion/platform-react-hooks';

// ResizeObserver is used by downstream components (BibleTextView, AnimatedHeight).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

import { VerseOfTheDay } from './verse-of-the-day';
import i18n from '@/i18n';
import en from '@/i18n/locales/en.json';
import {
  getDayOfYear,
  usePassage,
  useTheme,
  useVerseOfTheDay,
  useVersion,
} from '@youversion/platform-react-hooks';

vi.mock('@youversion/platform-react-hooks', async (importActual) => {
  const actual = await importActual<typeof PlatformHooks>();
  return {
    ...actual,
    getDayOfYear: vi.fn(),
    usePassage: vi.fn(),
    useTheme: vi.fn(),
    useVerseOfTheDay: vi.fn(),
    useVersion: vi.fn(),
  };
});

function stubHooks(): void {
  vi.mocked(getDayOfYear).mockReturnValue(1);
  vi.mocked(useVerseOfTheDay).mockReturnValue({
    data: { day: 1, passage_id: 'JHN.3.16' },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  vi.mocked(usePassage).mockReturnValue({
    passage: { id: 'JHN.3.16', reference: 'John 3:16', content: '' },
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  // useVersion returns a full BibleVersion shape; keep the cast to avoid reproducing
  // every field the component does not read.
  vi.mocked(useVersion).mockReturnValue({
    version: { localized_abbreviation: 'NIV' },
    loading: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useVersion>);
  vi.mocked(useTheme).mockReturnValue('light');
}

describe('VerseOfTheDay i18n integration', () => {
  beforeEach(() => {
    stubHooks();
  });

  afterEach(async () => {
    if (i18n.language !== 'en') {
      await i18n.changeLanguage('en');
    }
    if (i18n.hasResourceBundle('es', 'translation')) {
      i18n.removeResourceBundle('es', 'translation');
    }
    vi.resetAllMocks();
  });

  it('renders the translated English label by default', () => {
    render(<VerseOfTheDay />);
    expect(screen.getByText(en.verseOfTheDay)).toBeInTheDocument();
  });

  it('renders the localized label after changeLanguage', async () => {
    const spanishLabel = 'Versículo del día';
    i18n.addResourceBundle('es', 'translation', { verseOfTheDay: spanishLabel });
    await i18n.changeLanguage('es');

    render(<VerseOfTheDay />);
    expect(screen.getByText(spanishLabel)).toBeInTheDocument();
  });
});
