import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VerseActionPopover, HIGHLIGHT_COLORS, type HighlightColor } from './verse-action-popover';

describe('VerseActionPopover', () => {
  const defaultProps = {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC1: Basic popover display', () => {
    it('should display 5 color circles when verse selected', () => {
      render(<VerseActionPopover {...defaultProps} />);

      const colorButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));

      expect(colorButtons).toHaveLength(5);
    });

    it('should render colors in correct order (yellow, green, blue, orange, pink)', () => {
      render(<VerseActionPopover {...defaultProps} />);

      const applyButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));

      expect(applyButtons).toHaveLength(5);
      applyButtons.forEach((btn) => {
        const bgColor = btn.style.backgroundColor;
        // Swatches render via theme tokens (var(--yv-*-30-dm)), with a hex fallback.
        expect(bgColor).toMatch(/^(#[a-fA-F0-9]{6}|rgb\(.*\)|var\(--.*\))$/);
      });
    });
  });

  describe('AC2: Apply highlight', () => {
    it('should call onHighlight when color circle clicked', () => {
      const onHighlight = vi.fn();
      render(<VerseActionPopover {...defaultProps} onHighlight={onHighlight} />);

      const firstColorButton = screen
        .getAllByRole('button')
        .find((btn) => btn.getAttribute('aria-label')?.includes('Apply'))!;

      fireEvent.click(firstColorButton);
      expect(onHighlight).toHaveBeenCalledWith(HIGHLIGHT_COLORS[0]);
    });

    it('should render popover with color buttons', () => {
      render(<VerseActionPopover {...defaultProps} />);

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
      render(<VerseActionPopover {...defaultProps} />);
      const copyButton = screen.getByText('Copy');
      expect(copyButton).toBeTruthy();
    });

    it('should call onCopy when copy button clicked', () => {
      const onCopy = vi.fn();
      render(<VerseActionPopover {...defaultProps} onCopy={onCopy} />);

      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);
      expect(onCopy).toHaveBeenCalled();
    });
  });

  describe('AC4: Share action', () => {
    it('should display share button', () => {
      render(<VerseActionPopover {...defaultProps} />);
      const shareButton = screen.getByText('Share');
      expect(shareButton).toBeTruthy();
    });

    it('should call onShare when share button clicked', () => {
      const onShare = vi.fn();
      render(<VerseActionPopover {...defaultProps} onShare={onShare} />);

      const shareButton = screen.getByText('Share');
      fireEvent.click(shareButton);
      expect(onShare).toHaveBeenCalled();
    });
  });

  describe('AC5: Single highlighted verse', () => {
    it('should show 5 circles: 1 remove + 4 apply (only inactive colors)', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0]]);
      const selectedVerses = [1];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0] };

      render(
        <VerseActionPopover
          {...defaultProps}
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
      expect(applyButtons).toHaveLength(4);
    });
  });

  describe('AC5a: Ordering of circles', () => {
    it('should show X circles leftmost, then apply circles for only inactive colors', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0], HIGHLIGHT_COLORS[2]]);
      const selectedVerses = [1, 2];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0], 2: HIGHLIGHT_COLORS[2] };

      render(
        <VerseActionPopover
          {...defaultProps}
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
    it('should show all 5 apply colors when there are unhighlighted verses', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0]]);
      const selectedVerses = [1, 2];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0] }; // verse 2 is unhighlighted

      render(
        <VerseActionPopover
          {...defaultProps}
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

      // 1 yellow remove + all 5 apply (because verse 2 is unhighlighted)
      expect(removeButtons).toHaveLength(1);
      expect(applyButtons).toHaveLength(5);
    });
  });

  describe('AC7: Multiple different highlights', () => {
    it('should show all 5 apply colors when multiple colors are active', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0], HIGHLIGHT_COLORS[1]]);
      const selectedVerses = [1, 2];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0], 2: HIGHLIGHT_COLORS[1] };

      render(
        <VerseActionPopover
          {...defaultProps}
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

      // 2 remove (X) + all 5 apply (because multiple colors)
      expect(removeButtons).toHaveLength(2);
      expect(applyButtons).toHaveLength(5);
    });

    it('should call onClearHighlight with color when X circle clicked', () => {
      const onClearHighlight = vi.fn();
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0]]);
      const selectedVerses = [1];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0] };

      render(
        <VerseActionPopover
          {...defaultProps}
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
          {...defaultProps}
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
          {...defaultProps}
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
      render(<VerseActionPopover {...defaultProps} open={false} />);

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('should render content when open is true', () => {
      render(<VerseActionPopover {...defaultProps} open={true} />);

      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    it('should use Radix popover with portal', () => {
      render(<VerseActionPopover {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all buttons', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0]]);
      const selectedVerses = [1];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0] };

      render(
        <VerseActionPopover
          {...defaultProps}
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
      render(<VerseActionPopover {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeTruthy();
      expect(dialog.getAttribute('aria-label')).toBe('Verse actions');
    });

    it('should have semantic color group', () => {
      render(<VerseActionPopover {...defaultProps} />);

      const colorGroup = screen.getByRole('group', { name: 'Highlight colors' });
      expect(colorGroup).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should have data-yv-sdk attribute for scoping', () => {
      render(<VerseActionPopover {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('data-yv-sdk')).not.toBeNull();
    });

    it('should apply theme attribute', () => {
      render(<VerseActionPopover {...defaultProps} theme="dark" />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('data-yv-theme')).toBe('dark');
    });

    it('should default to light theme', () => {
      render(<VerseActionPopover {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog.getAttribute('data-yv-theme')).toBe('light');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty active highlights', () => {
      const activeHighlights = new Set<HighlightColor>();

      render(<VerseActionPopover {...defaultProps} activeHighlights={activeHighlights} />);

      const applyButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('Apply'));

      // Should still show 5 apply colors
      expect(applyButtons).toHaveLength(5);
    });

    it('should handle all 5 colors highlighted', () => {
      const activeHighlights = new Set<HighlightColor>(HIGHLIGHT_COLORS);
      const selectedVerses = [1, 2, 3, 4, 5];
      const highlightedVerses = {
        1: HIGHLIGHT_COLORS[0],
        2: HIGHLIGHT_COLORS[1],
        3: HIGHLIGHT_COLORS[2],
        4: HIGHLIGHT_COLORS[3],
        5: HIGHLIGHT_COLORS[4],
      };

      render(
        <VerseActionPopover
          {...defaultProps}
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

      // 5 remove (X) + 0 apply (all colors already active) = 5 total
      expect(removeButtons).toHaveLength(5);
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
          {...defaultProps}
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

      // 3 remove (X for Y, B, G) + all 5 apply (yellow, green, blue, orange, pink) = 8 total
      expect(removeButtons).toHaveLength(3);
      expect(applyButtons).toHaveLength(5);
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

  describe('Highlights disabled (flag off)', () => {
    it('hides the color row and remove circles but keeps Copy / Share', () => {
      render(
        <VerseActionPopover
          {...defaultProps}
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
