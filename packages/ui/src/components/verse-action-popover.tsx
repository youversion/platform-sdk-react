import { useEffect, useMemo, useRef, useState, type CSSProperties, type FC } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { cn } from '../lib/utils';
import { BoxStackIcon } from './icons/box-stack';
import { Share } from './icons/share';
import { CheckIcon } from './icons/check';
import { buildVerseActionSwatches, highlightFillHex } from '@/lib/highlight-colors';
import { isDarkHighlightHex } from './verse';

/** Re-export for back-compat; prefer `@/lib/highlight-colors` for new code. */
export { HIGHLIGHT_COLORS, type HighlightColor } from '@/lib/highlight-colors';

type PopoverMotionStyle = CSSProperties & {
  '--tw-animate-duration'?: string;
  '--tw-animate-easing'?: string;
};

const popoverMotionStyle: PopoverMotionStyle = {};
popoverMotionStyle['--tw-animate-duration'] = '180ms';
popoverMotionStyle['--tw-animate-easing'] = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** Width, in px, of the fade applied at each overflowing edge of the swatch row. */
const SCROLL_FADE_PX = 20;

type ScrollMetrics = { scrollLeft: number; scrollWidth: number; clientWidth: number };
type ScrollFade = { start: boolean; end: boolean };

/**
 * Decide which edges of a horizontally scrollable row should fade. A fade only
 * appears on an edge that has hidden content in that direction, so a row that
 * fits (or is scrolled fully to one end) shows no fade on the exhausted side.
 * Pure so it can be unit-tested without layout (jsdom reports zero sizes).
 * Assumes LTR positive `scrollLeft`.
 */
export function computeScrollFade({
  scrollLeft,
  scrollWidth,
  clientWidth,
}: ScrollMetrics): ScrollFade {
  const maxScroll = scrollWidth - clientWidth;
  // Sub-pixel slack: rounding in real browsers can leave scrollLeft a hair off
  // its bound, which would otherwise flicker a fade at a fully-scrolled edge.
  const slack = 1;
  if (maxScroll <= slack) return { start: false, end: false };
  return {
    start: scrollLeft > slack,
    end: scrollLeft < maxScroll - slack,
  };
}

/**
 * Build the `mask-image` that fades the overflowing edge(s). Returns `undefined`
 * when neither edge fades so the element carries no mask at all (nothing to hint).
 */
function scrollFadeMask({ start, end }: ScrollFade): React.CSSProperties | undefined {
  if (!start && !end) return undefined;
  const left = start ? 'transparent' : '#000';
  const right = end ? 'transparent' : '#000';
  const mask = `linear-gradient(to right, ${left} 0, #000 ${SCROLL_FADE_PX}px, #000 calc(100% - ${SCROLL_FADE_PX}px), ${right} 100%)`;
  return { maskImage: mask, WebkitMaskImage: mask };
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
   * Whether the highlights UI is available. When `false` (the `HIGHLIGHTS_LIVE`
   * dark-launch flag is off) the color row and the remove (checkmark) circles are
   * hidden entirely — only Copy / Share remain. Defaults to `true`.
   */
  highlightsEnabled?: boolean;
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
  theme: 'light' | 'dark';
};

