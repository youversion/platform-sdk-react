import { useMemo, type FC } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../lib/utils';
import { BoxStackIcon } from './icons/box-stack';
import { BoxArrowUpIcon } from './icons/box-arrow-up';
import { XIcon } from './icons/x';

type Measurable = { getBoundingClientRect: () => DOMRect };

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
  const virtualRef = useMemo(
    () => (anchorElement ? { current: anchorElement as Measurable } : undefined),
    [anchorElement],
  );

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

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Anchor virtualRef={virtualRef} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          aria-label="Verse actions"
          data-yv-sdk
          data-yv-theme={theme}
          side="bottom"
          sideOffset={20}
          align="center"
          className={cn(
            'yv:bg-card yv:text-popover-foreground',
            'yv:rounded-full yv:drop-shadow-[0px_4.8432px_20px_rgba(0,0,0,0.19)]',
            'yv:px-4 yv:py-2',
            'yv:flex yv:items-center yv:gap-3',
            'yv:z-50 yv:outline-hidden',
            'yv:overflow-visible yv:relative',
            'yv:origin-(--radix-popover-content-transform-origin)',
            'yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out',
            'yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0',
            'yv:data-[state=closed]:zoom-out-95 yv:data-[state=open]:zoom-in-95',
            'yv:data-[side=bottom]:slide-in-from-top-2',
          )}
          style={
            {
              '--tw-animate-duration': '180ms',
              '--tw-animate-easing': 'cubic-bezier(0.16, 1, 0.3, 1)',
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

          <div
            className="yv:flex yv:items-center yv:gap-2"
            role="group"
            aria-label="Highlight colors"
          >
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
            <ActionButton
              icon={<BoxStackIcon className="yv:size-5" />}
              label="Copy"
              onClick={onCopy}
            />
            <ActionButton
              icon={<BoxArrowUpIcon className="yv:size-5" />}
              label="Share"
              onClick={onShare}
            />
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
