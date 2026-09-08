# Shadow DOM Isolation Validation and Rollout Plan

## Why this doc exists

[ADR 0007](adr/0007-prototype-shadow-dom-style-isolation.md) records the durable
architectural decision behind the Shadow DOM prototype. This document tracks
the implementation evidence, unresolved audits, and conditions for expanding
automatic isolation beyond `YouVersionAuthButton`.

This is a working plan, not approval for package-wide rollout.

## Current scope

- `YouVersionAuthButton` creates its Shadow DOM boundary automatically.
- `BibleVersionPicker` validates shadow-local inline and native top-layer
  floating content through opt-in stories.
- The shared Dialog and Popover primitives support opt-in shadow-local portals.
- `VerseActionPopover` uses the shared portal-state infrastructure while
  retaining its specialized direct Radix composition.
- `BibleVersionPicker` and other public exports do not automatically create
  Shadow DOM boundaries.
- The internal `SignInDialog` is validated only through an opt-in
  `ShadowRootHost` story.
- Nested and concurrent overlays within and across component shadow roots were
  exercised through the production `ShadowRootHost` seam (YPE-5355). The Shadow
  DOM ADR records the architectural boundary; the results below record the
  supported contract and peer-dismissal and final focus-restoration gaps. Runtime
  changes remain YPE-5356.

## Nested and concurrent overlay evidence

| Scenario | Result | Evidence and limitation |
| --- | --- | --- |
| Verse action popover opens the highlights permission dialog | Partially supported | Both render in the shadow-local top layer. The dialog receives focus and the wrapper is inert. A first Escape closes only the dialog and restores focus inside the popover; a second closes the popover. Chromium spike observation found no final focus restoration. Automated evidence covers the stable dismissal, containment, and teardown contract without requiring that known gap to remain. |
| Dialog contains a popover | Supported | The popover is interactive and receives focus. Escape closes it first and restores its trigger while the dialog remains modal. A second Escape closes the dialog and restores its opener. |
| Two independent popovers in the same or separate roots | Unsupported as concurrent peers | Chromium spike observation found that opening a popover dismisses an existing peer through Radix outside interaction, including when the peers use separate component shadow roots. Automated evidence covers the stable contract that the new peer receives focus, remains non-modal, tears down cleanly, and that separate roots remain usable after primary teardown. |
| Rapid dialog close/reopen during exit | Unsupported | The first dialog remains connected in its closed state when it is reopened. The reopened dialog receives focus and the wrapper remains inert. Chromium spike observation found that final dismissal loses the opener; automated evidence requires safe modal release without locking in that focus loss. |

Separate `ShadowRootHost` instances use different portal containers and tear
those containers down independently. This provides lifecycle isolation, not
interactive concurrency: pointer interaction in another root dismisses the
existing peer overlay. Firefox, WebKit, and assistive-technology checks remain
open.

## Validation matrix

| Area | Evidence today | Status | Remaining work |
| --- | --- | --- | --- |
| Host CSS isolation | Hostile-CSS demo and focused Chromium coverage exercise element selectors, direction inheritance, vertical writing and typography resets, hostile custom properties, universal `!important` rules, host attacks, and generated pseudo-content. | Validated for the prototype | Repeat against each component selected for rollout. |
| Component behavior | Auth button interaction works through the React portal; Strict Mode does not attach the root twice. | Validated for the prototype | Audit component-specific refs, events, and consumer integrations during rollout. |
| Owner-document handling | Focused coverage mounts into a same-origin iframe and verifies document-compatible stylesheet construction. | Validated for the prototype | Verify stylesheet failure recovery. |
| Inline floating content | The picker negative control preserves tree-scope relationships but demonstrates clipping beyond a constrained ancestor. | Validated as a negative control | None; clipping is why inline placement is not the selected escaping strategy. |
| Native top-layer floating content | Picker stories verify clipping escape, hit testing, collision handling, hostile-CSS isolation, and resolved `aria-controls` relationships. | Validated in Chromium | Expand browser and assistive-technology coverage. |
| Portal lifecycle | Unit and browser coverage exercise lazy creation, exit-animation retention, cleanup, immediate reopen behavior, and the direct-Radix `VerseActionPopover` consumer. | Validated for shared primitives and the known bypass | Repeat the consumer audit when adding another direct overlay primitive. |
| Dialog relationships | Chromium resolves title and description relationships inside the component tree. | Validated in Chromium | Verify announcements with real assistive technology. |
| Dialog keyboard containment | Browser coverage exercises initial focus, programmatic escape redirection, forward and reverse traversal, radio-group collapsing, negative `tabindex`, and wraparound. | Validated in Chromium | Expand the browser and assistive-technology matrix. |
| Dialog modal lifetime | Coverage verifies inert background content while open and through staggered Content and Overlay exit animations. YPE-5355 also exercises both unmount orders for overlapping popover and dialog exits. | Validated for order-independent teardown | YPE-5356 owns peer concurrency across component roots and final focus-restoration gaps. Expand browser and assistive-technology coverage. |
| Dialog dismissal and restoration | Coverage exercises Escape, backdrop click, full-viewport hit testing, overlay-only focus, and restoration after both modal nodes unmount. | Validated in Chromium | Verify real screen-reader and cross-browser behavior. |

