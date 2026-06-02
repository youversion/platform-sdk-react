/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-empty-function */
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('renders the translated label from the i18n instance', () => {
    render(<VerseOfTheDay />);
    expect(screen.getByText(en.verseOfTheDay)).toBeInTheDocument();
  });

  it('lets the card fill its container while centering the content group', () => {
    const { container } = render(<VerseOfTheDay />);
    const card = container.querySelector('section');
    const contentGroup = container.querySelector('section > div');

    expect(card).toHaveClass('yv:w-full');
    expect(card).not.toHaveClass('yv:max-w-md');
    expect(card).toHaveClass('yv:box-border');
    expect(contentGroup).toHaveClass('yv:card-content');
  });
});
