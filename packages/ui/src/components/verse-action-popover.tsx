import { useEffect, useMemo, useRef, useState, type FC } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { cn } from '../lib/utils';
import { BoxStackIcon } from './icons/box-stack';
import { BoxArrowUpIcon } from './icons/box-arrow-up';
import { CheckIcon } from './icons/check';

type Measurable = { getBoundingClientRect: () => DOMRect };

/**
 * Default highlight palette, as 6-digit lowercase hex (no `#`) so it maps 1:1
 * onto the API `highlight.color` field (/^[0-9a-f]{6}$/). Order is the canonical
 * apply order: yellow, green, blue, orange, pink. Hardcoded to match the
 * YouVersion iOS app exactly. Used as the fallback whenever the server's recent
 * colors are unavailable (highlights off, signed out, fetch pending or failed).
 */
export const HIGHLIGHT_COLORS = ['fffe00', '5dff79', '00d6ff', 'ffc66f', 'ff95ef'] as const;

/**
 * A highlight color: any 6-digit lowercase hex without `#`. Widened from the
 * five-literal palette union (YPE-1034 PR3) because the server's recent-colors
 * list can contain arbitrary hexes, not just the default palette. Loosening,
 * not breaking — every prior value is still assignable.
 */
export type HighlightColor = string;

/** 6-digit lowercase hex, no `#` — the on-wire / renderable color form. */
const HEX6_COLOR = /^[0-9a-f]{6}$/;

/**
 * Resolves the color row's palette. Given the server's recent colors (recently
 * used first, then defaults — already server-ordered), normalizes each entry
 * (lowercase, strip a leading `#`), drops anything that isn't a 6-digit hex, and
 * dedupes first-occurrence-wins WITHOUT reordering (server order is the truth).
 * Falls back to {@link HIGHLIGHT_COLORS} whenever recents are absent or nothing
 * survives normalization.
 */
function resolvePalette(recentColors: string[] | null | undefined): readonly string[] {
  if (!recentColors || recentColors.length === 0) return HIGHLIGHT_COLORS;
  const seen = new Set<string>();
  const palette: string[] = [];
  for (const raw of recentColors) {
    const color = raw.trim().toLowerCase().replace(/^#/, '');
    if (!HEX6_COLOR.test(color) || seen.has(color)) continue;
    seen.add(color);
    palette.push(color);
  }
  return palette.length > 0 ? palette : HIGHLIGHT_COLORS;
}

type VerseActionPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeHighlights: Set<string>;
  selectedVerses: number[];
  highlightedVerses: Record<number, string>;
  anchorElement?: HTMLElement | null;
  /**
   * The reader's scroll container. When provided, the bar docks to the edge of
   * this element that the anchored verse scrolls out through, so the actions stay
   * reachable instead of leaving with the verse. Omit for a purely anchored bar.
   */
  scrollRoot?: HTMLElement | null;
  /**
   * The server's recent highlight colors (recently used first, then defaults),
   * as hex strings. When present the color row renders these instead of the
   * hardcoded {@link HIGHLIGHT_COLORS} palette; `null`/`undefined`/empty falls
   * back to the palette. The list is normalized and deduped internally.
   */
  recentColors?: string[] | null;
  onHighlight: (color: string) => void;
  onClearHighlight: (color: string) => void;
  onCopy: () => void;
  onShare: () => void;
  theme?: 'light' | 'dark';
};

type ColorCircleProps = {
  color: string;
  showRemove: boolean;
  label: string;
  onClick: () => void;
};

