import { useEffect, useRef, type FC } from 'react';
import { cn } from '../lib/utils';
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
  position: { x: number; y: number };
  onHighlight: (color: string) => void;
  onClearHighlights: () => void;
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

const VerseActionPopover: FC<VerseActionPopoverProps> = ({
  open,
  onOpenChange,
  activeHighlights,
  position,
  onHighlight,
  onClearHighlights,
  onCopy,
  onShare,
  theme = 'light',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Show/hide popover based on open state
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;

    if (open) {
      el.showPopover();
    } else {
      el.hidePopover();
    }
  }, [open]);

  // Listen for toggle events to sync state
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

  // Focus first button when popover opens
  useEffect(() => {
    if (open && popoverRef.current) {
      const firstButton = popoverRef.current.querySelector('button');
      firstButton?.focus();
    }
  }, [open]);

  // Build color circles: active highlights (with X) first, then remaining colors
  const activeColors = HIGHLIGHT_COLORS.filter((c) => activeHighlights.has(c));
  const inactiveColors = HIGHLIGHT_COLORS.filter((c) => !activeHighlights.has(c));
  const colorCircles = [
    ...activeColors.map((color) => ({ color, showX: true, key: `${color}-clear` })),
    ...inactiveColors.map((color) => ({ color, showX: false, key: color })),
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
        'yv:bg-popover yv:text-popover-foreground',
        'yv:rounded-full yv:shadow-lg yv:border yv:border-border',
        'yv:px-4 yv:py-2',
        'yv:flex yv:items-center yv:gap-3',
      )}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Highlight color circles */}
      <div className="yv:flex yv:items-center yv:gap-2" role="group" aria-label="Highlight colors">
        {colorCircles.map(({ color, showX, key }) => (
          <ColorCircle
            key={key}
            color={color}
            showX={showX}
            onClick={() => (showX ? onClearHighlights() : onHighlight(color))}
          />
        ))}
      </div>

      {/* Separator */}
      <div className="yv:w-px yv:h-8 yv:bg-border" aria-hidden="true" />

      {/* Action buttons */}
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

export default VerseActionPopover;
