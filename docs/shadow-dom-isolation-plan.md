# Shadow DOM Isolation Validation and Rollout Plan

YPE-5356 reconciles this research into the
[Shadow DOM production rollout policy](shadow-dom-rollout-policy.md). This file
remains the detailed evidence inventory; the policy owns the approved public
boundary, implementation groups, accepted limitations, and coordinated release
gate. The implementation groups are complete on the coordinated release branch;
publishing remains gated by the YPE-5952 evidence recorded below.

## Why this doc exists

[ADR 0007](adr/0007-prototype-shadow-dom-style-isolation.md) records the durable
architectural decision behind the Shadow DOM prototype. This document tracks
the implementation evidence, unresolved audits, and coordinated-release
validation for the approved public boundary.

This is an evidence inventory and release-candidate plan, not a claim that the
major release or any pending manual validation has completed.

## Current scope

- In the current stable package, `YouVersionAuthButton` is the only component
  with automatic isolation. On the coordinated release branch, every included
  YPE-5356 component boundary is implemented: the auth button, chapter and
  version picker roots, `BibleReader.Root`, `ProfileAvatar`, `Separator`,
  `FootnoteContent`, and standalone `BibleThemeSettingsContent`,
  `BibleTextView`, `VerseOfTheDay`, and `BibleCard`.
- Compound members and SDK-owned composed children reuse the owner boundary.
  Reader-owned scripture, pickers, settings, avatar, verse actions, and dialogs
  therefore stay in the reader root instead of creating accidental nested roots.
  The boundaries remain subject to the coordinated YPE-5952 release gate.
- The picker roots validate shadow-local native top-layer floating content
  through their public runtime boundaries. A historical inline negative
  control demonstrated clipping beyond a constrained ancestor before that
  story was removed after strategy selection.
- The shared Dialog and Popover primitives support opt-in shadow-local portals.
- `VerseActionPopover` uses the shared portal-state infrastructure while
  retaining its specialized direct Radix composition.