function ColorCircle({ color, showRemove, label, onClick, theme }: ColorCircleProps) {
  const isDark = theme === 'dark';
  // Dots sit on `yv:bg-card` (`--yv-gray-2` `#fcfafa` / `--yv-gray-45` `#232121`),
  // not `--yv-background`. Same `p` as the reader; different surfaceBg.
  const cardSurfaceBg = isDark ? '232121' : 'fcfafa';
  const backgroundColor = `#${highlightFillHex(color, theme, cardSurfaceBg)}`;
  // Inner border matches the Figma "highlight stroke" (#121212 @ 20%), giving
  // pale swatches definition on the light popover. On the dark popover a dark
  // stroke would vanish against the dimmed fill, so flip it to a light stroke.
  const border = isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(18, 18, 18, 0.2)';
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
    >
      {/* Active/remove swatch: a 24px checkmark on the solid color circle. Matches
          iOS (platform-sdk-swift #179), which swapped the earlier X for a check.
          Light mode uses Text/Everdark; dark mode dims the fill, so the check goes
          white to stay legible. Tapping it still removes the highlight. */}
      {showRemove && (
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
  highlightsEnabled = true,
  onHighlight,
  onClearHighlight,
  onCopy,
  onShare,
  theme = 'light',
}) => {
  const { t } = useTranslation(undefined, { i18n });

  // On open, Radix's FocusScope would autofocus the first swatch. Because the bar
  // opens from a mouse/tap on non-focusable verse text, Chromium treats that
  // delayed programmatic focus as keyboard-like and paints a `:focus-visible`
  // ring on the swatch — a stray ring the user never asked for. Redirect the
  // initial focus to the content container instead (see `onOpenAutoFocus`): focus
  // still enters the popover (Escape closes; screen readers announce the dialog),
  // but the ring only appears once the user actually Tabs to a swatch.
  const contentRef = useRef<HTMLDivElement>(null);

  // The swatch row is capped to the viewport width (see the Content max-width
  // below) and scrolls horizontally when it overflows. Track which edges have
  // hidden content so we can fade only those edges, hinting there's more to
  // scroll toward. Recomputed on scroll and on resize/content changes.
  //
  // The node is held in state (set via a callback ref) rather than a plain ref
  // so the measuring effect is keyed on the element's actual mount/unmount.
  // Radix's Portal/Presence commits the Content DOM in a deferred pass, so on
  // the `open` flip the element isn't attached yet — an effect keyed on `open`
  // alone would run against a null ref and never re-run to wire up the listener.
  const [swatchRow, setSwatchRow] = useState<HTMLDivElement | null>(null);
  const [scrollFade, setScrollFade] = useState<ScrollFade>({ start: false, end: false });

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
    if (!anchorElement || !scrollRoot || !('IntersectionObserver' in globalThis)) {
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
    () => (anchorElement ? { current: anchorElement } : undefined),
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
          return new DOMRect(cx, y, 0, 0);
        },
      },
    };
  }, [scrollRoot, dockEdge]);

  const docked = Boolean(dockedRef);
  const virtualRef = docked ? dockedRef : anchorRef;
  // Top-edge anchor → render below it (side bottom); bottom-edge anchor → render
  // above it (side top). Both place the bar just inside the reader edge.
  const dockedSide = dockEdge === 'top' ? 'bottom' : 'top';

  const colorCircles = buildVerseActionSwatches({
    activeHighlights,
    selectedVerses,
    highlightedVerses,
  });

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

  // Measure the swatch row's overflow and keep the fade in sync. Keyed on the
  // state-held node so it (re)attaches the listener the moment Radix commits the
  // row into the DOM, and on the swatch count so a content-width change re-measures.
  const swatchCount = view.colorCircles.length;
  useEffect(() => {
    const el = swatchRow;
    if (!el) {
      setScrollFade({ start: false, end: false });
      return;
    }
    const update = () =>
      setScrollFade(
        computeScrollFade({
          scrollLeft: el.scrollLeft,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        }),
      );
    update();
    el.addEventListener('scroll', update, { passive: true });
    let observer: ResizeObserver | undefined;
    if ('ResizeObserver' in globalThis) {
      observer = new ResizeObserver(update);
      observer.observe(el);
    }
    return () => {
      el.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [swatchRow, swatchCount]);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Anchor virtualRef={view.virtualRef} />
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={contentRef}
          role="dialog"
          aria-label={t('verseActionsAriaLabel')}
          tabIndex={-1}
          data-yv-sdk
          data-yv-theme={theme}
          onOpenAutoFocus={(event) => {
            // Keep focus contained in the popover but off the first swatch: land
            // it on the (non-tabbable) content element so no `:focus-visible` ring
            // shows on pointer-open. The first Tab still moves to the first swatch,
            // and because Tab is keyboard modality the ring correctly appears then.
            event.preventDefault();
            contentRef.current?.focus({ preventScroll: true });
          }}
          onInteractOutside={(event) => {
            // Tapping another verse modifies the selection — it should re-anchor
            // the popover, not dismiss it. Only a tap truly outside the reader
            // dismisses (which clears the selection via onOpenChange).
            const target = event.detail.originalEvent.target;
            if (target instanceof Element && target.closest('.yv-v[v]')) {
              event.preventDefault();
            }
          }}
          side={view.side}
          sideOffset={view.sideOffset}
          align="center"
          // Keep the pill off the screen edges; this also shrinks Radix's
          // `--radix-popover-content-available-width`, which we cap to below.
          collisionPadding={12}
          className={cn(
            'yv:bg-card yv:text-popover-foreground',
            'yv:rounded-full yv:drop-shadow-[0px_4.8432px_20px_rgba(0,0,0,0.19)]',
            'yv:px-4 yv:py-2',
            'yv:flex yv:items-center yv:gap-3',
            // Never wider than the viewport (minus collision padding). When the
            // swatch row can't fit, it scrolls inside instead of overflowing the
            // screen. Radix sets `--radix-popover-content-available-width`, but
            // only recomputes it on reposition — it goes stale on a plain window
            // resize. `min()` with a live `100vw` term keeps the cap honest when
            // the viewport shrinks under an open popover (24px = 2×collisionPadding).
            'yv:max-w-[min(var(--radix-popover-content-available-width),calc(100vw-24px))]',
            'yv:z-50 yv:outline-hidden',
            'yv:overflow-visible yv:relative',
            'yv:origin-(--radix-popover-content-transform-origin)',
            'yv:data-[state=open]:animate-in yv:data-[state=closed]:animate-out',
            'yv:data-[state=closed]:fade-out-0 yv:data-[state=open]:fade-in-0',
            'yv:data-[state=closed]:zoom-out-95 yv:data-[state=open]:zoom-in-95',
            'yv:data-[side=bottom]:slide-in-from-top-2',
            'yv:data-[side=top]:slide-in-from-bottom-2',
          )}
          style={popoverMotionStyle}
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

          {/* Highlights UI is hidden entirely when the feature is off (flag off):
              only Copy / Share remain. */}
          {highlightsEnabled && (
            <>
              <div
                ref={setSwatchRow}
                // `min-w-0` lets this flex child actually shrink below its
                // content size so `overflow-x-auto` engages instead of widening
                // the pill. `py-1 -my-1` gives the hover:scale-110 swatches
                // vertical breathing room inside the (now-clipping) scroll box
                // without shifting the row's resting position. Scrollbar hidden;
                // the edge fade signals there's more to scroll.
                className="yv:flex yv:items-center yv:gap-2 yv:min-w-0 yv:overflow-x-auto yv:scrollbar-hide yv:py-1 yv:-my-1"
                style={scrollFadeMask(scrollFade)}
                role="group"
                aria-label={t('highlightColorsAriaLabel')}
              >
                {view.colorCircles.map(({ color, showRemove, key }) => (
                  <ColorCircle
                    key={key}
                    color={color}
                    showRemove={showRemove}
                    theme={theme}
                    label={showRemove ? t('clearHighlightAriaLabel') : t('applyHighlightAriaLabel')}
                    onClick={() => (showRemove ? onClearHighlight(color) : onHighlight(color))}
                  />
                ))}
              </div>

              {/* Separator — never shrinks, so only the swatch row scrolls. */}
              <div className="yv:w-px yv:h-8 yv:shrink-0 yv:bg-border" aria-hidden="true" />
            </>
          )}

          {/* Copy / Share stay pinned and fully visible; only the swatch row
              scrolls when space is tight. */}
          <div className="yv:flex yv:items-center yv:gap-1 yv:shrink-0">
            <ActionButton
              icon={<BoxStackIcon className="yv:size-5" />}
              label={t('copy')}
              onClick={onCopy}
            />
            <ActionButton
              icon={<Share className="yv:size-5" />}
              label={t('share')}
              onClick={onShare}
            />
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};
