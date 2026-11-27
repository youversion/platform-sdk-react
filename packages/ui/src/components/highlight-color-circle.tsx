import { cn } from '@/lib/utils';
import type { ReactElement } from 'react';
import { highlightFillColorMix } from '@/lib/highlight-colors';
import { CheckIcon } from './icons/check';
import { isDarkHighlightHex } from './verse';

type HighlightColorCircleProps = {
  color: string;
  selected: boolean;
  toggle?: boolean;
  label: string;
  onClick: () => void;
  theme: 'light' | 'dark';
};

export function HighlightColorCircle({
  color,
  selected,
  toggle = false,
  label,
  onClick,
  theme,
}: HighlightColorCircleProps): ReactElement {
  const isDark = theme === 'dark';
  const backgroundColor = highlightFillColorMix(color, 'card') ?? undefined;
  // Keep the swatch outline when the standalone popover shares the host document.
  const border = '1px solid color-mix(in oklab, var(--yv-card-foreground) 20%, transparent)';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'yv:size-8 yv:shrink-0 yv:rounded-full yv:flex yv:items-center yv:justify-center',
        'yv:transition-transform yv:hover:scale-110',
        'yv:focus-visible:outline-none yv:focus-visible:ring-2 yv:focus-visible:ring-ring yv:focus-visible:ring-offset-2',
      )}
      style={{ backgroundColor, border }}
      aria-label={label}
      aria-pressed={toggle ? selected : undefined}
    >
      {selected && (
        <CheckIcon
          className={cn(
            'yv:size-6',
            isDark || isDarkHighlightHex(color) ? 'yv:text-white' : 'yv:text-(--yv-gray-50)',
          )}
        />
      )}
    </button>
  );
}
