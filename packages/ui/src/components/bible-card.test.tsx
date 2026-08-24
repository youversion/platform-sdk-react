/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { requireHtmlButton, requireHtmlElement } from '@/test/dom-stubs';
import { HookOverrideProvider } from '@/test/hook-overrides';
import { BibleCard } from './bible-card';
import type { FootnoteData } from './verse';
import type { UsePassageResult, UseVersionResult } from '@youversion/platform-react-hooks';
import type { BiblePassage, BibleVersion, Highlight } from '@youversion/platform-core';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import {
  fillFor,
  getVerseEl,
  MULTI_VERSE_HTML,
  collection,
  Providers,
  stubUseHighlights,
} from '@/test/highlights-test-utils';

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

function idleVersion(): UseVersionResult {
  return {
    version: mockVersion,
    loading: false,
    error: null,
    refetch: () => undefined,
  };
}

function passageResult(
  overrides: Partial<UsePassageResult> & Pick<UsePassageResult, 'passage' | 'loading'>,
): UsePassageResult {
  return {
    error: null,
    refetch: () => undefined,
    ...overrides,
  };
}

function renderCard(
  passage: UsePassageResult,
  extra: {
    onFootnotePress?: (data: FootnoteData) => void;
    reference?: string;
    versionId?: number;
    highlights?: Highlight[];
    onVersionChange?: (id: number) => void;
    maxWidth?: number | '100%';
    hostWidth?: number;
  } = {},
) {
  const {
    reference = 'JHN.3.16',
    onFootnotePress,
    versionId = 3034,
    highlights,
    onVersionChange,
    maxWidth,
    hostWidth,
  } = extra;
  const card = (
    <HookOverrideProvider
      overrides={{
        useVersion: () => idleVersion(),
        usePassage: () => passage,
      }}
    >
      <BibleCard
        reference={reference}
        versionId={versionId}
        onFootnotePress={onFootnotePress}
        highlights={highlights}
        onVersionChange={onVersionChange}
        maxWidth={maxWidth}
      />
    </HookOverrideProvider>
  );
  return render(hostWidth === undefined ? card : <div style={{ width: hostWidth }}>{card}</div>);
}

function cardShell(container: HTMLElement) {
  return {
    section: requireHtmlElement(container.querySelector('section')),
    inner: requireHtmlElement(container.querySelector('section > div')),
  };
}

const YELLOW = 'fffe00';
const multiVersePassage: BiblePassage = {
  id: 'JHN.1',
  content: MULTI_VERSE_HTML,
  reference: 'John 1',
};
const highlights: Highlight[] = [{ version_id: 111, passage_id: 'JHN.1.2', color: YELLOW }];