function ColorCircle({ color, showRemove, label, onClick }: ColorCircleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'yv:size-8 yv:shrink-0 yv:rounded-full yv:flex yv:items-center yv:justify-center',
        'yv:transition-transform yv:hover:scale-110',
        'yv:focus-visible:outline-none yv:focus-visible:ring-2 yv:focus-visible:ring-ring yv:focus-visible:ring-offset-2',
      )}
      // Inner border matches the Figma "highlight stroke" (#121212 @ 20%), giving
      // pale swatches definition on the light popover.
      style={{
        backgroundColor: `#${color}`,
        border: '1px solid rgba(18, 18, 18, 0.2)',
      }}
      aria-label={label}
    >
      {/* Active/remove swatch: a 24px checkmark in the Text/Everdark color
          (always dark, regardless of theme) on the solid color circle. Matches
          iOS (platform-sdk-swift #179), which swapped the earlier X for a check.
          Tapping it still removes the highlight — icon-only change. */}
      {showRemove && <CheckIcon className="yv:size-6 yv:text-(--yv-gray-50)" />}
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
  scrollRoot,
  recentColors,
  onHighlight,
  onClearHighlight,
  onCopy,
  onShare,
  theme = 'light',
}) => {
  const { t } = useTranslation(undefined, { i18n });

  // When the anchored verse scrolls out of the container, dock the bar to the
  // edge it exited through: scroll down (verse leaves the top) → dock top; scroll
  // up (verse leaves the bottom) → dock bottom. `null` = anchored (verse visible,
  // or docking disabled). The bar always passes through the visible/anchored state
  // when reversing direction, so it never jumps directly top↔bottom.
  const [dockEdge, setDockEdge] = useState<'top' | 'bottom' | null>(null);
  useEffect(() => {
    // Closing: leave dockEdge as-is so the frozen snapshot (below) animates out
    // in place. The prior effect's cleanup already disconnected the observer.
    if (!open) return;
    if (!anchorElement || !scrollRoot || typeof IntersectionObserver === 'undefined') {
      setDockEdge(null);
      return;
    }
    // The just-tapped verse is on screen, so start anchored and let the observer
    // flip us to docked only after the user scrolls it away.
    setDockEdge(null);
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) {
          setDockEdge(null);
          return;
        }
        // Off-screen: figure out which edge it exited through. rootBounds is
        // populated because we pass an explicit root.
        const rootTop = entry.rootBounds?.top ?? scrollRoot.getBoundingClientRect().top;
        setDockEdge(entry.boundingClientRect.bottom <= rootTop ? 'top' : 'bottom');
      },
      { root: scrollRoot, threshold: 0 },
    );
    observer.observe(anchorElement);
    return () => observer.disconnect();
  }, [open, anchorElement, scrollRoot]);

  const anchorRef = useMemo(
    () => (anchorElement ? { current: anchorElement as Measurable } : undefined),
    [anchorElement],
  );

  // A virtual anchor pinned to the top- or bottom-center of the scroll container,
  // in viewport coordinates. Read live so it stays put as the reader scrolls.
  const dockedRef = useMemo(() => {
    if (!scrollRoot || !dockEdge) return undefined;
    return {
      current: {
        getBoundingClientRect: () => {
          const r = scrollRoot.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const y = dockEdge === 'top' ? r.top : r.bottom;
          return {
            x: cx,
            y,
            left: cx,
            right: cx,
            top: y,
            bottom: y,
            width: 0,
            height: 0,
            toJSON: () => ({}),
          } as DOMRect;
        },
      },
    };
  }, [scrollRoot, dockEdge]);

  const docked = Boolean(dockedRef);
  const virtualRef = docked ? dockedRef : anchorRef;
  // Top-edge anchor → render below it (side bottom); bottom-edge anchor → render
  // above it (side top). Both place the bar just inside the reader edge.
  const dockedSide = dockEdge === 'top' ? 'bottom' : 'top';

  // The color row renders the server's recent colors when available, else the
  // default palette. Both are treated identically below — server order is the
  // only ordering, never re-sorted here.
  const palette = resolvePalette(recentColors);

  // Remove (checkmark) circles: every distinct active color, ordered by palette
  // position, with any active color NOT in the palette (a hex the user applied
  // earlier that has since dropped off recents) kept after in selection order —
  // so a highlight is always removable even once its color leaves the palette.
  const activeColors = [
    ...palette.filter((c) => activeHighlights.has(c)),
    ...[...activeHighlights].filter((c) => !palette.includes(c)),
  ];
  const highlightedVerseCount = selectedVerses.filter((v) => highlightedVerses[v]).length;
  const unHighlightedCount = selectedVerses.length - highlightedVerseCount;
  const allColorsActive = palette.every((c) => activeHighlights.has(c));
  const showAllApplyColors =
    !allColorsActive && (unHighlightedCount > 0 || activeHighlights.size > 1);
  const colorsToApply = showAllApplyColors
    ? palette
    : palette.filter((c) => !activeHighlights.has(c));

  // Remove (checkmark) circles come first, then apply circles in palette order.
  const colorCircles = [
    ...activeColors.map((color) => ({ color, showRemove: true, key: `${color}-clear` })),
    ...colorsToApply.map((color) => ({ color, showRemove: false, key: `${color}-apply` })),
  ];

  // Snapshot of everything the Content renders. While open we keep it fresh; the
  // moment `open` flips false (apply / outside-click) the parent clears the
  // selection and anchor synchronously, so without this the still-animating bar
  // would lose its anchor (jump to a fallback position) and flash the empty
  // layout. Freezing the last snapshot lets it simply fade out where it was.
  const dockSide: 'top' | 'bottom' = docked ? dockedSide : 'bottom';
  const live = {
    virtualRef,
    side: dockSide,
    sideOffset: docked ? 24 : 20,
    showCaret: !docked,
    colorCircles,
  };
  const frozenView = useRef(live);
  if (open) frozenView.current = live;
  const view = open ? live : frozenView.current;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Anchor virtualRef={view.virtualRef} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          role="dialog"
          aria-label={t('verseActionsAriaLabel')}
          data-yv-sdk
          data-yv-theme={theme}
          onInteractOutside={(event) => {
            // Tapping another verse modifies the selection — it should re-anchor
            // the popover, not dismiss it. Only a tap truly outside the reader
            // dismisses (which clears the selection via onOpenChange).
            const target = event.detail.originalEvent.target as HTMLElement | null;
            if (target?.closest('.yv-v[v]')) {
              event.preventDefault();
            }
          }}
          side={view.side}
          sideOffset={view.sideOffset}
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
            'yv:data-[side=top]:slide-in-from-bottom-2',
          )}
          style={
            {
              '--tw-animate-duration': '180ms',
              '--tw-animate-easing': 'cubic-bezier(0.16, 1, 0.3, 1)',
            } as React.CSSProperties
          }
        >
          {/* Caret — matches the card background in both themes, pointing at the
              verse. Hidden when docked: the bar is no longer tied to a verse. */}
          {view.showCaret && (
            <svg
              className="yv:text-card yv:absolute yv:-top-[16px] yv:left-1/2 yv:-translate-x-1/2"
              width="33"
              height="17"
              viewBox="0 0 33 17"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M16.0215 0L32.0429 16.5H0L16.0215 0Z" fill="currentColor" />
            </svg>
          )}

          <div
            // Recent colors can be a long list — let the row scroll horizontally
            // (capped to the viewport) instead of stretching the pill off-screen.
            // `overflow-x: auto` forces `overflow-y` out of `visible` too (CSS
            // spec), which would clip the swatches' focus ring (ring-2 +
            // offset-2 ≈ 4px outside the 32px circle) and hover scale-110
            // overpaint. The 6px padding gives that overpaint room inside the
            // scroll box; the matching negative margin cancels it back out of
            // the pill's layout so visual spacing is unchanged.
            className="yv:flex yv:items-center yv:gap-2 yv:max-w-[70vw] yv:overflow-x-auto yv:p-1.5 yv:-m-1.5"
            role="group"
            aria-label={t('highlightColorsAriaLabel')}
          >
            {view.colorCircles.map(({ color, showRemove, key }) => (
              <ColorCircle
                key={key}
                color={color}
                showRemove={showRemove}
                label={showRemove ? t('clearHighlightAriaLabel') : t('applyHighlightAriaLabel')}
                onClick={() => (showRemove ? onClearHighlight(color) : onHighlight(color))}
              />
            ))}
          </div>

          {/* Separator */}
          <div className="yv:w-px yv:h-8 yv:bg-border" aria-hidden="true" />

          <div className="yv:flex yv:items-center yv:gap-1">
            <ActionButton
              icon={<BoxStackIcon className="yv:size-5" />}
              label={t('copy')}
              onClick={onCopy}
            />
            <ActionButton
              icon={<BoxArrowUpIcon className="yv:size-5" />}
              label={t('share')}
              onClick={onShare}
            />
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
