/**
 * @vitest-environment jsdom
 */
/* eslint-disable @typescript-eslint/no-empty-function */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as PlatformHooks from '@youversion/platform-react-hooks';

// ResizeObserver is used by downstream components (BibleTextView, AnimatedHeight).
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

import { VerseOfTheDay } from './verse-of-the-day';
import type { VerseOfTheDayShareData } from './verse-of-the-day';
import type { Highlight } from '@youversion/platform-core';
import { fillFor, getVerseEl } from '@/test/highlights-test-utils';
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

const MOCK_VERSE_HTML = '<p class="yv-p">For God so loved the world</p>';
const MOCK_VERSE_TEXT = 'For God so loved the world';
const MOCK_REFERENCE = 'John 3:16 NIV';

function stubHooks(
  overrides: {
    passageContent?: string;
    passageError?: Error | null;
    votdError?: Error | null;
  } = {},
): void {
  const { passageContent = MOCK_VERSE_HTML, passageError = null, votdError = null } = overrides;

  vi.mocked(getDayOfYear).mockReturnValue(1);
  vi.mocked(useVerseOfTheDay).mockReturnValue({
    data: { day: 1, passage_id: 'JHN.3.16' },
    loading: false,
    error: votdError,
    refetch: vi.fn(),
  });
  vi.mocked(usePassage).mockReturnValue({
    passage: passageError
      ? null
      : { id: 'JHN.3.16', reference: 'John 3:16', content: passageContent },
    loading: false,
    error: passageError,
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

function expectedShareData(verseText: string = MOCK_VERSE_TEXT): VerseOfTheDayShareData {
  return {
    text: `${verseText}\n\n${MOCK_REFERENCE}`,
    reference: MOCK_REFERENCE,
    verseText,
  };
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

  it('renders the reference under the label in the header, not below the verse text', () => {
    const { container } = render(<VerseOfTheDay />);
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
    const { container } = render(<VerseOfTheDay />);
    const bibleRenderer = container.querySelector('[data-slot="yv-bible-renderer"]');

    expect(bibleRenderer).toHaveAttribute('data-show-verse-numbers', 'false');
  });
});

describe('VerseOfTheDay - share', () => {
  let shareSpy: ReturnType<typeof vi.fn>;
  let clipboardWriteTextSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stubHooks();

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

    render(<VerseOfTheDay onShare={onShare} />);

    await user.click(screen.getByRole('button', { name: en.shareAriaLabel }));

    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledWith(expectedShareData());
  });

  it('uses navigator.share with built text when onShare is omitted', async () => {
    const user = userEvent.setup();

    render(<VerseOfTheDay />);

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
      render(<VerseOfTheDay onShare={onShare} />);
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

    render(<VerseOfTheDay onShare={onShare} />);

    await user.click(screen.getByRole('button', { name: en.shareAriaLabel }));

    expect(onShare).toHaveBeenCalledTimes(1);
    expect(shareSpy).not.toHaveBeenCalled();
    expect(clipboardWriteTextSpy).not.toHaveBeenCalled();
  });

  it('does not render share button or call onShare when showShareButton is false', () => {
    const onShare = vi.fn();

    render(<VerseOfTheDay showShareButton={false} onShare={onShare} />);

    expect(screen.queryByRole('button', { name: en.shareAriaLabel })).not.toBeInTheDocument();
    expect(onShare).not.toHaveBeenCalled();
  });

  it('does not call onShare when passage has an error', async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();
    stubHooks({ passageError: new Error('Passage failed') });

    render(<VerseOfTheDay onShare={onShare} />);

    const shareButton = screen.getByRole('button', { name: en.shareAriaLabel });
    expect(shareButton).toBeDisabled();

    await user.click(shareButton);

    expect(onShare).not.toHaveBeenCalled();
  });
});

