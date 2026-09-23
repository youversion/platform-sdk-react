# Shadow DOM Isolation Validation and Rollout Plan

## Why this doc exists

[ADR 0007](adr/0007-prototype-shadow-dom-style-isolation.md) records the durable
architectural decision behind the Shadow DOM prototype. This document tracks
the implementation evidence, unresolved audits, and conditions for expanding
automatic isolation beyond `YouVersionAuthButton`.

This is a working plan, not approval for package-wide rollout.

## Current scope

- `YouVersionAuthButton` is the only component automatically isolated by the
  current prototype.
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
  exercised through the real shared `ShadowRootHost` implementation (YPE-5355).
  The Shadow DOM ADR records the architectural boundary; the results below record
  the supported contract and the remaining peer-dismissal gap. Broader component
  rollout and peer-overlay coordination remain with YPE-5356.

## Nested and concurrent overlay evidence

| Scenario | Result | Evidence and limitation |
| --- | --- | --- |
| Verse action popover opens the highlights permission dialog | Supported | Both render in the shadow-local top layer. The dialog receives focus and the wrapper is inert. A first Escape closes only the dialog and restores focus inside the popover; a second closes the popover and restores the original outside control. |
| Dialog contains a popover | Supported | The popover is interactive and receives focus. Escape closes it first and restores its trigger while the dialog remains modal. A second Escape closes the dialog and restores its opener. |
| Two independent popovers in the same or separate roots | Unsupported as concurrent peers | Chromium spike observation found that opening a popover dismisses an existing peer through Radix outside interaction, including when the peers use separate component shadow roots. Automated evidence covers the stable contract that the new peer receives focus, remains non-modal, tears down cleanly, and that separate roots remain usable after primary teardown. |
| Rapid dialog close/reopen during exit | Supported | The first dialog unmounts while the overlay retains modal presence. The dialog then reopens as a new node during that retained presence, receives focus, and keeps the wrapper inert. Final dismissal releases the modal state and restores the original opener. Disconnected targets and targets moved out of their captured root—including into the light DOM, another shadow root, or another document—are ignored. |

Separate `ShadowRootHost` instances use different portal containers and tear
those containers down independently. This provides lifecycle isolation, not
interactive concurrency: pointer interaction in another root dismisses the
existing peer overlay. Automated Firefox and Playwright WebKit coverage now
exercises these journeys. All 22 focused stories returned assertion-level success
in local Safari 26.6.2 through SafariDriver when each story used a fresh browser
session. A single long-lived SafariDriver session stalled on the final two play
functions; assistive-technology checks remain open.

## Validation matrix