- The exclusions and their reasons remain in the
  [rollout policy](shadow-dom-rollout-policy.md#public-component-boundary); no
  other public exports create automatic boundaries.
- The internal `SignInDialog` has focused `ShadowRootHost` evidence and is also
  exercised as reader-owned UI in the public reader boundary.
- Nested and concurrent overlays within and across component shadow roots were
  exercised through the real shared `ShadowRootHost` implementation (YPE-5355).
  The Shadow DOM ADR records the architectural boundary; the results below record
  the supported contract and the remaining peer-dismissal limitation. The
  production policy accepts single-active-peer dismissal and assigns broader
  component rollout to focused follow-up work.

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
functions. The release-candidate Safari/VoiceOver result and explicit
Windows/NVDA validation gap are recorded in the YPE-5952 section below.

## Validation matrix

| Area | Evidence today | Status | Remaining work |
| --- | --- | --- | --- |
| Host CSS isolation | Hostile-CSS demos and focused browser coverage exercise element selectors, direction inheritance, vertical writing and typography resets, hostile custom properties, universal `!important` rules, host attacks, and generated pseudo-content. | Validated for the included groups in Chromium, Firefox, Playwright WebKit, and the recorded 38/38 final-candidate Safari run | Repeat actual Safari after the rollout-policy trigger changes. |
| SSR and hydration | Focused React coverage verifies reuse of the exact empty server host, matching hydration without recoverable errors or duplicate content, and a null forwarded ref before the passive-effect mount. Group-specific sections below cover the included boundary. | Accepted for the coordinated client-only boundary | Preserve the empty-host, possible-pop-in, possible-layout-movement, and no-JavaScript limitations in consumer documentation. |
| Component behavior | Group-specific unit and browser coverage below exercises public behavior, refs, events, composition, and Strict Mode lifecycle. | Validated for the included groups | Complete the final package/browser gates and manual release-candidate checks. |
| Owner-document handling | Focused coverage mounts into a same-origin iframe and verifies document-compatible stylesheet construction. YPE-5947 also covers construction, replacement, and adoption failure recovery. | Validated in Chromium, Firefox, Playwright WebKit, and local Safari 26.6.2 | None. |
| Inline floating content | A historical picker negative control preserved tree-scope relationships but demonstrated clipping beyond a constrained ancestor. | Validated historically; the story was removed after strategy selection. | None; clipping is why inline placement is not the selected escaping strategy. |
| Native top-layer floating content | Picker stories verify clipping escape, hit testing, collision handling, hostile-CSS isolation, and resolved `aria-controls` relationships. | Validated in Chromium, Firefox, Playwright WebKit, and local Safari 26.6.2 | Verify assistive-technology behavior and repeat actual-Safari checks for significant platform changes. |
| Portal lifecycle | Unit and browser coverage exercise lazy creation, exit-animation retention, cleanup, immediate reopen behavior, and the direct-Radix `VerseActionPopover` consumer. | Validated for shared primitives and the known bypass | Repeat the consumer audit when adding another direct overlay primitive. |
| Dialog relationships | Browser coverage resolves title and description relationships inside the component tree. | Validated in Chromium, Firefox, Playwright WebKit, and an isolated local Safari 26.6.2 run | Verify announcements with real assistive technology. |
| Dialog keyboard containment | Browser coverage exercises initial focus, programmatic escape redirection, forward and reverse traversal, radio-group collapsing, negative `tabindex`, and wraparound. | Validated in Chromium, Firefox, Playwright WebKit, and an isolated local Safari 26.6.2 run | Verify assistive-technology behavior. |
| Dialog modal lifetime | Coverage verifies inert background content while open and through staggered Content and Overlay exit animations. YPE-5355 also exercises both unmount orders for overlapping popover and dialog exits. | Validated for order-independent teardown | The rollout policy accepts single-active-peer dismissal. Verify assistive-technology behavior and repeat actual-Safari checks for significant platform changes. |
| Dialog dismissal and restoration | Coverage exercises Escape, backdrop click, full-viewport hit testing, overlay-only focus, and restoration after both modal nodes unmount. | Validated in Chromium, Firefox, Playwright WebKit, and isolated local Safari 26.6.2 runs | Verify real screen-reader behavior. |
| Consumer form participation | Browser coverage verifies that a light-DOM form does not own or serialize a native control inside an SDK shadow root. | Unsupported across tree scopes | Use an explicit component contract if a rollout target requires outer-form participation. |
| Consumer labels and ARIA ID references | Browser coverage verifies that external native labels, `aria-labelledby`, and `aria-describedby` relationships do not resolve to controls inside the root. | Unsupported across tree scopes | Keep relationships in one tree scope; verify real assistive technology separately. |
| Consumer events, refs, and automation | Coverage verifies native retargeting, public callbacks and refs, open-root queries, effect-driven attachment timing, and one light-DOM ancestor dispatch for each validated bubbling click and keydown plus React `onFocus`/native `focusin` delivery. | Supported for the documented component paths | Capture-phase handlers, `onBlur`, and other composed event types remain outside this evidence and must stay documented. |
| Nested shadow roots | Coverage verifies basic rendering, recursive queries, event retargeting at each boundary, and one React ancestor dispatch per scope for a nested click. | Supported for the validated basics | Single-active-peer dismissal is accepted; verify assistive-technology behavior and repeat actual-Safari checks for significant platform changes. |
| Realistic same-page usage | YPE-5437 mounts, removes, and re-adds a 12-component mix in Normal and Strict Mode. Chromium, Firefox, Playwright WebKit, and local Safari 26.6.2 coverage verifies exact host counts, rendered scripture content, and one shared stylesheet object across roots and remounts. A production-build comparison found a small warm-run mount-cost difference on one machine. | No shared-host blocker found; component layout reviews are recorded below | Keep the lifecycle fixture green; it is not a universal performance budget. |

## YPE-5952 release-candidate validation

This section is the durable record for the final coordinated-release checks. It
does not convert automated DOM assertions into screen-reader evidence. The final
release-candidate Safari browser run is recorded below. All assistive-technology
claims are limited to the exact environment and per-journey results recorded
below; Windows/NVDA was not run and remains unvalidated.

Use the existing production Storybook journeys; do not add duplicate stories
only to execute this checklist:

| Required surface | Existing journey |
| --- | --- |
| Sign-in dialog | `sign-in-dialog.shadow-isolation.stories.tsx` → `IsolatesFocusInertnessBackdropAndRestoration` |
| Chapter picker | `bible-chapter-picker.shadow-isolation.stories.tsx` → `PublicRootJourney` |
| Version picker | `bible-version-picker.shadow-isolation.stories.tsx` → `TopLayerEscapesClippingAndPreservesSemantics` and `StylingFocusDismissalAndRapidReopen` |
| Bible Reader and verse actions | `bible-reader.stories.tsx` → `VerseSelectionReanchoringDismissalAndFocusRestoration` |
| Theme settings | `bible-theme-settings.stories.tsx` → `FontControlsRemainReachableInConstrainedSpace` and `MixedAndPortaledControlsPreserveTabOrder` |
| Representative nested overlays | `shadow-overlay-production-seam.shadow-isolation.stories.tsx` → `PopoverOpensDialogEvidence` and `DialogContainsPopoverEvidence` |

### Actual Safari browser evidence

Run the focused Shadow DOM suite against the final release-candidate commit with
each story in a fresh SafariDriver session. The earlier long-lived-session stall
means a single shared session is not acceptable evidence.

| Field | Release-candidate evidence |
| --- | --- |
| Commit SHA | `c0092043182bb3dcc0a73f7d82323de0d0c229a5` |
| Date and operator | 2026-10-12; Codex on Austin Harms's local machine |
| macOS version and build | macOS 26.6.2, build 25G83 |
| Safari version and build | Safari 26.6.2; SafariDriver 21624.5.1.11.3 |
| Storybook build command or artifact | `pnpm --filter @youversion/platform-react-ui test:shadow-safari` |
| Focused story count and per-story results | 38/38 passed. The final candidate matrix used one fresh process and SafariDriver session per story: 36 stories passed on their first attempt, 1 passed on its second attempt after SafariDriver retained the preceding session, and the Bible Card version-picker story passed in a direct isolated rerun after its matrix process exceeded the 120-second limit without producing a test result. |
| Failures, linked blockers, or reruns | The final candidate evidence had 0 assertion failures. One recognized SafariDriver session-handoff failure used one bounded transport retry. One generic process timeout was surfaced as a matrix failure, was not automatically retried, and passed in a direct isolated rerun in 1.1 seconds. The runner permits at most two retries only for recognized transport failures; generic process timeouts, story assertion failures, and interaction failures are not retried. |

### Assistive-technology evidence

Record versions from the tested machines rather than naming only the product
family. The planned Windows/NVDA combination was not run because no Windows test
environment was available; it is an explicit validation gap, not a pass.

| Combination | Operating system | Browser | Assistive technology | Date and operator | Status |
| --- | --- | --- | --- | --- | --- |
| Safari with VoiceOver | macOS 26.6.2 (25G83) | Safari 26.6.2 (21624.5.1.11.3) | VoiceOver 10 (993) | 2026-10-12; Austin Harms | Complete—seven required journeys remained usable; picker opening announcements have the non-blocking finding recorded below |
| Chrome or Edge with NVDA | Not available | Not run | Not run | 2026-10-13; release decision by Austin Harms | Not run—no Windows/NVDA environment was available; this combination remains unvalidated |

For every journey and combination, record announcements, accessible names and
descriptions, reading order, keyboard operation, modal focus containment,
dismissal, focus restoration, and the final result. A failure that prevents core
keyboard or screen-reader use blocks the release; record narrower non-blocking
findings as linked follow-ups without expanding this ticket into a general
accessibility redesign.

| Journey | Safari + VoiceOver | Chrome/Edge + NVDA | Finding or follow-up |
| --- | --- | --- | --- |
| Sign-in dialog | Pass. VoiceOver announced the title and description, announced each control once, kept forward and reverse keyboard traversal inside the dialog, and preserved dismissal and focus restoration. | Not run—unvalidated | None |
| Chapter picker | Pass with the shared picker-announcement finding. Space opened the picker; VoiceOver exposed the `Books` web-dialog context on subsequent navigation, announced Genesis as collapsed and then expanded, allowed selection of Genesis 1, and preserved focus restoration on close. | Not run—unvalidated | Safari/VoiceOver did not announce the newly opened picker or its initial programmatic focus until the operator navigated. Core keyboard and screen-reader operation remained available. [YPE-6181](https://lifechurch.atlassian.net/browse/YPE-6181) tracks this with the version-picker instance as one focused follow-up. |
| Version picker | Pass with the shared picker-announcement finding. Keyboard focus entered on the English selector, Tab moved next to Close, VoiceOver announced the `Bible Versions` web-dialog context and Close control, and dismissal restored focus to NIV. | Not run—unvalidated | On open, VoiceOver continued to announce the NIV trigger and `Control-Option-F4` reported no keyboard focus even though Safari exposed the English selector as the shadow root's active element. The next Tab correctly advanced from English to Close and exposed the dialog to VoiceOver. This did not prevent operation, so [YPE-6181](https://lifechurch.atlassian.net/browse/YPE-6181) is a non-blocking follow-up rather than a YPE-5952 expansion. |
| Bible Reader | Pass. VoiceOver exposed the reader controls and scripture in reading order, and the chapter/version navigation exercised above remained operable inside the reader. | Not run—unvalidated | None beyond the shared picker-announcement finding |
| Verse actions | Pass. Selecting a verse exposed the verse-actions dialog; keyboard navigation reached the highlight action and the controls remained operable. | Not run—unvalidated | None |
| Theme settings | Pass. VoiceOver exposed the Reader Settings dialog and its close, font-size, line-spacing, and font controls; traversal stayed inside and Escape restored focus to Settings. | Not run—unvalidated | None |
| Nested overlays | Pass. Activating a highlight action opened the sign-in dialog; the first Escape dismissed only the sign-in dialog and retained the verse-actions overlay, and the second Escape dismissed the verse-actions overlay. | Not run—unvalidated | None |

### YPE-6181 Safari and VoiceOver follow-up

On 2026-10-14, Austin Harms repeated the two existing picker journeys on the
same macOS 26.6.2 (25G83), Safari 26.6.2 (21624.5.1.11.3), and VoiceOver 10
(993) combination. The chapter picker immediately announced its `Books`
web-dialog context with the dialog as its established initial focus target. The
version picker immediately announced its `Bible Versions` web-dialog context
and English language selector. Neither journey required an additional Tab or
VoiceOver navigation command to expose the newly opened picker. The targeted
SafariDriver journeys also passed, including explicit close and Escape focus
restoration. The completed YPE-6181 implementation at
`f752f8f0d78297b0e315aa2e7e55a4094469d221` then passed the full focused actual
Safari matrix: 38/38 stories passed on their first attempt with one fresh process
and SafariDriver session per story. This final run included both picker journeys,
their retained-content rapid-close-and-reopen paths, and the shared overlay
production seams, with no transport retries, timeouts, or assertion failures.

Release notes may claim only the exact combinations and successful journeys
recorded here. They must identify untested combinations—including JAWS and
mobile screen readers—as unvalidated and must not imply WCAG certification.

## YPE-5948 leaf evidence

`ProfileAvatar`, `Separator`, and `FootnoteContent` now use the shared automatic
boundary. In the reader user menu and verse footnote composition, they remain
in their owning component tree and reuse its boundary when present. The
realistic-usage fixture retains exactly 12 manually owned hosts and one shared
stylesheet object by marking its contents for boundary reuse.

The focused component matrix verifies exact empty-host SSR and one open client
root containing each production element. Component behavior coverage preserves
the avatar's image/fallback and forwarded Radix ref contract; Separator's
decorative, orientation, DOM prop, event, and ref behavior; footnote context,
reference, direction, theme, and font sizing. The focused browser story
exercises hostile light-DOM CSS, the avatar's 32-by-32 compact flex placement,
horizontal and vertical Separator geometry, and representative footnote theme
and direction in the package browser matrix.

The ADR's client-only first-paint contract is accepted for the reviewed avatar
rows and stacks, separators, and standalone footnotes. Their empty server host
reserves no space, so content can appear and move nearby layout after the
passive-effect mount; footnote composition normally appears only after
interaction.

The intended-layout review moved standalone `BibleThemeSettingsContent` to
YPE-5994 because its initial automatic host prevented the settings body from
participating as the constrained Popover grid's shrinkable, scrollable item.
The completed result and its component-specific accommodation are recorded
below.

## YPE-5994 standalone theme settings evidence

Standalone `BibleThemeSettingsContent` now owns one client-only open shadow
root and reuses the exact empty server host during hydration. Its explicit
theme scopes both the shadow wrapper and settings body even when the provider
theme conflicts, and its interface direction, five native button controls,
selected font state, font limits, and four top-level Expo callbacks retain
their public behavior.

The constrained Popover journey identified the only layout exception needed:
this component's private host uses a flex-column layout with a zero logical
minimum block size, and the settings body fills that allocated block before
scrolling.
The generic host reset and shadow content wrapper retain `display: contents`.
Focused Chromium, Firefox, and Playwright WebKit coverage verifies
collision-boundary containment, internal overflow and scroll, stable header
placement, center hit testing for all five controls, keyboard activation, and
focus restoration. On 2026-09-28 the same built Storybook journey completed in
a fresh SafariDriver session on Safari 26.6.2 (macOS build 25G83); its final
state confirmed the selected Untitled Serif value, closed dialog, and restored
trigger focus. This focused browser evidence does not establish
assistive-technology support.

`BibleReader.Root` suppresses the standalone boundary around its owned settings,
so the settings body remains in the reader root without nesting. YPE-5952 must
document the empty-host client-only contract, open-root automation, native
event retargeting, loss of global-CSS access, and the supported explicit theme,
direction, and callback inputs as part of the coordinated major release.
YPE-5994 has an empty changeset and must not publish an independent partial
rollout.

## YPE-5950 scripture presentation evidence

Standalone `BibleTextView`, `VerseOfTheDay`, and `BibleCard` now each own one
client-only open shadow root and reuse the exact empty server host during
hydration. `VerseOfTheDay` and `BibleCard` suppress the automatic boundary on
their composed `BibleTextView`; `BibleCard` also suppresses it on its composed
version picker. `BibleReader` suppresses the standalone `BibleTextView`
boundary so its owned scripture renderer reuses the reader root.

Focused unit coverage verifies the exact host matrix, hydration without nested
or duplicate roots, open-root queries, native event retargeting, the React verse
selection callback, and the forwarded element ref. Existing behavior suites
continue to exercise scripture typography, direction, footnotes, highlights,
loading and error states, selection and sharing, card version control, and
picker callbacks at the reusable implementation seam. Added regression cases
cover the verse-of-the-day clipboard fallback and `BibleCard`'s
`defaultVersionId` path.

Focused Chromium, Firefox, and Playwright WebKit stories exercise hostile
light-DOM CSS, representative standalone layouts, both verse-of-the-day sizes,
the default and full card compositions, card version selection, and the
shadow-local footnote overlay. The ADR's empty-host
client-only first-paint contract is accepted for these reviewed layouts; without
JavaScript the component content remains absent, and nearby layout can move
after the passive-effect mount. This evidence does not establish actual-Safari
or assistive-technology support. YPE-5952 must document the coordinated public
behavior, and YPE-5950 carries an empty changeset so it cannot publish a partial
rollout independently.

Real Chromium validation also found that a consumer React handler on a
light-DOM ancestor can receive one composed event through both the shadow-root
portal path and the application-root retargeted path.

YPE-6040 now keeps one React logical traversal for each native `click`, `keydown`,
and `focusin` event without stopping native propagation. The representative auth
button story verifies component callback counts and target semantics, exact
light-DOM ancestor counts, separate repeated clicks, native retargeting, and
the original composed path. The nested-root story retains its existing native
retargeting evidence and adds one React ancestor dispatch per scope. The main
workflow passes Chromium, Firefox, and Playwright WebKit. Because the correction
changes the shared host, YPE-5952 retains the required actual-Safari
release-candidate validation; this evidence makes no assistive-technology claim.

## YPE-5951 Bible reader evidence

`BibleReader.Root` now owns one client-only open shadow root and reuses the
exact empty server host during hydration. Reader-owned content, toolbar,
search, scripture, chapter and version pickers, theme settings, avatar, verse
actions, and authentication dialogs remain in that root; the chapter and
version picker `Root` components explicitly reuse it. A consumer may still
intentionally render another public isolated component as an arbitrary reader
child, which creates the documented nested-root topology.

Focused unit evidence verifies hydration without recoverable errors, empty
light DOM, no accidental reader-owned roots, direct `BibleReaderSearch`
placement, arbitrary child relocation, and intentional public nesting. The
existing detailed reader behavior suites continue at their reusable
implementation seams. The existing search and verse-selection browser
journeys traverse the reader root, and focused hostile-CSS/constrained-layout
coverage reviews theme, interface and Scripture direction, typography,
scrolling, and geometry in Chromium, Firefox, and Playwright WebKit.

The concrete `examples/vite-react` reader page was also reviewed in its
`h-[calc(100vh-3.5rem)]` shell beneath the example navbar: the reader surface
continues to fill that shell, its toolbar remains above the independently
scrolling scripture pane, and the constrained browser evidence retains usable
toolbar and scripture geometry. Interactive review found no obvious
user-visible performance regression while opening reader-owned settings,
search, verse actions, and auth overlays; each reuses the one reader root and
local overlay rather than adding duplicate automatic hosts. This is a
qualitative product-layout check, not benchmark evidence.

The ADR's client-only first-paint gap is accepted for the reviewed reader
layout: without JavaScript the reader remains absent, and nearby layout can
move after the passive-effect mount. This evidence is qualitative and does not
claim zero layout shift, a benchmark, actual-Safari coverage, or
assistive-technology coverage. YPE-5952 must document that arbitrary
`BibleReader.Root` children move into the open root, so document-root queries
and global CSS no longer reach them. YPE-6040's ancestor React-event dispatch
correction is included in the coordinated release branch with the limitations
recorded in the consumer compatibility contract.

## Safari spacing evidence

Actual Safari 26.6.2 exposed a visual gap the initial focused assertions missed:
the picker header and version rows lost their logical padding inside the shadow
root. The unlayered host-CSS reset now applies only in document roots, where host
selectors can reach SDK descendants. An isolated Safari rerun measured the
expected `12px 16px` header and row padding, matching Chromium; the focused
picker story now checks this spacing.

The document-root hostile-CSS story also exposed a Safari spacing failure:
variable-backed Tailwind padding resolved to zero through the unlayered
`revert-layer` reset. The fixed SDK spacing scale is now inlined into generated
utilities, and actual Safari and focused WebKit runs verify the SDK button and
input padding while the host button remains overridden.

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
`ShadowRootHost` remains a possible seam if a product journey later requires
concurrent peer popovers. YPE-5356 does not require that speculative
coordination for the coordinated rollout.

## Production-readiness decisions

- Apply automatic isolation at the SDK-owned top-level component boundary.
  Compound members and composed SDK children reuse the owning boundary rather
  than creating accidental nested roots.
- Apply [ADR 0007's client-only SSR and hydration contract](adr/0007-prototype-shadow-dom-style-isolation.md#ssr-and-hydration-contract)
  per rollout group. Each implementation ticket reviews whether its first-paint,
  layout, and no-JavaScript limitations are acceptable for that component.
- Accept single-active-peer popover dismissal. Concurrent peer overlays require
  a demonstrated product journey and a separate design. The final actual-Safari
  candidate and Safari/VoiceOver runs are recorded above. Windows/NVDA was not
  run and remains unvalidated. Future trigger changes require another Safari run.
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
| `--yv-*` | SDK-owned properties. The README's documented overrides are supported consumer inputs for light-DOM components under `[data-yv-sdk]`. They are not a public document-level override API for automatically isolated components. |
| `--tw-*` | Tailwind and `tw-animate-css` implementation state that is declared or initialized in the compiled stylesheet. It is not a supported consumer input. |
| `--spacing` | SDK-owned local compatibility alias for `--yv-spacing`, used by `tw-animate-css`. The fixed Tailwind spacing scale is inlined into generated utilities. |
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
  host custom properties are not supported customization inputs. The rollout
  retains `rem` sizing, which still responds to the owning document's root font
  size; review that accepted sizing input for each rollout component.
- Repeat the documented event, ref, nested-root, and shadow-aware automation
  checks for every public component selected for rollout.
- Preserve YPE-5947's stylesheet construction, replacement, and adoption
  failure-recovery coverage.
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
  accepted for the rollout; avoiding it requires private family names and
  controlled font declarations.
- Shadow DOM cannot prevent a host from hiding, clipping, transforming, or
  constraining the component host or its ancestors.
- Open shadow roots prevent CSS selector crossover; they do not prevent
  same-page JavaScript from inspecting or mutating the root.
- The focused Shadow DOM browser suite runs in Chromium, Firefox, and Playwright
  WebKit. Playwright WebKit is not a substitute for testing actual Safari. The
  final release-candidate evidence completed 38/38 stories in isolated SafariDriver
  sessions at commit `c0092043182bb3dcc0a73f7d82323de0d0c229a5`. Repeat actual
  Safari after the rollout-policy trigger changes.
- Browser DOM relationship reflection is not a substitute for VoiceOver, NVDA,
  or other real assistive-technology verification. The Safari/VoiceOver evidence
  above applies only to that exact combination; Windows/NVDA and every other
  untested combination remain unvalidated.

## Research handoff and completion gate

YPE-5356 is the convergence point for the Shadow DOM research. Its foundational
evidence comes from YPE-5298, YPE-5310, YPE-5352, and YPE-5353. The final
findings from YPE-5354, YPE-5355, YPE-5400, YPE-5436,
[YPE-5437](ype-5437-shadow-dom-realistic-usage.md), and YPE-5946 are reconciled
into the rollout policy and these durable Shadow DOM documents. Conflicts and
accepted limitations are recorded rather than left implicit.

Every component rollout ticket produced by YPE-5356 must link back to that
policy and apply the compatibility matrix to its selected component. Its gates
cover browser and assistive-technology claims, customization, performance, and
stylesheet failure recovery in addition to the component's forms, labels, ARIA
relationships, events, refs, queries, and overlays.

The dependency-ordered rollout sequence and release gate are defined in the
[production rollout policy](shadow-dom-rollout-policy.md#implementation-plan).
