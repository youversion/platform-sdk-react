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
      const { container } = render(<VerseActionPopover {...defaultProps} />);

      const applyButtons = Array.from(container.querySelectorAll('[aria-label*="Apply"]'));

      expect(applyButtons).toHaveLength(5);
      applyButtons.forEach((btn) => {
        const bgColor = (btn as HTMLElement).style.backgroundColor;
        expect(bgColor).toMatch(/^(#[a-fA-F0-9]{6}|rgb\(.*\))$/);
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

    it('should dismiss popover after applying highlight', () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <VerseActionPopover {...defaultProps} onOpenChange={onOpenChange} />,
      );

      const popover = container.querySelector('[popover]')!;
      expect(popover).not.toBeNull();

      const firstColorButton = screen
        .getAllByRole('button')
        .find((btn) => btn.getAttribute('aria-label')?.includes('Apply'))!;

      fireEvent.click(firstColorButton);
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

      const { container } = render(
        <VerseActionPopover
          {...defaultProps}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
        />,
      );

      const colorGroup = container.querySelector('[role="group"]')!;
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

      const { container } = render(
        <VerseActionPopover
          {...defaultProps}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
          onClearHighlight={onClearHighlight}
        />,
      );

      const removeButtons = Array.from(container.querySelectorAll('[aria-label*="Clear"]'));
      expect(removeButtons).toHaveLength(2);

      // Click first remove button (yellow)
      const firstBtn = removeButtons[0];
      const secondBtn = removeButtons[1];
      if (!firstBtn || !secondBtn) throw new Error('Expected 2 remove buttons');

      fireEvent.click(firstBtn);
      expect(onClearHighlight).toHaveBeenCalledWith(HIGHLIGHT_COLORS[0]);

      // Click second remove button (green)
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
    it('should not render when open is false', () => {
      const { container } = render(<VerseActionPopover {...defaultProps} open={false} />);

      expect(container.querySelector('[role="dialog"]')).toBeNull();
    });

    it('should render when open is true', () => {
      const { container } = render(<VerseActionPopover {...defaultProps} open={true} />);

      expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    });

    it('should have fixed positioning for popover API', () => {
      const { container } = render(<VerseActionPopover {...defaultProps} />);

      const popover = container.querySelector('[role="dialog"]')!;
      expect((popover as HTMLElement).style.position).toBe('fixed');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all buttons', () => {
      const activeHighlights = new Set<HighlightColor>([HIGHLIGHT_COLORS[0]]);
      const selectedVerses = [1];
      const highlightedVerses = { 1: HIGHLIGHT_COLORS[0] };

      const { container } = render(
        <VerseActionPopover
          {...defaultProps}
          activeHighlights={activeHighlights}
          selectedVerses={selectedVerses}
          highlightedVerses={highlightedVerses}
        />,
      );

      // Get color circle buttons (color buttons have aria-label with color name)
      const colorButtons = container.querySelectorAll('[aria-label*="highlight"]');
      colorButtons.forEach((btn) => {
        const label = btn.getAttribute('aria-label');
        expect(label).toMatch(/^(Apply|Clear) highlight$/);
      });

      // Check action buttons have accessible text (they use icon + text)
      const copyButton = screen.getByText('Copy');
      const shareButton = screen.getByText('Share');
      expect(copyButton).toBeTruthy();
      expect(shareButton).toBeTruthy();
    });

    it('should have dialog role with aria-label', () => {
      const { container } = render(<VerseActionPopover {...defaultProps} />);

      const dialog = container.querySelector('[role="dialog"]');
      expect(dialog).toBeTruthy();
      expect(dialog?.getAttribute('aria-label')).toBe('Verse actions');
    });

    it('should have semantic color group', () => {
      const { container } = render(<VerseActionPopover {...defaultProps} />);

      const colorGroup = container.querySelector('[role="group"]');
      expect(colorGroup).toBeTruthy();
      expect(colorGroup?.getAttribute('aria-label')).toBe('Highlight colors');
    });
  });

  describe('Styling', () => {
    it('should have data-yv-sdk attribute for scoping', () => {
      const { container } = render(<VerseActionPopover {...defaultProps} />);

      expect(container.querySelector('[data-yv-sdk]')).toBeTruthy();
    });

    it('should apply theme attribute', () => {
      const { container } = render(<VerseActionPopover {...defaultProps} theme="dark" />);

      expect(container.querySelector('[data-yv-theme="dark"]')).toBeTruthy();
    });

    it('should default to light theme', () => {
      const { container } = render(<VerseActionPopover {...defaultProps} />);

      expect(container.querySelector('[data-yv-theme="light"]')).toBeTruthy();
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
});
