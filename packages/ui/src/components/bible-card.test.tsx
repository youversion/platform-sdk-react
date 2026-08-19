/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BibleCard } from './bible-card';
import type { FootnoteData } from './verse';
import { useHighlights, usePassage, useTheme, useVersion } from '@youversion/platform-react-hooks';
import type { BiblePassage, BibleVersion, Highlight } from '@youversion/platform-core';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import {
  fillFor,
  getVerseEl,
  MULTI_VERSE_HTML,
  Providers,
  collection,
  stubUseHighlights,
} from '@/test/highlights-test-utils';

vi.mock('@youversion/platform-react-hooks', async () => {
  const actual = await vi.importActual('@youversion/platform-react-hooks');
  return {
    ...actual,
    usePassage: vi.fn(),
    useTheme: vi.fn(),
    useVersion: vi.fn(),
    useHighlights: vi.fn(() => ({
      highlights: { data: [], next_page_token: null },
      loading: false,
      error: null,
      refetch: vi.fn(),
      createHighlight: vi.fn(),
      deleteHighlight: vi.fn(),
    })),
  };
});

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

  it('should hide inline verse numbers in the bible renderer', () => {
    vi.mocked(usePassage).mockReturnValue({
      passage: mockPassage,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = render(<BibleCard reference="JHN.3.16" versionId={3034} />);
    const bibleRenderer = container.querySelector('[data-slot="yv-bible-renderer"]');

    expect(bibleRenderer).toHaveAttribute('data-show-verse-numbers', 'false');
  });
});

describe('BibleCard - Error state', () => {
  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue('light');
    vi.mocked(useVersion).mockReturnValue({
      version: mockVersion,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(usePassage).mockReturnValue({
      passage: null,
      loading: false,
      error: Object.assign(new Error('Request failed with status 503'), { status: 503 }),
      refetch: vi.fn(),
    });
  });

  it('should render exactly one alert region', () => {
    const { container } = render(<BibleCard reference="JHN.3.16" versionId={3034} />);

    expect(within(container).getAllByRole('alert')).toHaveLength(1);
  });

  it('should show the status message in that one alert region', () => {
    const { container } = render(<BibleCard reference="JHN.3.16" versionId={3034} />);
    const alert = within(container).getByRole('alert');

    expect(alert).toHaveTextContent(
      'The Bible service is having trouble right now. Please try again in a moment.',
    );
  });

  it('should render the error heading in the header slot', () => {
    const { container } = render(<BibleCard reference="JHN.3.16" versionId={3034} />);

    expect(within(container).getByRole('heading', { level: 2 })).toHaveTextContent('Error');
  });

  it('should not render a loading spinner while an error is set', () => {
    const { container } = render(<BibleCard reference="JHN.3.16" versionId={3034} />);

    expect(within(container).queryByRole('status')).toBeNull();
  });

  // The version picker staying usable during an error is covered by the `Error`
  // story's play function. A jsdom test would have to hand-mock the five hooks
  // that BibleVersionPicker.Root reads, which couples this file to that
  // component's internals. See packages/ui/CLAUDE.md → TESTING.
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

describe('BibleCard - host highlights (controlled mode)', () => {
  const YELLOW = 'fffe00';
  const multiVersePassage: BiblePassage = {
    id: 'JHN.1',
    content: MULTI_VERSE_HTML,
    reference: 'John 1',
  };
  const highlights: Highlight[] = [{ version_id: 111, passage_id: 'JHN.1.2', color: YELLOW }];

  it('paints matching verses and clears them when versionId no longer matches', () => {
    vi.mocked(useTheme).mockReturnValue('light');
    vi.mocked(useVersion).mockReturnValue({
      version: mockVersion,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(usePassage).mockReturnValue({
      passage: multiVersePassage,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const onVersionChange = vi.fn();
    const { container, rerender } = render(
      <BibleCard
        reference="JHN.1"
        versionId={111}
        onVersionChange={onVersionChange}
        highlights={highlights}
      />,
    );

    expect(getVerseEl(container, 2).style.backgroundColor).toBe(fillFor(YELLOW));

    rerender(
      <BibleCard
        reference="JHN.1"
        versionId={222}
        onVersionChange={onVersionChange}
        highlights={highlights}
      />,
    );

    expect(getVerseEl(container, 2).style.backgroundColor).toBe('');
  });

  it('paints from a stubbed fetch when the prop is omitted, and paints nothing for a host empty array', () => {
    vi.mocked(useTheme).mockReturnValue('light');
    vi.mocked(useVersion).mockReturnValue({
      version: mockVersion,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(usePassage).mockReturnValue({
      passage: multiVersePassage,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    const restoreHighlights = stubUseHighlights({ highlights: collection(highlights) });
    const hasPermission = vi
      .spyOn(YouVersionPlatformConfiguration, 'hasPermission')
      .mockReturnValue(true);

    try {
      const omitted = render(
        <Providers>
          <BibleCard reference="JHN.1" versionId={111} />
        </Providers>,
      );
      expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
        { version_id: 111, passage_id: 'JHN.1' },
        { enabled: true },
      );
      expect(getVerseEl(omitted.container, 2).style.backgroundColor).toBe(fillFor(YELLOW));
      omitted.unmount();

      stubUseHighlights();
      const hostEmpty = render(
        <Providers>
          <BibleCard reference="JHN.1" versionId={111} highlights={[]} />
        </Providers>,
      );
      expect(vi.mocked(useHighlights)).toHaveBeenCalledWith(
        { version_id: 111, passage_id: 'JHN.1' },
        { enabled: false },
      );
      expect(getVerseEl(hostEmpty.container, 2).style.backgroundColor).toBe('');
    } finally {
      restoreHighlights();
      hasPermission.mockRestore();
    }
  });
});