| Area | Evidence today | Status | Remaining work |
| --- | --- | --- | --- |
| Host CSS isolation | Hostile-CSS demos and focused browser coverage exercise element selectors, direction inheritance, vertical writing and typography resets, hostile custom properties, universal `!important` rules, host attacks, and generated pseudo-content. | Validated in Chromium, Firefox, Playwright WebKit, and local Safari 26.6.2 | Repeat against each component selected for rollout. |
| SSR and hydration | Focused React coverage verifies reuse of the exact empty server host, matching hydration without recoverable errors or duplicate content, and a null forwarded ref before the passive-effect mount. | Validated for the client-only prototype | Decide per rollout component whether a possibly empty first paint, layout shift, and no-JavaScript absence are acceptable. |
| Component behavior | Auth button interaction works through the React portal; Strict Mode does not attach the root twice. | Validated for the prototype | Audit component-specific refs, events, and consumer integrations during rollout. |
| Owner-document handling | Focused coverage mounts into a same-origin iframe and verifies document-compatible stylesheet construction. | Validated in Chromium, Firefox, Playwright WebKit, and local Safari 26.6.2 | Verify stylesheet failure recovery. |
| Inline floating content | The picker negative control preserves tree-scope relationships but demonstrates clipping beyond a constrained ancestor. | Validated as a negative control | None; clipping is why inline placement is not the selected escaping strategy. |
| Native top-layer floating content | Picker stories verify clipping escape, hit testing, collision handling, hostile-CSS isolation, and resolved `aria-controls` relationships. | Validated in Chromium, Firefox, Playwright WebKit, and local Safari 26.6.2 | Verify assistive-technology behavior and repeat actual-Safari checks for significant platform changes. |
| Portal lifecycle | Unit and browser coverage exercise lazy creation, exit-animation retention, cleanup, immediate reopen behavior, and the direct-Radix `VerseActionPopover` consumer. | Validated for shared primitives and the known bypass | Repeat the consumer audit when adding another direct overlay primitive. |
| Dialog relationships | Browser coverage resolves title and description relationships inside the component tree. | Validated in Chromium, Firefox, Playwright WebKit, and an isolated local Safari 26.6.2 run | Verify announcements with real assistive technology. |
| Dialog keyboard containment | Browser coverage exercises initial focus, programmatic escape redirection, forward and reverse traversal, radio-group collapsing, negative `tabindex`, and wraparound. | Validated in Chromium, Firefox, Playwright WebKit, and an isolated local Safari 26.6.2 run | Verify assistive-technology behavior. |
| Dialog modal lifetime | Coverage verifies inert background content while open and through staggered Content and Overlay exit animations. YPE-5355 also exercises both unmount orders for overlapping popover and dialog exits. | Validated for order-independent teardown | YPE-5356 owns peer concurrency across component roots. Verify assistive-technology behavior and repeat actual-Safari checks for significant platform changes. |
| Dialog dismissal and restoration | Coverage exercises Escape, backdrop click, full-viewport hit testing, overlay-only focus, and restoration after both modal nodes unmount. | Validated in Chromium, Firefox, Playwright WebKit, and isolated local Safari 26.6.2 runs | Verify real screen-reader behavior. |
| Consumer form participation | Browser coverage verifies that a light-DOM form does not own or serialize a native control inside an SDK shadow root. | Unsupported across tree scopes | Use an explicit component contract if a rollout target requires outer-form participation. |
| Consumer labels and ARIA ID references | Browser coverage verifies that external native labels, `aria-labelledby`, and `aria-describedby` relationships do not resolve to controls inside the root. | Unsupported across tree scopes | Keep relationships in one tree scope; verify real assistive technology separately. |
| Consumer events, refs, and automation | Coverage verifies native retargeting, the auth button's React handler and forwarded ref, open-root queries, and effect-driven attachment timing. | Supported with documented constraints | Repeat for each public component selected for rollout. |
| Nested shadow roots | Coverage verifies basic rendering, recursive queries, and event retargeting at each boundary. | Supported for the validated basics | Peer-overlay coordination remains with YPE-5356; verify assistive-technology behavior and repeat actual-Safari checks for significant platform changes. |
| Realistic same-page usage | YPE-5437 mounts, removes, and re-adds a 12-component mix in Normal and Strict Mode. Chromium, Firefox, Playwright WebKit, and local Safari 26.6.2 coverage verifies exact host counts, rendered scripture content, and one shared stylesheet object across roots and remounts. A production-build comparison found a small warm-run mount-cost difference on one machine. | No shared-host blocker found | Repeat user-visible performance and compatibility checks for each component selected for rollout. |

Actual Safari 26.6.2 exposed a visual gap the initial focused assertions missed:
the picker header and version rows lost their logical padding inside the shadow
root. The unlayered host-CSS reset now applies only in document roots, where host
selectors can reach SDK descendants. An isolated Safari rerun measured the
expected `12px 16px` header and row padding, matching Chromium; the focused
picker story now checks this spacing.

## Direct overlay inventory

| Location | Classification | Shadow portal requirement |
| --- | --- | --- |
| `components/ui/dialog.tsx` | Shared Radix Dialog infrastructure | Already owns shadow-aware portal and modal-focus coordination. |
| `components/ui/popover.tsx` | Shared Radix Popover infrastructure | Already owns shadow-aware portal state. |
| `components/verse-action-popover.tsx` | Intentional direct Radix Popover consumer | Uses the shared portal-state seam while retaining its virtual anchor, reader-edge docking, custom pill surface, and verse-selection interaction rules. |
| `components/verse.tsx` | React portals into existing YVDOM footnote anchors, not floating overlays | No overlay migration required; each target remains in the rendered verse tree. |

No other production direct-overlay bypass was found. The inventory therefore
produced no equivalent low-risk migration and no materially different case that
requires follow-up work. Extending the controller already owned by
`ShadowRootHost` is a candidate seam for added overlay coordination, not an ADR
decision. YPE-5356 owns whether and how to implement that coordination.

