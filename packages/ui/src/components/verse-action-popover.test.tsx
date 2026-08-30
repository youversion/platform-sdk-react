import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShadowRootHost } from '@/lib/shadow-root-host';
import { requireShadowRoot } from '@/test/dom-stubs';
import { fillFor } from '@/test/highlights-test-utils';
import {
  VerseActionPopover,
  HIGHLIGHT_COLORS,
  computeScrollFade,
  type HighlightColor,
} from './verse-action-popover';

function createDefaultProps() {
  return {
    open: true,
    onOpenChange: vi.fn(),
    activeHighlights: new Set<string>(),
    selectedVerses: [],
    highlightedVerses: {},
    anchorElement: null,
    onHighlight: vi.fn(),
    onClearHighlight: vi.fn(),
    onCopy: vi.fn(),
    onShare: vi.fn(),
  };
}

describe('VerseActionPopover', () => {
  describe('AC1: Basic popover display', () => {
    it('should display 6 color circles when verse selected', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);

      const colorButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));

      expect(colorButtons).toHaveLength(6);
    });

    it('should render the six apply colors', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);

      const applyButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));

      expect(applyButtons).toHaveLength(6);
      applyButtons.forEach((btn) => {
        expect(btn.style.backgroundColor).toContain('color-mix');
        expect(btn.style.backgroundColor).toContain('var(--yv-card)');
      });
    });
  });

  describe('AC1b: Initial focus on open', () => {
    // The bar opens from a mouse/tap on non-focusable verse text. If Radix
    // autofocused the first swatch, Chromium would treat that programmatic focus
    // as keyboard-like and paint a stray `:focus-visible` ring on the swatch. We
    // redirect initial focus to the (non-tabbable) content element instead, so
    // the ring only appears once the user actually Tabs to a swatch.
    it('moves initial focus to the popover content, not the first swatch', async () => {
      render(<VerseActionPopover {...createDefaultProps()} />);

      const dialog = screen.getByRole('dialog');
      const firstSwatch = screen
        .getAllByRole('button')
        .find((btn) => btn.getAttribute('aria-label')?.includes('Apply'))!;

      await waitFor(() => {
        expect(document.activeElement).toBe(dialog);
      });
      expect(document.activeElement).not.toBe(firstSwatch);
    });
  });

  describe('AC2: Apply highlight', () => {
    it('should call onHighlight when color circle clicked', () => {
      const onHighlight = vi.fn();
      render(<VerseActionPopover {...createDefaultProps()} onHighlight={onHighlight} />);

      const firstColorButton = screen
        .getAllByRole('button')
        .find((btn) => btn.getAttribute('aria-label')?.includes('Apply'))!;

      fireEvent.click(firstColorButton);
      expect(onHighlight).toHaveBeenCalledWith(HIGHLIGHT_COLORS[0]);
    });

    it('should render popover with color buttons', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeTruthy();

      const firstColorButton = screen
        .getAllByRole('button')
        .find((btn) => btn.getAttribute('aria-label')?.includes('Apply'))!;

      expect(firstColorButton).toBeTruthy();
    });
  });

  describe('AC3: Copy action', () => {
    it('should display copy button', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);
      const copyButton = screen.getByText('Copy');
      expect(copyButton).toBeTruthy();
    });

    it('should call onCopy when copy button clicked', () => {
      const onCopy = vi.fn();
      render(<VerseActionPopover {...createDefaultProps()} onCopy={onCopy} />);

      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);
      expect(onCopy).toHaveBeenCalled();
    });
  });

  describe('AC4: Share action', () => {
    it('should display share button', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);
      const shareButton = screen.getByText('Share');
      expect(shareButton).toBeTruthy();
    });

    it('should call onShare when share button clicked', () => {
      const onShare = vi.fn();
      render(<VerseActionPopover {...createDefaultProps()} onShare={onShare} />);

      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      expect(onShare).toHaveBeenCalled();
    });
  });

  describe('AC5: Single highlighted verse', () => {
    it('should show 6 circles: 1 remove + 5 apply (only inactive colors)', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0]]);
      const selectedVerses = [1];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0] };

      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
        />,
      );

      const removeButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Clear'));

      const applyButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));

      expect(removeButtons).toHaveLength(1);
      expect(applyButtons).toHaveLength(5);
    });
  });

  describe('AC5a: Ordering of circles', () => {
    it('should show X circles leftmost, then apply circles for only inactive colors', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0], HIGHLIGHT_COLORS[2]]);
      const selectedVerses = [1, 2];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0], 2: HIGHLIGHT_COLORS[2] };

      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
        />,
      );

      const colorGroup = screen.getByRole('group', { name: 'Highlight colors' });
      const buttons = Array.from(colorGroup.querySelectorAll('button'));

      // First 2 should be clear (yellow, blue), then 3 apply (green, orange, pink - the inactive ones)
      expect(buttons[0]?.getAttribute('aria-label')).toContain('Clear');
      expect(buttons[1]?.getAttribute('aria-label')).toContain('Clear');
      expect(buttons[2]?.getAttribute('aria-label')).toContain('Apply');
      expect(buttons[3]?.getAttribute('aria-label')).toContain('Apply');
      expect(buttons[4]?.getAttribute('aria-label')).toContain('Apply');
    });
  });

  describe('AC6: Mixed selection (highlighted + unhighlighted)', () => {
    it('should show all 6 apply colors when there are unhighlighted verses', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0]]);
      const selectedVerses = [1, 2];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0] }; // verse 2 is unhighlighted

      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
        />,
      );

      const removeButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Clear'));

      const applyButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));

      // 1 yellow remove + all 6 apply (because verse 2 is unhighlighted)
      expect(removeButtons).toHaveLength(1);
      expect(applyButtons).toHaveLength(6);
    });
  });

  describe('AC7: Multiple different highlights', () => {
    it('should show all 6 apply colors when multiple colors are active', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0], HIGHLIGHT_COLORS[1]]);
      const selectedVerses = [1, 2];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0], 2: HIGHLIGHT_COLORS[1] };

      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
        />,
      );

      const removeButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Clear'));

      const applyButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));

      // 2 remove + all 6 apply (because multiple colors)
      expect(removeButtons).toHaveLength(2);
      expect(applyButtons).toHaveLength(6);
    });

    it('should call onClearHighlight with color when clear swatch clicked', () => {
      const onClearHighlight = vi.fn();
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0]]);
      const selectedVerses = [1];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0] };

      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
          onClearHighlight={onClearHighlight}
        />,
      );

      const removeButton = screen.getByRole('button', { name: /Clear highlight/ });
      fireEvent.click(removeButton);
      expect(onClearHighlight).toHaveBeenCalledWith(HIGHLIGHT_COLORS[0]);
    });

    it('should call onClearHighlight with correct color for each button clicked', () => {
      const onClearHighlight = vi.fn();
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0], HIGHLIGHT_COLORS[1]]);
      const selectedVerses = [1, 2];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0], 2: HIGHLIGHT_COLORS[1] };

      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
          onClearHighlight={onClearHighlight}
        />,
      );

      const removeButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Clear'));
      expect(removeButtons).toHaveLength(2);

      const firstBtn = removeButtons[0];
      const secondBtn = removeButtons[1];
      if (!firstBtn || !secondBtn) throw new Error('Expected 2 remove buttons');

      fireEvent.click(firstBtn);
      expect(onClearHighlight).toHaveBeenCalledWith(HIGHLIGHT_COLORS[0]);

      fireEvent.click(secondBtn);
      expect(onClearHighlight).toHaveBeenCalledWith(HIGHLIGHT_COLORS[1]);
    });
  });

  describe('AC8 & AC8a: Dismiss logic on remove', () => {
    it('should show remove buttons for active highlights', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0], HIGHLIGHT_COLORS[1]]);
      const selectedVerses = [1, 2];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0], 2: HIGHLIGHT_COLORS[1] };

      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
        />,
      );

      const removeButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Clear'));

      expect(removeButtons).toHaveLength(2);
    });
  });

  describe('Popover visibility', () => {
    it('should not render content when open is false', () => {
      render(<VerseActionPopover {...createDefaultProps()} open={false} />);

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('should render content when open is true', () => {
      render(<VerseActionPopover {...createDefaultProps()} open={true} />);

      expect(screen.getByRole('dialog')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all buttons', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0]]);
      const selectedVerses = [1];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0] };

      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
        />,
      );

      const colorButtons = screen.getAllByRole('button').filter((btn) => {
        const label = btn.getAttribute('aria-label');
        return label?.includes('highlight');
      });
      colorButtons.forEach((btn) => {
        const label = btn.getAttribute('aria-label');
        expect(label).toMatch(/^(Apply|Clear) highlight$/);
      });

      expect(screen.getByText('Copy')).toBeTruthy();
      expect(screen.getByText('Share')).toBeTruthy();
    });

    it('should have dialog role with aria-label', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeTruthy();
      expect(dialog.getAttribute('aria-label')).toBe('Verse actions');
    });

    it('should have semantic color group', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);

      const colorGroup = screen.getByRole('group', { name: 'Highlight colors' });
      expect(colorGroup).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should have data-yv-sdk attribute for scoping', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('data-yv-sdk')).not.toBeNull();
    });

    it('should apply theme attribute', () => {
      render(<VerseActionPopover {...createDefaultProps()} theme="dark" />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('data-yv-theme')).toBe('dark');
    });

    it('should default to light theme', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('data-yv-theme')).toBe('light');
    });
  });

  describe('Edge cases', () => {
    it('shows a remove swatch for a valid non-palette color at exact hex', () => {
      const custom = 'aabbcc';
      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={new Set([custom])}
          selectedVerses={[1]}
          highlightedVerses={{ 1: custom }}
        />,
      );

      const removeButtons = clearButtons();
      expect(removeButtons).toHaveLength(1);
      expect(removeButtons[0]!.style.backgroundColor).toBe(fillFor(custom, 'card'));
    });

    it('shows leftover fffe00 as a remove swatch, not an apply swatch', () => {
      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={new Set(['fffe00'])}
          selectedVerses={[1]}
          highlightedVerses={{ 1: 'fffe00' }}
        />,
      );

      expect(clearButtons()).toHaveLength(1);
      expect(clearButtons()[0]!.style.backgroundColor).toBe(fillFor('fffe00', 'card'));
      expect(applyButtons().map((btn) => btn.style.backgroundColor)).not.toContain(
        fillFor('fffe00', 'card'),
      );
      expect(applyButtons()).toHaveLength(6);
    });

    it('should handle empty active highlights', () => {
      const activeHighlights = new Set<HighlightColor>();

      render(<VerseActionPopover {...createDefaultProps()} activeHighlights={activeHighlights} />);

      const applyButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));

      // Should still show 6 apply colors
      expect(applyButtons).toHaveLength(6);
    });

    it('should handle all 6 colors highlighted', () => {
      const activeHighlights = new Set<HighlightColor>(HIGHLIGHT_COLORS);
      const selectedVerses = [1, 2, 3, 4, 5, 6];
      const highlightedVerses = {
        1: HIGHLIGHT_COLORS[0],
        2: HIGHLIGHT_COLORS[1],
        3: HIGHLIGHT_COLORS[2],
        4: HIGHLIGHT_COLORS[3],
        5: HIGHLIGHT_COLORS[4],
        6: HIGHLIGHT_COLORS[5],
      };

      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
        />,
      );

      const removeButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Clear'));

      const applyButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));

      // 6 remove + 0 apply (all colors already active)
      expect(removeButtons).toHaveLength(6);
      expect(applyButtons).toHaveLength(0);
    });

    it('should show 3 verses with different highlights: Y(x), B(x), G(x), Y, G, B, O, P', () => {
      const activeHighlights = new Set<HighlightColor>([
        HIGHLIGHT_COLORS[0], // yellow
        HIGHLIGHT_COLORS[2], // blue
        HIGHLIGHT_COLORS[1], // green
      ]);
      const selectedVerses = [1, 2, 3];
      const highlightedVerses = {
        1: HIGHLIGHT_COLORS[0], // yellow
        2: HIGHLIGHT_COLORS[2], // blue
        3: HIGHLIGHT_COLORS[1], // green
      };

      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
        />,
      );

      const removeButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Clear'));

      const applyButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));

      // 3 remove + all 6 apply
      expect(removeButtons).toHaveLength(3);
      expect(applyButtons).toHaveLength(6);
    });
  });

  function applyButtons() {
    return screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));
  }

  function clearButtons() {
    return screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('aria-label')?.includes('Clear'));
  }

  describe('Active swatch checkmark', () => {
    // The checkmark path (Swift #179) starts at these coords — asserts we render
    // the check, not the old X.
    const CHECK_PATH_PREFIX = 'M19.6627';

    it('renders a checkmark (not an X) on the active/remove swatch', () => {
      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={new Set<HighlightColor>([HIGHLIGHT_COLORS[0]])}
          selectedVerses={[1]}
          highlightedVerses={{ 1: HIGHLIGHT_COLORS[0] }}
        />,
      );

      const removeButton = screen.getByRole('button', { name: /Clear highlight/ });
      const path = removeButton.querySelector('svg path');
      expect(path?.getAttribute('d')).toContain(CHECK_PATH_PREFIX);
    });

    it('apply swatches render no icon', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);
      applyButtons().forEach((btn) => {
        expect(btn.querySelector('svg')).toBeNull();
      });
    });
  });

  describe('Swatch fill preview (theme-aware)', () => {
    // First apply swatch is `ffec5b`. Light is identity; dark mixes against the card.
    function firstApplySwatch() {
      return applyButtons()[0]!;
    }

    it('paints drawer dots with the unmixed stored hex in light mode', () => {
      render(<VerseActionPopover {...createDefaultProps()} theme="light" />);
      expect(firstApplySwatch().style.backgroundColor).toBe(fillFor(HIGHLIGHT_COLORS[0], 'card'));
    });

    it('paints drawer dots with the dark mix against the card surface', () => {
      render(<VerseActionPopover {...createDefaultProps()} theme="dark" />);
      expect(firstApplySwatch().style.backgroundColor).toBe(fillFor(HIGHLIGHT_COLORS[0], 'card'));
      expect(firstApplySwatch().style.backgroundColor).toContain('var(--yv-card)');
    });

    it('uses a dark inner stroke in light mode and a light one in dark mode', () => {
      const { unmount } = render(<VerseActionPopover {...createDefaultProps()} theme="light" />);
      expect(firstApplySwatch().style.border).toContain('rgba(18, 18, 18, 0.2)');
      unmount();

      render(<VerseActionPopover {...createDefaultProps()} theme="dark" />);
      expect(firstApplySwatch().style.border).toContain('rgba(255, 255, 255, 0.2)');
    });

    it('keeps the active-swatch checkmark legible on the dimmed dark-mode fill', () => {
      render(
        <VerseActionPopover
          {...createDefaultProps()}
          theme="dark"
          activeHighlights={new Set<HighlightColor>([HIGHLIGHT_COLORS[0]])}
          selectedVerses={[1]}
          highlightedVerses={{ 1: HIGHLIGHT_COLORS[0] }}
        />,
      );
      const check = screen.getByRole('button', { name: /Clear highlight/ }).querySelector('svg');
      expect(check?.getAttribute('class')).toContain('yv:text-white');
    });

    it('keeps the light-mode checkmark in the Text/Everdark color', () => {
      render(
        <VerseActionPopover
          {...createDefaultProps()}
          theme="light"
          activeHighlights={new Set<HighlightColor>([HIGHLIGHT_COLORS[0]])}
          selectedVerses={[1]}
          highlightedVerses={{ 1: HIGHLIGHT_COLORS[0] }}
        />,
      );
      const check = screen.getByRole('button', { name: /Clear highlight/ }).querySelector('svg');
      expect(check?.getAttribute('class')).toContain('yv:text-(--yv-gray-50)');
    });

    it('uses a white checkmark on a dark remove swatch in light mode', () => {
      const custom = '000000';
      render(
        <VerseActionPopover
          {...createDefaultProps()}
          theme="light"
          activeHighlights={new Set([custom])}
          selectedVerses={[1]}
          highlightedVerses={{ 1: custom }}
        />,
      );
      const check = screen.getByRole('button', { name: /Clear highlight/ }).querySelector('svg');
      expect(check?.getAttribute('class')).toContain('yv:text-white');
    });
  });

  describe('Viewport width cap + scrollable swatch row', () => {
    // Mobile bug: several verses with different highlight colors accumulate many
    // swatches and grow the pill past the viewport, cutting content off with no
    // way to reach it. The pill is now capped to the viewport and the swatch row
    // scrolls horizontally inside it.
    it('caps the popover content to the min of the Radix available width and the live viewport', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);
      const dialog = screen.getByRole('dialog');
      // The `min(..., calc(100vw-24px))` term is what keeps the cap honest when
      // the viewport shrinks under an open popover — Radix's own var goes stale
      // on a plain window resize.
      expect(dialog.className).toContain(
        'yv:max-w-[min(var(--radix-popover-content-available-width),calc(100vw-24px))]',
      );
    });

    it('makes the swatch row horizontally scrollable with a hidden scrollbar', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);
      const swatchRow = screen.getByRole('group', { name: 'Highlight colors' });
      expect(swatchRow.className).toContain('yv:overflow-x-auto');
      expect(swatchRow.className).toContain('yv:scrollbar-hide');
      // `min-w-0` is what lets the flex child shrink so overflow-x engages
      // instead of the pill just growing wider.
      expect(swatchRow.className).toContain('yv:min-w-0');
    });

    it('keeps swatches from squishing when the row is capped', () => {
      render(<VerseActionPopover {...createDefaultProps()} />);
      const applyButton = screen
        .getAllByRole('button')
        .find((btn) => btn.getAttribute('aria-label')?.includes('Apply'))!;
      expect(applyButton.className).toContain('yv:shrink-0');
    });

    // Regression guard for the live-browser defect: the scroll listener must be
    // wired to the swatch row's actual mount. Radix's Portal/Presence commits
    // the Content DOM in a deferred pass, so an effect keyed on `open` runs
    // against a still-null ref and never re-runs — no listener, no fade. Keying
    // the effect on the state-held node (callback ref) fixes it. jsdom has no
    // layout, so we fake overflow metrics and drive a real scroll event: the
    // mask only appears if the handler is actually attached and firing. This
    // test is red against the pre-fix wiring (listener never attached).
    it('engages the edge-fade mask on scroll once the row overflows', () => {
      render(
        <VerseActionPopover
          {...createDefaultProps()}
          activeHighlights={new Set<HighlightColor>(HIGHLIGHT_COLORS)}
          selectedVerses={[1, 2, 3, 4, 5]}
          highlightedVerses={{
            1: HIGHLIGHT_COLORS[0],
            2: HIGHLIGHT_COLORS[1],
            3: HIGHLIGHT_COLORS[2],
            4: HIGHLIGHT_COLORS[3],
            5: HIGHLIGHT_COLORS[4],
          }}
        />,
      );
      const swatchRow = screen.getByRole('group', { name: 'Highlight colors' });

      // No layout in jsdom → no mask at rest.
      expect(swatchRow.getAttribute('style') ?? '').not.toContain('linear-gradient');

      // Fake an overflowing row scrolled to the middle, then fire a real scroll
      // event. Only an attached handler will read these and apply the mask.
      Object.defineProperty(swatchRow, 'scrollWidth', { configurable: true, value: 500 });
      Object.defineProperty(swatchRow, 'clientWidth', { configurable: true, value: 200 });
      Object.defineProperty(swatchRow, 'scrollLeft', {
        configurable: true,
        writable: true,
        value: 120,
      });
      fireEvent.scroll(swatchRow);

      // Both edges have hidden content → a two-sided fade mask is applied.
      expect(swatchRow.getAttribute('style') ?? '').toContain('linear-gradient');
    });
  });

  describe('computeScrollFade (edge-fade toggle logic)', () => {
    // jsdom has no layout, so exercise the pure helper with mocked scroll
    // metrics rather than asserting rendered pixels.
    it('fades neither edge when the row fits (no overflow)', () => {
      expect(computeScrollFade({ scrollLeft: 0, scrollWidth: 200, clientWidth: 200 })).toEqual({
        start: false,
        end: false,
      });
    });

    it('fades only the end edge when scrolled fully to the start', () => {
      expect(computeScrollFade({ scrollLeft: 0, scrollWidth: 500, clientWidth: 200 })).toEqual({
        start: false,
        end: true,
      });
    });

    it('fades both edges when scrolled somewhere in the middle', () => {
      expect(computeScrollFade({ scrollLeft: 120, scrollWidth: 500, clientWidth: 200 })).toEqual({
        start: true,
        end: true,
      });
    });

    it('fades only the start edge when scrolled fully to the end', () => {
      expect(computeScrollFade({ scrollLeft: 300, scrollWidth: 500, clientWidth: 200 })).toEqual({
        start: true,
        end: false,
      });
    });

    it('tolerates sub-pixel slack at both bounds', () => {
      // Half a pixel shy of each bound still counts as "at the edge".
      expect(computeScrollFade({ scrollLeft: 0.5, scrollWidth: 500, clientWidth: 200 })).toEqual({
        start: false,
        end: true,
      });
      expect(computeScrollFade({ scrollLeft: 299.5, scrollWidth: 500, clientWidth: 200 })).toEqual({
        start: true,
        end: false,
      });
    });
  });

  describe('Highlights disabled (flag off)', () => {
    it('hides the color row and remove circles but keeps Copy / Share', () => {
      render(
        <VerseActionPopover
          {...createDefaultProps()}
          highlightsEnabled={false}
          activeHighlights={new Set<HighlightColor>([HIGHLIGHT_COLORS[0]])}
          selectedVerses={[1]}
          highlightedVerses={{ 1: HIGHLIGHT_COLORS[0] }}
        />,
      );

      // No color group, no apply circles, no remove circles.
      expect(screen.queryByRole('group', { name: 'Highlight colors' })).toBeNull();
      expect(applyButtons()).toHaveLength(0);
      expect(clearButtons()).toHaveLength(0);

      // Copy / Share remain.
      expect(screen.getByText('Copy')).toBeTruthy();
      expect(screen.getByText('Share')).toBeTruthy();
    });
  });
});

it('keeps isolated content in its shadow tree and preserves the document portal otherwise', async () => {
  const isolatedRender = render(
    <ShadowRootHost portalStrategy="local-inline">
      <VerseActionPopover {...createDefaultProps()} />
    </ShadowRootHost>,
  );
  const shadowRoot = requireShadowRoot(isolatedRender.container);

  const isolatedDialog = await waitFor(() => {
    const element = shadowRoot.querySelector<HTMLElement>('[role="dialog"]');
    if (!element) throw new Error('isolated verse action popover not rendered');
    return element;
  });
  expect(isolatedDialog.getRootNode()).toBe(shadowRoot);
  expect(shadowRoot.querySelector('[data-yv-shadow-inline-overlay]')).toContainElement(
    isolatedDialog,
  );
  expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  isolatedRender.unmount();

  const documentRender = render(<VerseActionPopover {...createDefaultProps()} />);
  const documentDialog = screen.getByRole('dialog');
  expect(documentDialog.getRootNode()).toBe(document);
  expect(document.body).toContainElement(documentDialog);
  expect(documentRender.container).not.toContainElement(documentDialog);
});
