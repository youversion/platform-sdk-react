# Shadow DOM Isolation Validation and Rollout Plan

## Why this doc exists

[ADR 0006](adr/0006-prototype-shadow-dom-style-isolation.md) records the durable
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
- Concurrent and nested overlays in one shadow root remain unsupported.
  [ADR 0007](adr/0007-shadow-overlay-ownership-stack.md) selects the contract
  to implement them; see "Blocking production-readiness decisions" below.

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
| Dialog modal lifetime | Coverage verifies inert background content while open and through staggered Content and Overlay exit animations. | Validated for one modal | Implement ADR 0007 before supporting nested or competing overlays. |
| Dialog dismissal and restoration | Coverage exercises Escape, backdrop click, full-viewport hit testing, overlay-only focus, and restoration after both modal nodes unmount. | Validated in Chromium | Verify real screen-reader and cross-browser behavior. |
| Nested and concurrent ownership | A pure state-model walkthrough exercises nested modal/popover ownership, concurrent siblings, ancestor-close cascading, exit-animation lifetime, and disconnected-opener fallback. | Contract selected in ADR 0007; runtime unsupported | Implement the layer registry and prove the contract through shared primitives and every inventoried direct overlay consumer in Chromium. |

## Direct overlay inventory

| Location | Classification | Shadow portal requirement |
| --- | --- | --- |
| `components/ui/dialog.tsx` | Shared Radix Dialog infrastructure | Already owns shadow-aware portal and modal-focus coordination. |
| `components/ui/popover.tsx` | Shared Radix Popover infrastructure | Already owns shadow-aware portal state. |
| `components/verse-action-popover.tsx` | Intentional direct Radix Popover consumer | Uses the shared portal-state seam while retaining its virtual anchor, reader-edge docking, custom pill surface, and verse-selection interaction rules. |
| `components/verse.tsx` | React portals into existing YVDOM footnote anchors, not floating overlays | No overlay migration required; each target remains in the rendered verse tree. |

No other production direct-overlay bypass was found. The inventory therefore
produced no equivalent low-risk migration and no materially different case that
requires follow-up work. Nested and concurrent overlay ownership remains a
separate decision.

## Blocking production-readiness decisions

- Decide whether isolation is enabled per component instance, per public export,
  or package-wide.
- Define SSR, hydration, and first-paint behavior. The current effect-attached
  root renders an empty host on the server and delays content and forwarded refs.
- Implement and browser-validate ADR 0007's root-owned overlay stack before
  enabling isolation on a component that can launch nested or concurrent
  overlays.
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
2. Resolve SSR/hydration and rollout-control decisions, then implement and
   browser-validate the selected overlay-ownership contract.
3. Select the next public component and add component-specific compatibility,
   browser, and accessibility coverage before enabling isolation.
4. Publish consumer guidance for DOM queries, automation, customization, forms,
   accessibility, and the loss of global CSS styling.
5. Repeat the validation matrix for each component rather than assuming that the
   infrastructure proof covers its component-specific behavior.