## Blocking production-readiness decisions

- Decide whether isolation is enabled per component instance, per public export,
  or package-wide.
- Apply [ADR 0007's client-only SSR and hydration contract](adr/0007-prototype-shadow-dom-style-isolation.md#ssr-and-hydration-contract)
  per rollout component. YPE-5356 decides whether its first-paint, layout, and
  no-JavaScript limitations are acceptable for that component.
- Resolve the YPE-5355 peer-dismissal gap before shipping concurrent peer
  overlays (YPE-5356). The decision must consider trigger-time peer dismissal
  and overlay order; ADR 0007 records the gap but does not select a coordination design.
  Recurring actual-Safari and assistive-technology coverage still remain.
- Keep the YPE-5400 custom-property contract and compiled-stylesheet prevention
  guard green as component styles change. The audit below closes the known
  ambient dependency; `all: initial` still does not reset custom properties.

## Custom-property contract

YPE-5400 audited authored UI CSS and TSX class inputs, the embedded core theme
and Bible reader CSS, Tailwind and `tw-animate-css` inputs, and the resulting
`packages/ui/dist/tailwind.css`. After removing an accidental `--radius`
reference introduced by a test-only Tailwind class, the compiled stylesheet at
the completion of YPE-5400 contained 201 declared or initialized names and 151
referenced names. The declarations comprised 137 SDK-owned `--yv-*` names, 63
generated `--tw-*` names, and the local `--spacing` compatibility alias.

| Name or namespace | Classification and ownership |
| --- | --- |
| `--yv-*` | SDK-owned properties. The README's documented overrides are supported consumer inputs for light-DOM components under `[data-yv-sdk]`. They are not a public document-level override API for the automatically isolated `YouVersionAuthButton`. |
| `--tw-*` | Tailwind and `tw-animate-css` implementation state that is declared or initialized in the compiled stylesheet. It is not a supported consumer input. |
| `--spacing` | SDK-owned local compatibility alias for `--yv-spacing`, used by generated Tailwind utilities. |
| Authored `--font-*`, `--color-*`, and `--radius-*` theme aliases | Compile-time Tailwind inputs that produce utilities backed by `--yv-*` values. They are not runtime consumer inputs. |
| Exact `--radix-*` exceptions below | Third-party runtime inputs supplied inline by the corresponding Radix primitive. |
| Exact cross-framework accordion exceptions below | Optional inputs in `tw-animate-css`'s fallback chain. The chain first checks the Radix value and ultimately falls back to `auto`. |
| Any other reference-only name | Forbidden ambient dependency until it is locally supplied or added below with a reviewed owner and rationale. |

The compiled guard has no namespace wildcards. These are its exact reviewed
reference-only exceptions:

| Property | Supplier and rationale |
| --- | --- |
| `--yv-reader-max-width` | `BibleCard` always supplies `none` inline so scripture fills its card content; other uses of the embedded or published reader CSS fall back to `65ch` when the property is unset. |
| `--radix-accordion-content-height` | Radix Accordion supplies its measured content height inline. |
| `--radix-popover-content-available-height` | Radix Popover supplies the available height inline. |
| `--radix-popover-content-available-width` | Radix Popover supplies the available width inline. |
| `--radix-popover-content-transform-origin` | Radix Popover supplies the transform origin inline. |
| `--bits-accordion-content-height` | Optional `tw-animate-css` cross-framework fallback; the chain ends at `auto`. |
| `--reka-accordion-content-height` | Optional `tw-animate-css` cross-framework fallback; the chain ends at `auto`. |
| `--kb-accordion-content-height` | Optional `tw-animate-css` cross-framework fallback; the chain ends at `auto`. |
| `--ngp-accordion-content-height` | Optional `tw-animate-css` cross-framework fallback; the chain ends at `auto`. |

`scripts/verify-styles.js` parses the real compiled stylesheet and fails the UI
build when a referenced custom-property name is neither declared/initialized
there nor present in that exact allowlist. This is deliberately a name-level
artifact check: a declaration somewhere in the stylesheet does not prove that
the cascade makes it available to every selector. Focused contract tests and
component tests preserve that boundary without pretending to perform full
selector-reachability analysis.

The source audit also found that `VerseActionPopover` assigns the source-only
names `--tw-animate-duration` and `--tw-animate-easing`, while the installed
animation CSS consumes differently named properties. Those inert assignments
are not ambient stylesheet dependencies; their behavior change is tracked
separately in YPE-5749.

## Functional and compatibility audits

- Apply the [Shadow DOM consumer compatibility contract](shadow-dom-consumer-compatibility.md)
  to every proposed rollout component. Native outer-form participation and
  external `label`, `aria-labelledby`, and `aria-describedby` relationships are
  unsupported across tree scopes in current Chromium, Firefox, and Playwright
  WebKit evidence.
- Preserve `direction` as the only intentional inherited CSS property. Vertical
  writing modes, text orientation, inherited host typography, and undeclared
  host custom properties are not supported customization inputs. The prototype
  retains `rem` sizing, which still responds to the owning document's root font
  size; review that accepted sizing input for each rollout component.
- Repeat the documented event, ref, nested-root, and shadow-aware automation
  checks for every public component selected for rollout.
- Verify stylesheet construction and adoption failure recovery beyond the
  current feature fallback.
- Preserve YPE-5437's realistic-usage fixture as the shared-host regression
  check. Its one-machine mount comparison is diagnostic, so selected rollout
  components still need user-visible performance review in their intended
  layouts.

## Accepted boundaries and unresolved environment coverage

- Component rules are installed locally, but font loading is document-owned.
  Constructable stylesheets discard the compiled Google Fonts `@import` and
  Chromium warns when the per-document cached sheet is created. The `<style>`
  fallback retains the import; neither path replaces the provider's document
  stylesheet and brand-font registration. Fonts must be loaded in each owning
  document, including same-origin iframes.
- Host `@font-face` registrations are document-scoped and can collide with the
  public font family names used inside a shadow root. This limitation is
  accepted for the prototype; avoiding it requires private family names and
  controlled font declarations.
- Shadow DOM cannot prevent a host from hiding, clipping, transforming, or
  constraining the component host or its ancestors.
- Open shadow roots prevent CSS selector crossover; they do not prevent
  same-page JavaScript from inspecting or mutating the root.
- The focused Shadow DOM browser suite runs in Chromium, Firefox, and Playwright
  WebKit. Playwright WebKit is not a substitute for testing actual Safari. All
  22 current stories returned explicit success events in local Safari 26.6.2
  when each ran in a fresh SafariDriver session. A single long-lived session
  returned success for 20/22 and left the sign-in and verse-action play
  functions pending. The cause of that session-dependent stall is unresolved;
  repeat actual-Safari validation in isolated sessions.
- Browser DOM relationship reflection is not a substitute for VoiceOver, NVDA,
  or other real assistive-technology verification.

## Research handoff and completion gate

YPE-5356 is the convergence point for the Shadow DOM research. Its foundational
evidence comes from YPE-5298, YPE-5310, YPE-5352, and YPE-5353. It must not be
completed until the final findings from YPE-5354, YPE-5355, YPE-5400, YPE-5436,
and [YPE-5437](ype-5437-shadow-dom-realistic-usage.md) have been reconciled into
the rollout policy and these durable Shadow DOM documents. Any conflicts and
accepted limitations must be recorded rather than left implicit.

Every component rollout ticket produced by YPE-5356 must link back to that
policy and repeat the compatibility matrix for its selected component. Its gates
must cover browser and assistive-technology behavior, customization,
performance, and stylesheet failure recovery in addition to the component's
forms, labels, ARIA relationships, events, refs, queries, and overlays.

## Rollout sequence

1. Maintain YPE-5400's completed custom-property inventory and prevention guard.
2. Reconcile YPE-5354's SSR/hydration decision, YPE-5355's overlay findings,
   YPE-5436's consumer contract, and YPE-5437's realistic-usage result in
   YPE-5356.
3. Select the next public component and add component-specific compatibility,
   browser, and accessibility coverage before enabling isolation.
4. Publish consumer guidance for DOM queries, automation, customization, forms,
   accessibility, and the loss of global CSS styling.
5. Repeat the validation matrix for each component rather than assuming that the
   infrastructure proof covers its component-specific behavior.