describe('BibleCard - Delayed spinner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not show spinner before 250ms when refetching', () => {
    const { container } = renderCard(passageResult({ passage: mockPassage, loading: true }));

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(within(container).queryByRole('status', { name: /loading/i })).toBeNull();
  });

  it('should show spinner after 250ms when refetching', () => {
    const { container } = renderCard(passageResult({ passage: mockPassage, loading: true }));

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(within(container).getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('should hide spinner when loading completes', () => {
    const { container, rerender } = renderCard(
      passageResult({ passage: mockPassage, loading: true }),
    );

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(within(container).getByRole('status', { name: /loading/i })).toBeInTheDocument();

    rerender(
      <HookOverrideProvider
        overrides={{
          useVersion: () => idleVersion(),
          usePassage: () => passageResult({ passage: mockPassage, loading: false }),
        }}
      >
        <BibleCard reference="JHN.3.16" versionId={3034} />
      </HookOverrideProvider>,
    );

    expect(within(container).queryByRole('status', { name: /loading/i })).toBeNull();
  });

  it('should show spinner on initial load (no passage yet)', () => {
    const { container } = renderCard(passageResult({ passage: null, loading: true }));

    expect(within(container).getAllByRole('status', { name: /loading/i }).length).toBeGreaterThan(
      0,
    );
  });

  it('should hide inline verse numbers in the bible renderer', () => {
    const { container } = renderCard(passageResult({ passage: mockPassage, loading: false }));
    const bibleRenderer = container.querySelector('[data-slot="yv-bible-renderer"]');

    expect(bibleRenderer).toHaveAttribute('data-show-verse-numbers', 'false');
  });
});

describe('BibleCard - maxWidth', () => {
  const loaded = passageResult({ passage: mockPassage, loading: false });

  it('omitting maxWidth caps the painted section at 700px and lets the inner column fill', () => {
    const { container } = renderCard(loaded);
    const { section, inner } = cardShell(container);
    const bibleTextView = container.querySelector('[data-slot="yv-bible-renderer"]')?.parentElement;

    expect(section).toHaveClass('yv:w-full');
    expect(section).toHaveClass('yv:p-6');
    expect(section).toHaveClass('yv:box-border');
    expect(section).not.toHaveClass('yv:max-w-md');
    expect(section).toHaveStyle({ maxWidth: '700px' });
    expect(inner).toHaveClass('yv:w-full');
    expect(inner).not.toHaveClass('yv:card-content');
    expect(inner).not.toHaveStyle({ maxWidth: '600px' });
    expect(bibleTextView).not.toHaveClass('yv:max-w-[600px]');
  });

  it('uses a number maxWidth as the section cap and lets the inner column fill', () => {
    const { container } = renderCard(loaded, { maxWidth: 480 });
    const { section, inner } = cardShell(container);

    expect(section).toHaveClass('yv:w-full');
    expect(section).toHaveStyle({ maxWidth: '480px' });
    expect(inner).toHaveClass('yv:w-full');
    expect(inner).not.toHaveClass('yv:card-content');
    expect(inner).not.toHaveStyle({ maxWidth: '600px' });
  });

  it('keeps the 600px inner column when maxWidth is 100%', () => {
    const { container } = renderCard(loaded, { maxWidth: '100%' });
    const { section, inner } = cardShell(container);

    expect(section).toHaveClass('yv:w-full');
    expect(section).toHaveStyle({ maxWidth: '100%' });
    expect(inner).toHaveClass('yv:card-content');
    expect(inner).not.toHaveStyle({ maxWidth: 'none' });
  });

  it('still fills a parent that is narrower than the section cap', () => {
    const { container } = renderCard(loaded, { hostWidth: 400 });
    const host = container.firstElementChild;
    const { section, inner } = cardShell(container);

    expect(host).toHaveStyle({ width: '400px' });
    expect(section.parentElement).toBe(host);
    expect(section).toHaveClass('yv:w-full');
    expect(section).toHaveStyle({ maxWidth: '700px' });
    expect(inner).toHaveClass('yv:w-full');
    expect(inner).not.toHaveClass('yv:card-content');
  });
});

describe('BibleCard - Error state', () => {
  function renderErrorCard() {
    return renderCard(
      passageResult({
        passage: null,
        loading: false,
        error: Object.assign(new Error('Request failed with status 503'), { status: 503 }),
      }),
    );
  }

  it('should render exactly one alert region', () => {
    const { container } = renderErrorCard();

    expect(within(container).getAllByRole('alert')).toHaveLength(1);
  });

  it('should show the status message in that one alert region', () => {
    const { container } = renderErrorCard();
    const alert = within(container).getByRole('alert');

    expect(alert).toHaveTextContent(
      'The Bible service is having trouble right now. Please try again in a moment.',
    );
  });

  it('should render the error heading in the header slot', () => {
    const { container } = renderErrorCard();

    expect(within(container).getByRole('heading', { level: 2 })).toHaveTextContent('Error');
  });

  it('should not render a loading spinner while an error is set', () => {
    const { container } = renderErrorCard();

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

  it('should call onFootnotePress when provided via BibleCard', async () => {
    const onFootnotePress = vi.fn<(data: FootnoteData) => void>();

    const { container } = renderCard(
      passageResult({ passage: mockPassageWithFootnote, loading: false }),
      { reference: 'JHN.1', onFootnotePress },
    );

    const button = await waitFor(() => {
      const btn = container.querySelector('[data-verse-footnote="5"] button');
      expect(btn).not.toBeNull();
      return requireHtmlButton(btn);
    });

    await userEvent.click(button);

    expect(onFootnotePress).toHaveBeenCalledTimes(1);
    const data = onFootnotePress.mock.calls[0]![0];
    expect(data.verseNum).toBe('5');
    expect(data.reference).toBe('JHN.1');
    expect(data.notes).toHaveLength(1);
    expect(data.notes[0]).toContain('Or understood');
  });
});

it('host highlights: paints matching verses and clears them when versionId no longer matches', () => {
  const onVersionChange = () => undefined;
  const passage = passageResult({ passage: multiVersePassage, loading: false });
  const { container, rerender } = renderCard(passage, {
    reference: 'JHN.1',
    versionId: 111,
    highlights,
    onVersionChange,
  });

  expect(getVerseEl(container, 2).style.backgroundColor).toBe(fillFor(YELLOW));

  rerender(
    <HookOverrideProvider
      overrides={{
        useVersion: () => idleVersion(),
        usePassage: () => passage,
      }}
    >
      <BibleCard
        reference="JHN.1"
        versionId={222}
        onVersionChange={onVersionChange}
        highlights={highlights}
      />
    </HookOverrideProvider>,
  );

  expect(getVerseEl(container, 2).style.backgroundColor).toBe('');
});

it('host highlights: paints from a stubbed fetch when the prop is omitted, and paints nothing for a host empty array', () => {
  const hasPermission = vi
    .spyOn(YouVersionPlatformConfiguration, 'hasPermission')
    .mockReturnValue(true);
  const overrides = {
    useVersion: () => idleVersion(),
    usePassage: () => passageResult({ passage: multiVersePassage, loading: false }),
    useHighlights: stubUseHighlights({ highlights: collection(highlights) }),
  };

  try {
    const omitted = render(
      <Providers hookOverrides={overrides}>
        <BibleCard reference="JHN.1" versionId={111} />
      </Providers>,
    );
    expect(getVerseEl(omitted.container, 2).style.backgroundColor).toBe(fillFor(YELLOW));
    omitted.unmount();

    const hostEmpty = render(
      <Providers hookOverrides={overrides}>
        <BibleCard reference="JHN.1" versionId={111} highlights={[]} />
      </Providers>,
    );
    expect(getVerseEl(hostEmpty.container, 2).style.backgroundColor).toBe('');
  } finally {
    hasPermission.mockRestore();
  }
});
