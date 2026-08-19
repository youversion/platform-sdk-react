/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import type { HookOverrides } from '@youversion/platform-react-hooks';

// ResizeObserver is used by downstream components (BibleTextView, AnimatedHeight).
import { installResizeObserverStub } from '@/test/dom-stubs';

installResizeObserverStub();

import { VerseOfTheDay } from './verse-of-the-day';
import type { VerseOfTheDayShareData } from './verse-of-the-day';
import { HookOverrideProvider } from '@/test/hook-overrides';
import en from '@/i18n/locales/en.json';
import type { BibleVersion } from '@youversion/platform-core';

const MOCK_VERSE_HTML = '<p class="yv-p">For God so loved the world</p>';
const MOCK_VERSE_TEXT = 'For God so loved the world';
const MOCK_REFERENCE = 'John 3:16 NIV';

const mockVersion: BibleVersion = {
  id: 111,
  title: 'New International Version',
  abbreviation: 'NIV',
  localized_title: 'New International Version',
  localized_abbreviation: 'NIV',
  language_tag: 'en',
  books: ['JHN'],
  youversion_deep_link: 'https://bible.com/versions/111',
};

function stubOverrides(
  overrides: {
    passageContent?: string;
    passageError?: Error | null;
    votdError?: Error | null;
  } = {},
): HookOverrides {
  const { passageContent = MOCK_VERSE_HTML, passageError = null, votdError = null } = overrides;

  return {
    useVerseOfTheDay: () => ({
      data: { day: 1, passage_id: 'JHN.3.16' },
      loading: false,
      error: votdError,
      refetch: () => undefined,
    }),
    usePassage: () => ({
      passage: passageError
        ? null
        : { id: 'JHN.3.16', reference: 'John 3:16', content: passageContent },
      loading: false,
      error: passageError,
      refetch: () => undefined,
    }),
    useVersion: () => ({
      version: mockVersion,
      loading: false,
      error: null,
      refetch: () => undefined,
    }),
  };
}

function renderVotd(ui: ReactElement, overrides: HookOverrides = stubOverrides()) {
  return render(<HookOverrideProvider overrides={overrides}>{ui}</HookOverrideProvider>);
}

function expectedShareData(verseText: string = MOCK_VERSE_TEXT): VerseOfTheDayShareData {
  return {
    text: `${verseText}\n\n${MOCK_REFERENCE}`,
    reference: MOCK_REFERENCE,
    verseText,
  };
}

describe('VerseOfTheDay i18n integration', () => {
  it('renders the translated label from the i18n instance', () => {
    renderVotd(<VerseOfTheDay dayOfYear={1} />);
    expect(screen.getByText(en.verseOfTheDay)).toBeInTheDocument();
  });

  it('lets the card fill its container while centering the content group', () => {
    const { container } = renderVotd(<VerseOfTheDay dayOfYear={1} />);
    const card = container.querySelector('section');
    const contentGroup = container.querySelector('section > div');

    expect(card).toHaveClass('yv:w-full');
    expect(card).not.toHaveClass('yv:max-w-md');
    expect(card).toHaveClass('yv:box-border');
    expect(contentGroup).toHaveClass('yv:card-content');
  });

  it('renders the reference under the label in the header, not below the verse text', () => {
    const { container } = renderVotd(<VerseOfTheDay dayOfYear={1} />);
    const reference = screen.getByText(MOCK_REFERENCE);
    const bibleRenderer = container.querySelector('[data-slot="yv-bible-renderer"]');
    const label = screen.getByText(en.verseOfTheDay);

    expect(reference).toHaveClass('yv:text-black');
    expect(reference).not.toHaveClass('yv:text-muted-foreground');
    expect(
      label.compareDocumentPosition(reference) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(bibleRenderer).not.toBeNull();
    expect(
      bibleRenderer!.compareDocumentPosition(reference) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });

  it('hides inline verse numbers in the bible renderer', () => {
    const { container } = renderVotd(<VerseOfTheDay dayOfYear={1} />);
    const bibleRenderer = container.querySelector('[data-slot="yv-bible-renderer"]');

    expect(bibleRenderer).toHaveAttribute('data-show-verse-numbers', 'false');
  });
});

describe('VerseOfTheDay - share', () => {
  let shareSpy: ReturnType<typeof vi.fn>;
  let clipboardWriteTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // jsdom does not implement innerText; mirror textContent for share payload tests.
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get(this: HTMLElement): string {
        return this.textContent ?? '';
      },
    });

    shareSpy = vi.fn().mockResolvedValue(undefined);
    clipboardWriteTextSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal(
      'navigator',
      Object.assign({}, navigator, {
        share: shareSpy,
        clipboard: {
          writeText: clipboardWriteTextSpy,
        },
      }),
    );
  });

  it('calls onShare with expected payload when provided', async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();

    renderVotd(<VerseOfTheDay dayOfYear={1} onShare={onShare} />);

    await user.click(screen.getByRole('button', { name: en.shareAriaLabel }));

    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledWith(expectedShareData());
  });

  it('uses navigator.share with built text when onShare is omitted', async () => {
    const user = userEvent.setup();

    renderVotd(<VerseOfTheDay dayOfYear={1} />);

    await user.click(screen.getByRole('button', { name: en.shareAriaLabel }));

    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(shareSpy).toHaveBeenCalledWith({
      text: expectedShareData().text,
      title: undefined,
      url: undefined,
    });
  });

  it('does not surface unhandled rejection when onShare rejects', async () => {
    const user = userEvent.setup();
    const onShare = vi.fn().mockRejectedValue(new Error('User dismissed'));
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
      unhandledRejections.push(event.reason);
    };
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    try {
      renderVotd(<VerseOfTheDay dayOfYear={1} onShare={onShare} />);
      await user.click(screen.getByRole('button', { name: en.shareAriaLabel }));
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(onShare).toHaveBeenCalledTimes(1);
      expect(unhandledRejections).toHaveLength(0);
    } finally {
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    }
  });

  it('does not call navigator.share or clipboard when onShare is provided', async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();

    renderVotd(<VerseOfTheDay dayOfYear={1} onShare={onShare} />);

    await user.click(screen.getByRole('button', { name: en.shareAriaLabel }));

    expect(onShare).toHaveBeenCalledTimes(1);
    expect(shareSpy).not.toHaveBeenCalled();
    expect(clipboardWriteTextSpy).not.toHaveBeenCalled();
  });

  it('does not render share button or call onShare when showShareButton is false', () => {
    const onShare = vi.fn();

    renderVotd(<VerseOfTheDay dayOfYear={1} showShareButton={false} onShare={onShare} />);

    expect(screen.queryByRole('button', { name: en.shareAriaLabel })).not.toBeInTheDocument();
    expect(onShare).not.toHaveBeenCalled();
  });

  it('does not call onShare when passage has an error', async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();

    renderVotd(
      <VerseOfTheDay dayOfYear={1} onShare={onShare} />,
      stubOverrides({ passageError: new Error('Passage failed') }),
    );

    const shareButton = screen.getByRole('button', { name: en.shareAriaLabel });
    expect(shareButton).toBeDisabled();

    await user.click(shareButton);

    expect(onShare).not.toHaveBeenCalled();
  });
});
