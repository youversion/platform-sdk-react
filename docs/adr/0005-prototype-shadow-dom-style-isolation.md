# ADR 0005: Prototype automatic Shadow DOM style isolation

Status: Proposed proof of concept

## Problem

Host applications can apply unlayered global rules such as `button { ... }` or
Tailwind v3 preflight to SDK markup. Unlayered author CSS outranks the SDK's
layered CSS, so selector specificity alone cannot guarantee isolation.

Resets, stronger selectors, `!important`, cascade layers, and `@scope` all
continue participating in the host document's cascade. They can reduce
accidental conflicts but cannot prevent an outside selector from matching SDK
internals. Shadow DOM was selected because it creates a browser-enforced
selector boundary.

## Prototype

`YouVersionAuthButton` automatically creates an open shadow root and renders its
existing implementation inside it through a React portal. The SDK's compiled
Tailwind CSS—generated from `src/styles/global.css` and embedded as
`__YV_STYLES__`—is installed inside that root. Consumers continue to write
`<YouVersionAuthButton />`; isolation is not an option they must discover or
enable.

This PR intentionally applies the architecture to one representative component.
It asks whether automatic Shadow DOM boundaries are the right foundation before
the same pattern is rolled out across the UI package.

The constructable stylesheet is cached per owner `Document`, because a sheet
created in the top-level document cannot be adopted by a shadow root rendered in
a same-origin iframe. Browsers without constructable stylesheets receive a
`<style>` element in the root. The light-DOM host gets an inline-important box
reset; an inner, unreachable wrapper resets inherited standard properties.
The shadow stylesheet also suppresses `::before` and `::after` on the
light-DOM host with shadow-context important declarations, preventing host-page
CSS from injecting generated content around the isolated component.
Because that reset removes the light-DOM font inheritance the button previously
relied on, the implementation now applies its intended `font-sans` utility
explicitly.

The Vite example includes a Hostile CSS page with a light-DOM positive control
beside the isolated SDK button. It demonstrates type selectors, inherited
properties, universal `!important` rules, direct shadow-host attacks, and a known
document-wide `@font-face` limitation.

## What this proves

- Ordinary and `!important` host selectors cannot select the button internals.
- Isolation is automatic without changing the component's React props API.
- Existing click behavior continues to work through the React portal.
- Strict Mode does not attach the root twice.
- Constructed stylesheets are created per owner document, so mounting the shadow
  host in a same-origin iframe does not cause a cross-document adoption error.

Focused Chromium stories verify hostile button rules, host-generated
pseudo-content, existing interactions, and mounting in a same-origin iframe.
Unit tests verify Strict Mode behavior, the inline-important host reset, and
lazy local portal creation, including cleanup without native Popover selectors.
The remaining hostile vectors are available for manual inspection on the demo
page.

## Complex-component top-layer spike

`BibleVersionPicker` preserves two floating-content arrangements as executable
stories. An ordinary portal container inside the component shadow root
preserves IDREF relationships but is visibly clipped by an `overflow: hidden`,
transformed ancestor. The selected native top-layer arrangement preserves the
same tree scope while escaping that clipping.

An earlier discarded experiment moved floating content to a shared shadow
overlay under `document.body`. It escaped clipping but placed the trigger and
panel in separate tree scopes: their `aria-controls` and content ID strings
matched while Chromium's `ariaControlsElements` could not resolve the panel.
That experiment informed the decision but is not retained as a supported
arrangement in this slice.

The selected spike keeps the Radix portal in the component shadow root and puts
its local container in the native top layer with `popover="manual"`. Focused
Chromium stories show that this arrangement escapes ancestor clipping, remains
hit-testable, preserves viewport collision handling and hostile-CSS isolation,
and resolves `ariaControlsElements` within the component tree. Radix continues
to own positioning, focus, Escape, outside-click dismissal, and animations.
The `local-top-layer` strategy deliberately requires the native Popover API; it
does not silently fall back to the inline arrangement because that would restore
the clipping this strategy exists to escape.

Local portal containers are lazy: an isolated leaf creates none until its first
popover requests one. Each Popover instance registers with the local controller
before opening. The controller keeps the native container open through Radix's
exit animation and hides it only after no instance is active and portal content
has unmounted. The removal observer reads the current active-instance set and
container contents directly, so an immediate reopen prevents a stale close from
hiding the newly opened panel.

The negative-control story proves the clipping premise directly: the inline
panel's layout rectangle extends beyond the constrained ancestor, but
hit-testing beyond the ancestor cannot reach it. The equivalent top-layer panel
is reachable at the same point.

## Dialog top-layer validation

The shared Radix `Dialog` uses the same lazy, shadow-local top-layer container
when rendered inside an opted-in `ShadowRootHost`. Its overlay and content stay
in the dialog's shadow tree, so their title and description ID relationships
remain resolvable while the backdrop escapes ancestor clipping.

Modal behavior requires coordination beyond portal placement. Radix keeps its
overlay and content mounted independently through exit animations, so the
ordinary shadow content wrapper becomes inert from actual modal DOM presence,
not merely from the Dialog's `open` state. The wrapper remains inert until both
nodes have unmounted, while Radix continues to suppress interaction with the
outer document.

