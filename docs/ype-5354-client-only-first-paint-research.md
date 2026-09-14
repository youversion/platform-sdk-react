# YPE-5354: Client-only first-paint and layout stability research

## Question

For the accepted client-only `ShadowRootHost` strategy, should the SDK reserve
space before hydration, or should it prove that the delayed content has
negligible layout shift?

## If layout stability becomes a rollout requirement

The smallest robust layout-stability design would do both, because reservation
and measurement test different user-visible failures:

1. Reserve the stable block size of `YouVersionAuthButton` in the server HTML.
2. Use a real Chromium page to require zero layout shift attributable to the
   button in representative layouts.
3. Measure the empty-host interval separately. Cumulative Layout Shift (CLS)
   cannot prove that the button does not visibly pop in.

Do not use the Core Web Vitals page-level threshold of `0.1` as a component
allowance. The official threshold applies to the complete page at the 75th
percentile, split between mobile and desktop. A component can consume part of
that budget only by taking it away from the rest of the page. The focused SDK
regression target should therefore be zero attributable shift, with a direct
geometry tolerance for browser rounding. [The official CLS guidance defines
the page-level thresholds and measurement population.](https://web.dev/articles/cls)

The SDK cannot promise zero CLS for every consuming-app layout. CLS depends on
which other visible elements move, the viewport, and where the component is
placed. The executable proof can establish the SDK contract for named layouts
and can prevent regressions; consuming apps still own their complete page's
field CLS.

## YPE-5354 MVP decision

YPE-5354 accepts the existing client-only runtime without adding reserved space
or a permanent CLS harness. It does not claim that the current layout shift or
visible delay is negligible. The executable proof for this spike covers the
selected server-markup and hydration contract; the observations below define
what a later layout-stability implementation would need to prove.

YPE-5356 owns deciding whether a rollout component needs the reservation and
browser measurement described here. This keeps layout policy component-specific:
the auth button's geometry cannot establish a package-wide Shadow DOM contract.

## Why CLS alone is insufficient

A layout shift occurs when an element that was visible in one frame changes its
start position in a later frame. Its score combines the affected viewport area
with the movement distance. Inserting a new element is not itself a scored
shift; it produces a score when the insertion moves other visible content.
[The CLS definition and calculation are documented by web.dev](https://web.dev/articles/cls),
and [the Layout Instability specification defines the unstable-node and
exclusion rules](https://wicg.github.io/layout-instability/).

This creates two different outcomes:

- An auth button can pop into unused space and produce CLS `0`.
- The same button can move a nearby navigation item and produce a non-zero
  score.

The current implementation makes the first outcome possible. `ShadowRootHost`
returns an empty light-DOM host on the server, then attaches the shadow root and
renders its children after a passive effect
([source](../packages/ui/src/lib/shadow-root-host.tsx)). React states that
effects run only on the client and that a non-interaction effect generally lets
the browser paint first. React also warns that client-only replacement can stay
visible for many seconds on slow connections and should not make a jarring
visual change. [React `useEffect` reference](https://react.dev/reference/react/useEffect)

Changing this effect to `useLayoutEffect` is not a complete fix. A layout effect
can block a repaint after hydration starts, but it still does not run during
server rendering, download the JavaScript sooner, or give the empty server host
dimensions. [React `useLayoutEffect` reference](https://react.dev/reference/react/useLayoutEffect)

## Geometry that can and cannot be predicted

The built-in labeled button has a stable authored block size: both `default`
and `short` render the shared Button's `lg` size, whose CSS height is `2.5rem`.
The `short` option changes the label, not the height
([auth button source](../packages/ui/src/components/YouVersionAuthButton.tsx),
[shared button source](../packages/ui/src/components/ui/button.tsx)). That value
continues to scale with the consuming document's root font size, an accepted
property of the prototype
([ADR 0007](adr/0007-prototype-shadow-dom-style-isolation.md)).

The complete box is not one fixed rectangle:

- `icon` uses automatic height with `0.75rem` padding around a `1.5em` logo.
- Labeled widths depend on sign-in versus sign-out mode and on locale. The
  shipped translations differ substantially in length.
- The public `text` prop makes label width integrator-controlled.
- Font loading can change text width.
- The button uses `white-space: nowrap`, so narrow layouts overflow rather than
  create a predictable second line.

Therefore, a single fixed inline size would either leave visible blank space or
fail for some supported inputs. Reserving only block size prevents vertical
movement in stacked layouts but does not prevent horizontal movement in a
navigation row. An exact reservation must be variant-aware and must account for
the final text and font metrics.

The current host also changes from an empty normal `div` to `display: contents`
inside the same effect that attaches the root
([source](../packages/ui/src/lib/shadow-root-host.tsx)). Any production
reservation must be present in the server output and remain a box through the
first client render. Adding dimensions in the existing effect is too late. A
permanent sized host is also a consumer-facing layout change and must be checked
against the Shadow DOM hostile-CSS contract before implementation.

Official CLS guidance recommends reserving space for late content. When the
exact size is not known, `min-height` or a likely-size placeholder reduces
movement but can leave blank space or allow residual shift.
[web.dev guidance for injected content](https://web.dev/articles/optimize-cls)

## Proposed executable proof

Add a focused browser test if a rollout component requires a layout-stability
guarantee. The Layout Instability API is a browser measurement, and this
repository's Storybook automation is currently Chromium-only, so the initial
automated metric should be explicitly Chromium-only
([Vitest configuration](../packages/ui/vitest.config.ts)).

Use a small production-mode SSR fixture with these properties:

1. Render the page to HTML with an auth button host between stable witness
   elements. Serve that HTML before the hydration module runs.
2. Install a `PerformanceObserver` with Playwright `addInitScript`, which runs
   after the document is created but before page scripts. Observe
   `layout-shift` with `buffered: true`, ignore entries where `hadRecentInput`
   is true, and retain `value` and `sources`.
   [Playwright `addInitScript`](https://playwright.dev/docs/api/class-browsercontext#browser-context-add-init-script)
   and [web.dev's layout-shift debugging guidance](https://web.dev/articles/debug-layout-shifts)
   describe these mechanisms.
3. Force one paint of the server HTML, then start hydration. Record the witness
   rectangles before hydration and after the internal button appears.
4. Record `performance.now()` when hydration begins and on the first
   `requestAnimationFrame` in which the internal button has a non-empty
   rectangle. This is the empty-host interval. Report it separately from CLS.
5. Run at desktop and mobile viewports in both a vertical flow and a horizontal
   navigation row. Cover `default`, `short`, and `icon`; sign-in and sign-out;
   English and the widest shipped localized result found by measurement; a
   custom label; root font sizes `16px` and `20px`; and the font-ready and
   font-delayed paths.
6. Run one deliberately unreserved control case that must move a witness and
   produce a layout-shift entry. This proves that the instrumentation can fail
   for the defect it claims to detect.

### Acceptance criteria

- Server output contains the documented placeholder geometry, but no auth
  button content. This preserves the accepted client-only strategy.
- No existing witness moves by more than `1` CSS pixel on either axis between
  the server frame and the stable hydrated frame.
- The sum of layout-shift entries whose `sources` include a fixture witness is
  exactly `0`. The `1px` rectangle tolerance is only for geometry rounding; it
  is not permission for a positive CLS entry.
- The negative control records a positive entry and visible witness movement.
- The test reports the empty-host interval. It does not initially fail on a
  universal millisecond limit because no web standard defines a threshold from
  first contentful paint to one component's appearance. After collecting
  production or throttled-fixture data, YPE-5356 can select an explicit product
  budget.
- The complete consuming page must still meet CLS `<= 0.1` at the 75th
  percentile for both mobile and desktop in field data; this is an app-level
  release gate, not an SDK component-test assertion.

`PerformanceObserver` must use `buffered: true`; entries can occur before the
observer callback is registered, and ordinary performance-entry lookup is not
the measurement path for layout shifts. Sources should be retained for
diagnosis, but source attribution is limited to a small set of the most affected
nodes. [web.dev's debugging guidance explains `value`, `sources`, and
`hadRecentInput`.](https://web.dev/articles/debug-layout-shifts)

## Decision input for YPE-5354

Accept client-only rendering, but do not describe the present empty host as
negligible without browser evidence. The smallest defensible production
follow-up is a component-specific reservation for the stable block dimension,
plus the browser proof above. Exact inline-size reservation needs either a
server-visible text measurement contract or a bounded placeholder design; the
current public props and locales do not supply one universal width.

Treat the visible pop-in as an explicit accepted limitation until the measured
empty-host interval has a product-owned budget. A zero CLS result alone does not
close that limitation.
