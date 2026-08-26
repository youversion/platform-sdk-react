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
import type { BibleVersion, Highlight } from '@youversion/platform-core';
import { YouVersionPlatformConfiguration } from '@youversion/platform-core';
import {
  fillFor,
  getVerseEl,
  collection,
  Providers,
  stubUseHighlights,
} from '@/test/highlights-test-utils';

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
    votdLoading?: boolean;
    useHighlights?: HookOverrides['useHighlights'];
  } = {},
): HookOverrides {
  const {
    passageContent = MOCK_VERSE_HTML,
    passageError = null,
    votdError = null,
    votdLoading = false,
    useHighlights,
  } = overrides;

  return {
    useVerseOfTheDay: () => ({
      data: votdLoading ? null : { day: 1, passage_id: 'JHN.3.16' },
      loading: votdLoading,
      error: votdError,
      refetch: () => undefined,
    }),
    usePassage: () => ({
      passage:
        passageError || votdLoading
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
    useHighlights,
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
    expect(contentGroup).toHaveClass('yv:mx-auto');
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

describe('VerseOfTheDay - host highlights (controlled mode)', () => {
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
    const { container } = renderVotd(
      <VerseOfTheDay versionId={111} dayOfYear={1} highlights={[highlight('JHN.3.16', YELLOW)]} />,
      stubOverrides({ votdLoading: true }),
    );

    expect(container.querySelector('.yv-v')).toBeNull();
  });

  it("paints only the verses in today's passage", () => {
    const { container } = renderVotd(
      <VerseOfTheDay
        versionId={111}
        dayOfYear={1}
        highlights={[highlight('JHN.3.16-18', YELLOW), highlight('JHN.3.17', GREEN)]}
      />,
      stubOverrides({ passageContent: twoVerseHtml }),
    );

    expect(getVerseEl(container, 16).style.backgroundColor).toBe(fillFor(YELLOW));
    expect(getVerseEl(container, 17).style.backgroundColor).toBe('');
  });

  it('does not paint highlights for a different passage', () => {
    const { container } = renderVotd(
      <VerseOfTheDay versionId={111} dayOfYear={1} highlights={[highlight('GEN.1.1', YELLOW)]} />,
      stubOverrides({ passageContent: twoVerseHtml }),
    );

    expect(getVerseEl(container, 16).style.backgroundColor).toBe('');
    expect(getVerseEl(container, 17).style.backgroundColor).toBe('');
  });

  it("latches highlights at first mount, including while today's verse is still loading", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const loading = stubOverrides({ votdLoading: true });
    const loaded = stubOverrides({ passageContent: twoVerseHtml });
    try {
      const { container, rerender, unmount } = renderVotd(
        <VerseOfTheDay versionId={111} dayOfYear={1} />,
        loading,
      );

      rerender(
        <HookOverrideProvider overrides={loading}>
          <VerseOfTheDay
            versionId={111}
            dayOfYear={1}
            highlights={[highlight('JHN.3.16', YELLOW)]}
          />
        </HookOverrideProvider>,
      );
      rerender(
        <HookOverrideProvider overrides={loaded}>
          <VerseOfTheDay
            versionId={111}
            dayOfYear={1}
            highlights={[highlight('JHN.3.16', YELLOW)]}
          />
        </HookOverrideProvider>,
      );

      expect(getVerseEl(container, 16).style.backgroundColor).toBe('');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('`highlights` prop switched'));
      unmount();
      warn.mockClear();

      const controlled = renderVotd(
        <VerseOfTheDay
          versionId={111}
          dayOfYear={1}
          highlights={[highlight('JHN.3.16', YELLOW)]}
        />,
        loading,
      );
      controlled.rerender(
        <HookOverrideProvider overrides={loaded}>
          <VerseOfTheDay
            versionId={111}
            dayOfYear={1}
            highlights={[highlight('JHN.3.16', YELLOW)]}
          />
        </HookOverrideProvider>,
      );
      expect(getVerseEl(controlled.container, 16).style.backgroundColor).toBe(fillFor(YELLOW));

      controlled.rerender(
        <HookOverrideProvider overrides={loaded}>
          <VerseOfTheDay versionId={111} dayOfYear={1} />
        </HookOverrideProvider>,
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('`highlights` prop switched'));
      expect(getVerseEl(controlled.container, 16).style.backgroundColor).toBe('');
    } finally {
      warn.mockRestore();
    }
  });

  it('paints from a stubbed fetch when the prop is omitted, and paints nothing for a host empty array', () => {
    const hasPermission = vi
      .spyOn(YouVersionPlatformConfiguration, 'hasPermission')
      .mockReturnValue(true);
    const overrides = stubOverrides({
      passageContent: twoVerseHtml,
      useHighlights: stubUseHighlights({
        highlights: collection([highlight('JHN.3.16', YELLOW), highlight('JHN.3.17', GREEN)]),
      }),
    });

    try {
      const omitted = render(
        <Providers hookOverrides={overrides}>
          <VerseOfTheDay versionId={111} dayOfYear={1} />
        </Providers>,
      );
      expect(getVerseEl(omitted.container, 16).style.backgroundColor).toBe(fillFor(YELLOW));
      expect(getVerseEl(omitted.container, 17).style.backgroundColor).toBe('');
      omitted.unmount();

      const hostEmpty = render(
        <Providers hookOverrides={overrides}>
          <VerseOfTheDay versionId={111} dayOfYear={1} highlights={[]} />
        </Providers>,
      );
      expect(getVerseEl(hostEmpty.container, 16).style.backgroundColor).toBe('');
    } finally {
      hasPermission.mockRestore();
    }
  });
});