## Direct overlay inventory

| Location | Classification | Shadow portal requirement |
| --- | --- | --- |
| `components/ui/dialog.tsx` | Shared Radix Dialog infrastructure | Already owns shadow-aware portal and modal-focus coordination. |
| `components/ui/popover.tsx` | Shared Radix Popover infrastructure | Already owns shadow-aware portal state. |
| `components/verse-action-popover.tsx` | Intentional direct Radix Popover consumer | Uses the shared portal-state seam while retaining its virtual anchor, reader-edge docking, custom pill surface, and verse-selection interaction rules. |
| `components/verse.tsx` | React portals into existing YVDOM footnote anchors, not floating overlays | No overlay migration required; each target remains in the rendered verse tree. |

No other production direct-overlay bypass was found. The inventory therefore
produced no equivalent low-risk migration and no materially different case that
requires follow-up work. YPE-5355 found that any added overlay coordination
should extend the controller already owned by `ShadowRootHost`; YPE-5356 owns
that runtime decision and implementation.

## Blocking production-readiness decisions

- Decide whether isolation is enabled per component instance, per public export,
  or package-wide.
- Define SSR, hydration, and first-paint behavior. The current effect-attached
  root renders an empty host on the server and delays content and forwarded refs.
- Resolve the YPE-5355 peer-dismissal and final focus-restoration gaps before
  shipping nested and concurrent overlays (YPE-5356). ADR 0007 limits any new
  coordination to the existing root-owned controller and requires it to account
  for trigger-time peer dismissal as well as overlay order and restore targets.
  Cross-browser and assistive-technology coverage still remain.
- Complete the package-wide custom-property inventory and prevention guard in
  YPE-5400. The known `BibleVersionPicker`, `InputGroup`, and `tw-animate-css`
  dependencies now resolve through locally-defined SDK-owned spacing and radius
  values, but `all: initial` does not reset unknown custom properties.

## Functional and compatibility audits

- Verify native form participation and external `label`, `aria-labelledby`, and
  `aria-describedby` relationships when controls cross tree scopes.
- Preserve `direction` as the only intentional inherited visual input. Vertical
  writing modes, text orientation, host typography, and undeclared host custom
  properties are not supported customization inputs.
- Document event retargeting, nested-root behavior, supported customization, and
  shadow-aware consumer test and automation queries.
- Verify stylesheet construction and adoption failure recovery beyond the
  current feature fallback.
- Audit realistic component density and the cost of many roots, effects,
  wrappers, and local portal containers.

## Accepted boundaries and unresolved environment coverage

- Host `@font-face` registrations are document-scoped and can collide with the
  public font family names used inside a shadow root. This limitation is
  accepted for the prototype; avoiding it requires private family names and
  controlled font declarations.
- Shadow DOM cannot prevent a host from hiding, clipping, transforming, or
  constraining the component host or its ancestors.
- Open shadow roots prevent CSS selector crossover; they do not prevent
  same-page JavaScript from inspecting or mutating the root.
- Browser automation currently focuses on Chromium. Firefox and WebKit remain
  to be evaluated.
- Chromium DOM relationship reflection is not a substitute for VoiceOver, NVDA,
  or other real assistive-technology verification.

## Rollout sequence

1. Complete YPE-5400's custom-property inventory and prevention guard.
2. Resolve SSR/hydration, rollout-control, and overlay-ownership decisions.
3. Select the next public component and add component-specific compatibility,
   browser, and accessibility coverage before enabling isolation.
4. Publish consumer guidance for DOM queries, automation, customization, forms,
   accessibility, and the loss of global CSS styling.
5. Repeat the validation matrix for each component rather than assuming that the
   infrastructure proof covers its component-specific behavior.
