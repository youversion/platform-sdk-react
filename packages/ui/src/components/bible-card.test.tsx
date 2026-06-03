/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BibleCard } from './bible-card';
import type { FootnoteData } from './verse';
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

    expect(within(container).queryByRole('status', { name: /loading/i })).toBeNull();
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

    expect(within(container).getByRole('status', { name: /loading/i })).toBeInTheDocument();
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

    expect(within(container).getByRole('status', { name: /loading/i })).toBeInTheDocument();

    vi.mocked(usePassage).mockReturnValue({
      passage: mockPassage,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    rerender(<BibleCard reference="JHN.3.16" versionId={3034} />);

    expect(within(container).queryByRole('status', { name: /loading/i })).toBeNull();
  });

  it('should show spinner on initial load (no passage yet)', () => {
    vi.mocked(usePassage).mockReturnValue({
      passage: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<BibleCard reference="JHN.3.16" versionId={3034} />);

    expect(within(container).getAllByRole('status', { name: /loading/i }).length).toBeGreaterThan(
      0,
    );
  });

  it('should let the card fill its container while centering the content group', () => {
    vi.mocked(usePassage).mockReturnValue({
      passage: mockPassage,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<BibleCard reference="JHN.3.16" versionId={3034} />);
    const card = container.querySelector('section');
    const contentGroup = container.querySelector('section > div');
    const bibleTextView = container.querySelector('[data-slot="yv-bible-renderer"]')?.parentElement;

    expect(card).toHaveClass('yv:w-full');
    expect(card).not.toHaveClass('yv:max-w-md');
    expect(card).toHaveClass('yv:box-border');
    expect(contentGroup).toHaveClass('yv:card-content');
    expect(bibleTextView).not.toHaveClass('yv:max-w-[600px]');
  });
});

describe('BibleCard - onFootnotePress callback', () => {
  const mockPassageWithFootnote: BiblePassage = {
    id: 'JHN.1',
    content: `<div class="p"><span class="yv-v" v="5"></span><span class="yv-vlbl">5</span>The light shines<span class="yv-n f"><span class="fr">1:5 </span><span class="ft">Or understood</span></span>.</div>`,
    reference: 'JHN.1',
  };

  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue('light');
    vi.mocked(useVersion).mockReturnValue({
      version: mockVersion,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(usePassage).mockReturnValue({
      passage: mockPassageWithFootnote,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('should call onFootnotePress when provided via BibleCard', async () => {
    const onFootnotePress = vi.fn();

    const { container } = render(
      <BibleCard reference="JHN.1" versionId={3034} onFootnotePress={onFootnotePress} />,
    );

    const button = await waitFor(() => {
      const btn = container.querySelector('[data-verse-footnote="5"] button');
      expect(btn).not.toBeNull();
      return btn as HTMLButtonElement;
    });

    await userEvent.click(button);

    expect(onFootnotePress).toHaveBeenCalledTimes(1);
    const data = onFootnotePress.mock.calls[0]![0] as FootnoteData;
    expect(data.verseNum).toBe('5');
    expect(data.reference).toBe('JHN.1');
    expect(data.notes).toHaveLength(1);
    expect(data.notes[0]).toContain('Or understood');
  });
});