Radix's document-level focus tracking sees the shadow host instead of the real
focused descendant. The isolated Dialog therefore uses `focusin` with
`composedPath()` to redirect programmatic focus escapes. While the modal content
is mounted inside a shadow root, the shadow-specific focus hook also owns Tab and
Shift+Tab traversal: it uses `tabbable` to calculate browser-like candidate
ordering, including radio-group and `tabindex` rules, and wraps traversal within
the content. Radix continues to own the dialog lifecycle and dismissal behavior.
A `popover="manual"` top-layer container does not provide the focus containment
of a native modal dialog. During an overlay-only exit interval, focus is held on
the overlay instead of escaping to background content. Focus restoration
captures the real opener from the owning shadow root when present, falls back to
the document for an external opener, and waits until both modal nodes have
unmounted before restoring either opener.

The focused Chromium story verifies shadow-root containment, Chromium's resolved
title and description element relationships, initial focus, forward and reverse
Tab cycling across ordinary buttons, a radio group, and a negative-tabindex
control, programmatic-focus redirection, background inertness while open and
through staggered content and overlay exit animations, full-viewport backdrop
coverage and hit testing, Escape and backdrop-click dismissal, and restoration
after the exit animation unmounts.

Concurrent independent overlays in one shadow root remain deliberately
unsupported. Nested dialogs and overlays launched from an open dialog are also
unsupported: the prototype defines no stacking, focus-ownership, or dismissal
contract for them, and consumers must not rely on incidental Radix behavior.
Production rollout needs an explicit ownership model for nested or competing
modal and non-modal overlays. Radix's development-only title and description
checks also query the document and emit warnings for valid relationships inside
a shadow root; this is known console noise, not evidence that the IDs are
missing.

## Compatibility impact

Although the React props API is unchanged, the rendered DOM structure is not.
Consumers that query or style internal light-DOM markup must instead account for
the shadow root. Because the prototype attaches the shadow root in `useEffect`,
server output contains an empty host. The button appears after hydration, and
its forwarded ref becomes available later than it did previously. This is
therefore represented as a breaking change rather than an implementation
detail.

## Deliberately deferred

- Rollout to all exported components.
- Support and coordination for nested or competing modal and non-modal overlays.
- Form association when controls live outside their form's tree scope.
- SSR/hydration and the first client paint.
- A package-wide custom-property audit. `all: initial` does not reset custom
  properties; the larger investigation branch tested redeclaring Tailwind v4's
  generated theme tokens on the protected internal wrapper. The audit must also
  classify existing bare custom-property references, including
  `BibleVersionPicker`'s `var(--spacing)` width calculation, rather than fixing
  individual symptoms in this spike.
- A deliberate inheritance policy for writing direction and future custom
  properties. Some host values may be intentional localization inputs, while
  SDK-owned visual tokens need shadow-local defaults.
- Host `@font-face` rules, which are not scoped by Shadow DOM.
- Ancestor layout constraints on the component host itself. Native top-layer
  content can escape clipping, but the host can still be hidden or constrained.
- Event retargeting, nested-root behavior, and a supported consumer customization
  model.
- Stylesheet construction/adoption failure recovery beyond feature fallback.
- A full browser and assistive-technology matrix; current browser verification is
  Chromium-focused. Chromium's `ariaControlsElements` confirms DOM relationship
  resolution, but this spike does not verify screen-reader announcement or
  navigation through Shadow DOM and the native top layer. The Dialog checks verify
  Chromium's reflected element relationships and focus behavior, not an
  accessibility-tree snapshot or screen-reader announcement.
- Consumer test-query migration guidance and a component-by-component rollout.
- An audit of components that use Radix Popover directly instead of the shared
  `ui/popover.tsx` wrapper (`VerseActionPopover` is a confirmed example) and are
  therefore unaffected by this work.

## Recommended path toward production rollout

- **What's validated in Chromium as an internal opt-in prototype**: the
  `ShadowRootHost` + `portalStrategy` + `useShadowPortalTarget` plumbing,
  exercised through the shared Popover and Dialog primitives and their focused
  story harnesses. Portal placement changes only for an isolated component that
  requests a local strategy. One shared correction also affects unisolated
  consumers: the Popover now respects Radix's available-height measurement.
- **Blocking next steps, not "someday" items**: the package-wide custom-
  property audit (now with concrete evidence a real rule was silently broken
  by it) and the direct-Radix-primitive audit (so rollout doesn't create a
  false sense of coverage) both need to happen before any wider rollout.
- **What must be true before a public export could default to isolation**:
  an SSR/hydration story (the shadow root currently attaches in `useEffect`,
  so server output is an empty host and the first paint is post-hydration —
  represented above as a breaking change, not an implementation detail), an
  overlay-ownership decision, and a decision on whether isolation is opt-in per
  component instance or a package-wide toggle.
- This spike enables no automatic isolation for any public export, including
  `BibleVersionPicker` or `SignInDialog`. Rollout is a separate, later change
  with its own ADR and PR.

This prototype should be reviewed as an architectural checkpoint, not as a
complete solution ready for release.