describe('VerseOfTheDay - host highlights (paint-only)', () => {
  const YELLOW = 'fffe00';
  const GREEN = '5dff79';
  const twoVerseHtml = `
    <div class="p">
      <span class="yv-v" v="16"></span><span class="yv-vlbl">16</span>For God so loved the world.
      <span class="yv-v" v="17"></span><span class="yv-vlbl">17</span>For God did not send his Son.
    </div>
  `;
  const highlight = (passage_id: string, color: string): Highlight => ({
    version_id: 111,
    passage_id,
    color,
  });

  it('does not paint while the verse of the day has not resolved', () => {
    vi.mocked(getDayOfYear).mockReturnValue(1);
    vi.mocked(useVerseOfTheDay).mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(usePassage).mockReturnValue({
      passage: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    vi.mocked(useVersion).mockReturnValue({
      version: { localized_abbreviation: 'NIV' },
      loading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useVersion>);
    vi.mocked(useTheme).mockReturnValue('light');

    const { container } = render(
      <VerseOfTheDay versionId={111} highlights={[highlight('JHN.3.16', YELLOW)]} />,
    );

    expect(container.querySelector('.yv-v')).toBeNull();
  });

  it("paints only the verses in today's passage", () => {
    stubHooks({ passageContent: twoVerseHtml });

    const { container } = render(
      <VerseOfTheDay
        versionId={111}
        highlights={[highlight('JHN.3.16-18', YELLOW), highlight('JHN.3.17', GREEN)]}
      />,
    );

    expect(getVerseEl(container, 16).style.backgroundColor).toBe(fillFor(YELLOW));
    expect(getVerseEl(container, 17).style.backgroundColor).toBe('');
  });

  it('does not paint highlights for a different passage', () => {
    stubHooks({ passageContent: twoVerseHtml });

    const { container } = render(
      <VerseOfTheDay versionId={111} highlights={[highlight('GEN.1.1', YELLOW)]} />,
    );

    expect(getVerseEl(container, 16).style.backgroundColor).toBe('');
    expect(getVerseEl(container, 17).style.backgroundColor).toBe('');
  });

  it("latches highlights at first mount, including while today's verse is still loading", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      vi.mocked(getDayOfYear).mockReturnValue(1);
      vi.mocked(useVerseOfTheDay).mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });
      vi.mocked(usePassage).mockReturnValue({
        passage: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });
      vi.mocked(useVersion).mockReturnValue({
        version: { localized_abbreviation: 'NIV' },
        loading: false,
        error: null,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useVersion>);
      vi.mocked(useTheme).mockReturnValue('light');

      const { container, rerender, unmount } = render(<VerseOfTheDay versionId={111} />);

      rerender(<VerseOfTheDay versionId={111} highlights={[highlight('JHN.3.16', YELLOW)]} />);
      stubHooks({ passageContent: twoVerseHtml });
      rerender(<VerseOfTheDay versionId={111} highlights={[highlight('JHN.3.16', YELLOW)]} />);

      expect(getVerseEl(container, 16).style.backgroundColor).toBe('');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('`highlights` prop switched'));
      unmount();
      warn.mockClear();

      vi.mocked(useVerseOfTheDay).mockReturnValue({
        data: null,
        loading: true,
        error: null,
        refetch: vi.fn(),
      });
      vi.mocked(usePassage).mockReturnValue({
        passage: null,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      const controlled = render(
        <VerseOfTheDay versionId={111} highlights={[highlight('JHN.3.16', YELLOW)]} />,
      );
      stubHooks({ passageContent: twoVerseHtml });
      controlled.rerender(
        <VerseOfTheDay versionId={111} highlights={[highlight('JHN.3.16', YELLOW)]} />,
      );
      expect(getVerseEl(controlled.container, 16).style.backgroundColor).toBe(fillFor(YELLOW));

      controlled.rerender(<VerseOfTheDay versionId={111} />);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('`highlights` prop switched'));
      expect(getVerseEl(controlled.container, 16).style.backgroundColor).toBe('');
    } finally {
      warn.mockRestore();
    }
  });
});
