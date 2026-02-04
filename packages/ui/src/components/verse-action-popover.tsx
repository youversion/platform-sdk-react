import { useEffect, useRef, type FC } from 'react';
import { cn } from '../lib/utils';
import { useAnchorPositioningPolyfill } from '../lib/use-anchor-positioning-polyfill';
import { BoxStackIcon } from './icons/box-stack';
import { BoxArrowUpIcon } from './icons/box-arrow-up';
import { XIcon } from './icons/x';

// Hex colors (6-digit, no #) matching core schema
export const HIGHLIGHT_COLORS = ['e6d163', '9ec56e', '6eb5c5', 'd4a054', 'd485b2'] as const;

export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

type VerseActionPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeHighlights: Set<string>;
  selectedVerses: number[];
  highlightedVerses: Record<number, string>;
  anchorElement?: HTMLElement | null;
  onHighlight: (color: string) => void;
  onClearHighlight: (color: string) => void;
  onCopy: () => void;
  onShare: () => void;
  theme?: 'light' | 'dark';
};

type ColorCircleProps = {
  color: string;
  showX: boolean;
  onClick: () => void;
};

function ColorCircle({ color, showX, onClick }: ColorCircleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'yv:size-8 yv:rounded-full yv:flex yv:items-center yv:justify-center',
        'yv:transition-transform yv:hover:scale-110',
        'yv:focus-visible:outline-none yv:focus-visible:ring-2 yv:focus-visible:ring-ring yv:focus-visible:ring-offset-2',
      )}
      style={{ backgroundColor: `#${color}` }}
      aria-label={showX ? `Clear highlight` : `Apply highlight`}
    >
      {showX && <XIcon className="yv:size-4 yv:text-foreground" />}
    </button>
  );
}

type ActionButtonProps = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
};

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'yv:flex yv:flex-col yv:items-center yv:gap-1 yv:px-2 yv:py-1',
        'yv:text-xs yv:text-foreground',
        'yv:rounded-md yv:transition-colors yv:hover:bg-muted',
        'yv:focus-visible:outline-none yv:focus-visible:ring-2 yv:focus-visible:ring-ring',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

const ANCHOR_NAME = '--yv-verse-action-anchor';

export const VerseActionPopover: FC<VerseActionPopoverProps> = ({
  open,
  onOpenChange,
  activeHighlights,
  selectedVerses,
  highlightedVerses,
  anchorElement,
  onHighlight,
  onClearHighlight,
  onCopy,
  onShare,
  theme = 'light',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load CSS anchor positioning polyfill for older browsers
  useAnchorPositioningPolyfill();

  // Set anchor-name on the anchor element when it changes
  useEffect(() => {
    if (!anchorElement) return;

    const prevAnchorName = anchorElement.style.getPropertyValue('anchor-name');
    anchorElement.style.setProperty('anchor-name', ANCHOR_NAME);

    return () => {
      if (prevAnchorName) {
        anchorElement.style.setProperty('anchor-name', prevAnchorName);
      } else {
        anchorElement.style.removeProperty('anchor-name');
      }
    };
  }, [anchorElement]);

  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;

    if (open) {
      el.showPopover();
    } else {
      el.hidePopover();
    }
  }, [open]);

  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;

    const handleToggle = (e: ToggleEvent) => {
      if (e.newState === 'closed') {
        onOpenChange(false);
      }
    };

    el.addEventListener('toggle', handleToggle);
    return () => el.removeEventListener('toggle', handleToggle);
  }, [onOpenChange]);

  useEffect(() => {
    if (open && popoverRef.current) {
      const firstButton = popoverRef.current.querySelector('button');
      firstButton?.focus();
    }
  }, [open]);

  const activeColors = HIGHLIGHT_COLORS.filter((c) => activeHighlights.has(c));
  const highlightedVerseCount = selectedVerses.filter((v) => highlightedVerses[v]).length;
  const unHighlightedCount = selectedVerses.length - highlightedVerseCount;
  const allColorsActive = activeHighlights.size === HIGHLIGHT_COLORS.length;
  const showAllApplyColors =
    !allColorsActive && (unHighlightedCount > 0 || activeHighlights.size > 1);
  const colorsToApply = showAllApplyColors
    ? HIGHLIGHT_COLORS
    : HIGHLIGHT_COLORS.filter((c) => !activeHighlights.has(c));

  const colorCircles = [
    ...activeColors.map((color) => ({ color, showX: true, key: `${color}-clear` })),
    ...colorsToApply.map((color) => ({ color, showX: false, key: `${color}-apply` })),
  ];

  if (!open) {
    return null;
  }

  return (
    <div
      ref={popoverRef}
      popover="manual"
      data-yv-sdk
      data-yv-theme={theme}
      role="dialog"
      aria-label="Verse actions"
      className={cn(
        'yv:bg-card yv:text-popover-foreground',
        'yv:rounded-full yv:drop-shadow-[0_6px_12px_rgb(0,0,0,0.2)]',
        'yv:px-4 yv:py-2',
        'yv:flex yv:items-center yv:gap-3',
        'yv:m-0',
        'yv:overflow-visible yv:relative',
      )}
      style={
        {
          position: 'fixed',
          positionAnchor: ANCHOR_NAME,
          top: `anchor(bottom)`,
          left: `anchor(center)`,
          translate: '-50% 20px',
        } as React.CSSProperties
      }
    >
      {/* Caret - position absolutely */}
      <svg
        className="yv:text-(--yv-gray-2) yv:absolute yv:-top-[16px] yv:left-1/2 yv:-translate-x-1/2"
        width="33"
        height="17"
        viewBox="0 0 33 17"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M16.0215 0L32.0429 16.5H0L16.0215 0Z" fill="currentColor" />
      </svg>

      <div className="yv:flex yv:items-center yv:gap-2" role="group" aria-label="Highlight colors">
        {colorCircles.map(({ color, showX, key }) => (
          <ColorCircle
            key={key}
            color={color}
            showX={showX}
            onClick={() => (showX ? onClearHighlight(color) : onHighlight(color))}
          />
        ))}
      </div>

      {/* Separator */}
      <div className="yv:w-px yv:h-8 yv:bg-border" aria-hidden="true" />

      <div className="yv:flex yv:items-center yv:gap-1">
        <ActionButton icon={<BoxStackIcon className="yv:size-5" />} label="Copy" onClick={onCopy} />
        <ActionButton
          icon={<BoxArrowUpIcon className="yv:size-5" />}
          label="Share"
          onClick={onShare}
        />
      </div>
    </div>
  );
};
