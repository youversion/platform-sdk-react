/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { BibleCard } from './bible-card';
import { usePassage, useVersion, useTheme } from '@youversion/platform-react-hooks';
import type { BiblePassage, BibleVersion } from '@youversion/platform-core';

vi.mock('@youversion/platform-react-hooks');

const mockPassage: BiblePassage = {
  id: 'JHN.3.16',
  content: '<p class="yv-p">For God so loved the world</p>',
  reference: 'John 3:16',
};

const mockVersion: BibleVersion = {
  id: 3034,
  title: 'Berean Standard Bible',
  abbreviation: 'BSB',
  localized_title: 'Berean Standard Bible',
  localized_abbreviation: 'BSB',
  language_tag: 'en',
  books: ['GEN', 'JHN'],
  youversion_deep_link: 'https://bible.com/versions/3034',
};

describe('BibleCard - Delayed spinner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(useTheme).mockReturnValue('light');
    vi.mocked(useVersion).mockReturnValue({
      version: mockVersion,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not show spinner before 250ms when refetching', () => {
    vi.mocked(usePassage).mockReturnValue({
      passage: mockPassage,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<BibleCard reference="JHN.3.16" versionId={3034} />);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(container.querySelector('.yv\\:animate-spin')).toBeNull();
  });

  it('should show spinner after 250ms when refetching', () => {
    vi.mocked(usePassage).mockReturnValue({
      passage: mockPassage,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<BibleCard reference="JHN.3.16" versionId={3034} />);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(container.querySelector('.yv\\:animate-spin')).not.toBeNull();
  });

  it('should hide spinner when loading completes', () => {
    vi.mocked(usePassage).mockReturnValue({
      passage: mockPassage,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container, rerender } = render(<BibleCard reference="JHN.3.16" versionId={3034} />);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(container.querySelector('.yv\\:animate-spin')).not.toBeNull();

    vi.mocked(usePassage).mockReturnValue({
      passage: mockPassage,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    rerender(<BibleCard reference="JHN.3.16" versionId={3034} />);

    expect(container.querySelector('.yv\\:animate-spin')).toBeNull();
  });

  it('should not show spinner on initial load (no passage yet)', () => {
    vi.mocked(usePassage).mockReturnValue({
      passage: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<BibleCard reference="JHN.3.16" versionId={3034} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(container.querySelector('.yv\\:animate-spin')).toBeNull();
  });
});
