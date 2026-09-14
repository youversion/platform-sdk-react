# YPE-5354: Client-only first paint and layout stability

## Decision

YPE-5354 accepts the existing client-only `ShadowRootHost` behavior without
reserved space or a permanent layout-shift harness. It does not claim that the
visible delay or layout shift is negligible. YPE-5356 decides per rollout
component whether the limitations are acceptable and whether reservation or
measurement is required.

## Findings

Layout shift and visible pop-in are different failures. A layout-shift score is
produced when late content moves other visible content; inserting an element
into unused space can score zero even though the element visibly appears later.
The [CLS guidance](https://web.dev/articles/cls) and
[Layout Instability specification](https://wicg.github.io/layout-instability/)
define that behavior.

`ShadowRootHost` emits an empty server host and renders its children after a
passive effect ([source](../packages/ui/src/lib/shadow-root-host.tsx)). React
effects run only on the client, and a non-interaction effect may run after the
browser paints. A slow client can therefore display an empty state before the
component appears. Changing to `useLayoutEffect` would not supply server
geometry or make JavaScript arrive sooner.
[React documents both effect timings](https://react.dev/reference/react/useEffect#caveats).

The Core Web Vitals CLS threshold of `0.1` applies to the complete page at the
75th percentile, split between mobile and desktop. It is not an allowance for
one SDK component. The SDK can test attributable movement in named layouts, but
consuming applications still own field CLS for the full page.

## Reservation feasibility

The built-in `default` and `short` auth buttons use the shared `lg` height of
`2.5rem`. The built-in `icon` button uses automatic height with `0.75rem`
padding around the shared button's `size-6` (`1.5rem`) logo. These are
variant-specific defaults, not universal geometry: the public `className` can
override them.
([auth button source](../packages/ui/src/components/YouVersionAuthButton.tsx),
[shared button source](../packages/ui/src/components/ui/button.tsx))

Width is less predictable. It varies with authentication state, locale, the
public `text` prop, and font metrics. The button does not wrap, so a fixed inline
reservation would either leave blank space or fail for supported inputs.
Reserving built-in block size could prevent vertical movement in a stacked
layout, but it would not prevent horizontal movement in a navigation row.

The server currently emits a normal empty `div`; the client changes it to
`display: contents` when the shadow root attaches. Any reservation must be
present in server markup and remain a box through the first client render.
Adding dimensions in the existing effect is too late. A reserved host would
revise the exact server-markup contract in ADR 0007 and would need its own
compatibility validation.

Official guidance recommends reserving space for late content. When exact size
is unknown, a likely-size placeholder can reduce movement but may leave blank
space or allow residual shift.
[web.dev documents this tradeoff](https://web.dev/articles/optimize-cls#reserve-space-for-late-loading-content).

## Evidence needed if layout stability becomes a rollout requirement

A focused browser proof should:

1. Serve real SSR output with the shadow host between stable witness elements.
2. Capture witness geometry and `layout-shift` entries before hydration starts.
3. Measure the empty-host interval separately, because CLS cannot detect pop-in.
4. Cover representative vertical and horizontal layouts for the selected
   component rather than claim a package-wide result.
5. Include an unreserved negative control that demonstrably moves a witness.

The component-level target should be zero attributable shift in those named
layouts, with a small geometry tolerance only for browser rounding. No web
standard defines a universal acceptable delay before one hydrated component
appears, so any timing limit must be a product-owned budget selected during
rollout. A zero CLS result alone does not close the visible-pop-in limitation.
