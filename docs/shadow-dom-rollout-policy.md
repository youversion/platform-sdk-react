# Shadow DOM Production Rollout Policy

## Status and intent

YPE-5356 defines the coordinated package-wide rollout for compatible public UI
components. Every included implementation group is present on the coordinated
release branch, but this document does not claim that the major release has
shipped. Publishing remains gated by the YPE-5952 package, browser, and
assistive-technology validation below. The final release-candidate actual-Safari
result is recorded in the
[validation plan](shadow-dom-isolation-plan.md#actual-safari-browser-evidence);
the bounded Safari/VoiceOver validation is complete, while Windows with NVDA
was not run because no test environment was available and remains explicitly
unvalidated. Future trigger changes require another Safari run. The implemented
boundary extends the architecture recorded in
[ADR 0010](adr/0010-automatic-shadow-dom-style-isolation.md):
`YouVersionAuthButton`, `BibleChapterPicker.Root`, `BibleVersionPicker.Root`,
`BibleReader.Root`, `ProfileAvatar`, `Separator`, `FootnoteContent`, and standalone
`BibleThemeSettingsContent`, `BibleTextView`, `VerseOfTheDay`, and `BibleCard`
create automatic shadow
boundaries. Compound members and composed leaf components remain in their
owning component tree and reuse its boundary when present rather than creating
independent boundaries.

The rollout is coordinated at release time, not implemented in one change.
Focused component or component-group tickets may land independently on the
Shadow DOM integration branch, but the package must not release a partial public
boundary. Runtime feature flags and a phased-release framework are unnecessary.

## Decisions

- Automatic isolation is applied at an SDK-owned top-level component boundary,
  not to every exported React function. Compound members and implementation
  children stay in their owning root's tree.
- Public components that compose other included SDK components must reuse their
  outer SDK boundary. The implementation must not create accidental nested
  roots merely because both public exports support automatic isolation.
- The client-only SSR contract is accepted for the included boundary, subject
  to a focused first-paint review in each implementation ticket. A component
  that needs server-rendered or no-JavaScript content must be excluded or use a
  separately approved host strategy.
- Automatic isolation is a breaking rendered-DOM change and ships in a major
  release. React props need not change, but document queries, native event
  targets, ref timing, global styling, and cross-tree relationships can change.
- Automated keyboard and DOM semantics remain required but do not substitute
  for real assistive-technology validation. YPE-5952 requires a bounded release-
  candidate smoke pass with Safari and VoiceOver. The planned Chrome-or-Edge
  and NVDA pass was not run because no Windows test environment was available,
  so that combination must remain explicitly unvalidated. Claims must name only
  the exact combinations validated and must not imply broader screen-reader
  support or WCAG certification.

## Public component boundary

The inventory follows the package's public entrypoint,
`packages/ui/src/index.ts`, with `packages/ui/src/components/index.ts` as its
primary component barrel. Types, constants, and helper functions are not
component rollout targets.

| Public export | Disposition | Automatic boundary | Required implementation or reason |
| --- | --- | --- | --- |
| `YouVersionAuthButton` | Included | The button | Preserve its current ref and event contract and include it in the final release checks. |
| `BibleChapterPicker.Root`, `.Trigger`, `.Content` | Included as one compound component | `Root` only | Keep context, trigger, content, and shadow-local popover in one tree. Audit consumer-supplied trigger children, callbacks, focus, and picker geometry. |
| `BibleVersionPicker.Root`, `.Trigger`, `.Content` | Included as one compound component | `Root` only | Use the public root as the automatic boundary and preserve custom trigger styling, storage, focus, and native top-layer behavior. |
| `BibleLanguagePickerContent`, `BibleVersionPickerLanguageTrigger` | Included transitively | No independent boundary | Both require `BibleVersionPicker.Root` context and stay inside that root. Direct use outside the root is already unsupported. |
| `BibleReader.Root`, `.Content`, `.Toolbar` | Included as one compound component | `Root` only | Keep reader content, toolbar, pickers, settings, verse actions, and dialogs in one boundary. Audit consumer children, scrolling, selection, overlays, focus, refs, and first paint. |
| `BibleReaderSearch` | Included transitively | No independent boundary | It requires `BibleReader.Root` context and stays inside that root whether rendered by the toolbar or directly by a consumer. Preserve its shadow-local popover, controlled and host-owned modes, navigation, dismissal, and focus behavior. |
| `BibleThemeSettingsContent` | Included through YPE-5994 | Its standalone mount, or the owning reader boundary | Preserve its Expo DOM callback contract, constrained Popover scrolling, and reuse of the owning `BibleReader` boundary. |
| `BibleTextView` | Included | Its standalone mount, or the owning card/reader boundary | Preserve scripture rendering, footnote portals, selection callbacks, and reader stylesheet behavior without nesting roots inside composed SDK components. |
| `FootnoteContent` | Included | Its standalone mount, or the owning scripture boundary | Treat it as a leaf when used alone and reuse the enclosing `BibleTextView` boundary otherwise. |
| `VerseOfTheDay` | Included | The card | Audit loading/error states, Web Share and clipboard callbacks, scripture direction, and first-paint geometry. Its internal `BibleTextView` reuses the card boundary. |
| `BibleCard` | Included | The card | Audit loading/error states, optional version picker, footnotes, highlights, sizing, and first paint. Internal picker and scripture components reuse the card boundary. |
| `ProfileAvatar` | Included | The avatar | Audit image loading, fallback labeling, consumer props, ref behavior inherited from Radix, and compact inline layout. |
| `Separator` | Included | The separator | Audit orientation, decorative semantics, consumer props, and flex/grid sizing through a `display: contents` host. |
| `Textarea` | Excluded | None | Native outer-form ownership, serialization, and external `<label for>` relationships do not cross a shadow boundary. Include it only after an explicit form-associated public contract is designed. |
| `VerseActionPopover` | Excluded as an independent boundary; included inside `BibleReader` | The owning reader boundary | Its public contract accepts verse elements and a virtual anchor from the owning DOM tree. An independent shadow host would split that anchor relationship. |
| `YouVersionProvider` | Excluded | None | It is the document-level context, document stylesheet, and font owner rather than a visual component boundary. It must remain outside isolated descendants. |
| `BaseYouVersionProvider` | Excluded | None | This hooks-package provider is re-exported for advanced consumers. It supplies React context without rendering a visual SDK boundary. |

Exports nested under a compound root are not exclusions from isolated behavior;
they are exclusions from creating an additional host. This distinction prevents
the inventory from treating implementation fragments as separate rollout units.

## Research reconciliation

| Input | Incorporated result | Rollout effect |
| --- | --- | --- |
| YPE-5298 | The non-merge StyleX spike passed its hostile-host and Expo/Metro gates, but the ticket was closed Won't Do. StyleX still reused the existing shadow host rather than replacing the selector boundary. | Retain the compiled Tailwind stylesheet and existing open shadow root; do not reopen a style-system migration for this rollout. |
| YPE-5310 | A shadow-local native top layer preserves tree-scoped relationships while escaping clipping. | Overlay-owning components require native Popover API support and focused top-layer checks. |
| YPE-5352 | Host resets, inherited properties, and ambient custom properties were hardened. | Preserve `direction` as the intentional inherited property and retain the host/wrapper resets. |
| YPE-5353 | Shared Dialog and Popover primitives and the direct `VerseActionPopover` path use the shadow portal controller. | Reuse those seams; audit any newly introduced direct overlay consumer. |
| YPE-5354 | The childless-server-host contract is valid but can visibly pop in or shift layout. The host now declares its intended `display` in server markup. | Accept it only after component-specific first-paint review; do not claim zero CLS or no visible delay. |
| YPE-5355 | Nested overlay order and teardown are sound; peer popovers dismiss one another, and focus-restoration gaps were identified. YPE-5889/PR 414 resolved the final restoration defects. | Accept single-active-peer dismissal and preserve the completed focus-restoration behavior as regression coverage. |
| YPE-5400 | The compiled custom-property inventory and exact allowlist guard close known ambient dependencies. | Keep the guard green and review every new reference-only custom property. |
| YPE-5436 | Forms, external labels and ARIA ID references stop at the boundary; refs, events, queries, and nested roots have documented constraints. | Exclude `Textarea`; require focused public-contract checks and consumer guidance for included components. |
| YPE-5437 | Twelve realistic component instances mount, unmount, and remount in Normal and Strict Mode while sharing one stylesheet object. | No shared-host scale blocker; performance remains a component-layout review rather than a CI timing threshold. |
| YPE-5946 | All 22 focused stories pass Chromium, Firefox, and Playwright WebKit. All 22 also returned assertion-level success in local Safari 26.6.2 when each used a fresh SafariDriver session; one long-lived session stalled after 20 successes. PR 420 also fixed Safari-specific picker and document-root spacing defects exposed by that validation. | Keep Chromium, Firefox, and WebKit as CI release gates. Repeat actual Safari in isolated sessions only at the targeted triggers below. |

YPE-5890/PR 415 is test-maintenance support and does not change the rollout
policy. PR 418 repairs integration-branch CI and likewise does not change the
supported component contract.

## Known limitations and dispositions

| Limitation | Status | Disposition |
| --- | --- | --- |
| Childless, declaratively styled server host; possible visible pop-in; no no-JavaScript content; and possible layout movement | Accepted | Use as the shared starting contract. Every included group must review its intended layouts and either accept the result or add a component-specific reservation/strategy ticket. |
| Ref is unavailable until the passive-effect shadow mount | Accepted | Document the timing. Component tickets verify forwarded refs where the public component exposes one. |
| Native outer-form participation and cross-tree label or ARIA ID references do not work | Accepted | Exclude `Textarea`. Included components keep their accessible relationships inside their root or expose explicit props/callbacks. |
| Document-rooted selectors and native event targets change | Accepted | Treat this as a breaking change. Document open-root traversal, role-based automation, public callbacks, and composed-event retargeting. |
| A consumer bubbling React handler on a light-DOM ancestor can receive one composed event twice | Resolved for the validated families by narrow shared-host handling | The shared host keeps one React logical traversal for each validated bubbling `click`, `keydown`, `keyup`, `pointerdown`, `mousedown`, `dblclick`, and `contextmenu` plus React `onFocus`/native `focusin` and React `onBlur`/native `focusout` delivery while preserving native propagation, retargeting, component callback semantics, and host-origin delivery. Distinct native events remain distinct. Other bubbling families require focused evidence before support is claimed. |
| A consumer capture-phase React handler on a light-DOM ancestor can receive one composed event twice | Accepted documented limitation | YPE-6210 records exactly two `onClickCapture` deliveries for one fresh composed internal click. A React capture redesign and native propagation suppression are outside the coordinated rollout, so capture remains a documented limitation. |
| Consumer global CSS and document-level token overrides do not style internals | Accepted | Supported props and component-owned tokens replace accidental global customization; consumer-supplied children require focused review. |
| `rem` still follows the owning document root size | Accepted | Review this sizing input per component. |
| Font loading and public `@font-face` names remain document-owned | Accepted | `YouVersionProvider` remains responsible for document fonts, including inside same-origin iframe documents. |
| Ancestor geometry can clip, transform, or constrain the shadow host, while ancestor `visibility` or `pointer-events` values can be reset inside the shadow tree | Accepted | Keep the consumer consequence and guidance in the [compatibility contract](shadow-dom-consumer-compatibility.md#compatibility-matrix). |
| Native Popover API support is absent | Unsupported for isolated floating content | Keep the consumer consequence and guidance in the [compatibility contract](shadow-dom-consumer-compatibility.md#compatibility-matrix). |
| Open roots are inspectable and mutable by same-page JavaScript | Accepted | Isolation is not a security boundary. |
| Opening a peer popover dismisses the current peer across component roots | Accepted | Keep the single-active-peer behavior. Supporting concurrent peer popovers would require a demonstrated product journey and separate design. |
| Nested-dialog and rapid-reopen final focus restoration | Accepted | Preserve the behavior resolved by YPE-5889/PR 414 as regression coverage rather than duplicating the implementation in rollout tickets. |
| Stylesheet construction or adoption can throw | Resolved by YPE-5947 | Construction, replacement, and adoption failures recover to the local `<style>` path without losing component rendering; later roots can still use the per-document constructable sheet. |
| Playwright WebKit is not actual Safari | Release-candidate run complete; future trigger | Keep the exact isolated-session SafariDriver result in the [validation plan](shadow-dom-isolation-plan.md#actual-safari-browser-evidence). Repeat after changes to the host, stylesheet installation, portal controller, focus controller, or other significant platform seams. |
| Release-candidate screen-reader evidence | Accepted with an explicit validation gap | The bounded YPE-5952 Safari/VoiceOver pass is complete. Chrome-or-Edge/NVDA was not run because no Windows environment was available and remains unvalidated. Record exact versions and per-journey results only for combinations actually tested; do not generalize beyond them. |

## Implementation plan

Implementation work was grouped by composition and risk rather than by every
exported function. Each completed ticket links to YPE-5356 and this policy.

1. **YPE-5947: Shared automatic-boundary foundation**
   - Prevent accidental nested roots when included SDK components compose one
     another while preserving intentional consumer-created nesting.
   - Add stylesheet construction and adoption failure recovery.
   - Preserve the per-document stylesheet cache, owner-document behavior,
     Strict Mode lifecycle, and the existing open-root contract.
2. **YPE-5948: Leaf and standalone content components**
   - Roll out `ProfileAvatar`, `Separator`, and `FootnoteContent`.
   - Validate compact layout, public props/refs/events, first paint, and
     suppression of nested hosts in owning components.
3. **YPE-5994: Standalone theme settings layout**
   - Roll out standalone `BibleThemeSettingsContent` with the smallest internal
     layout strategy that preserves constrained Popover scrolling.
   - Preserve Expo DOM callbacks and reuse the owning `BibleReader` boundary.
   - Implemented on the integration branch: the standalone component owns one
   client-only open root. Its private host is a shrinkable block-size grid
   item while generic shadow hosts keep `display: contents`; reader-owned
   settings suppress the nested boundary and reuse the completed YPE-5951
   reader root.
4. **YPE-5949: Compound pickers**
   - Roll out `BibleChapterPicker.Root` and `BibleVersionPicker.Root` as the
     only boundaries for their compound exports.
   - Validate custom trigger children, context, storage, search inputs, focus,
     collision handling, and shadow-local top-layer behavior.
   - Retain document-root `rem` scaling as the accepted sizing input; do not add
     a picker-specific root-font reset.
5. **YPE-5950: Scripture presentation**
   - Roll out standalone `BibleTextView`, `VerseOfTheDay`, and `BibleCard`.
   - Validate reader styles, scripture direction, footnotes, highlights,
     sharing, loading/error states, picker composition, sizing, and first paint.
6. **YPE-5951: Bible reader**
   - Roll out `BibleReader.Root` as the boundary for reader content, toolbar,
     `BibleReaderSearch`, pickers, settings, verse actions, permission dialogs,
     and sign-in dialogs.
   - Validate selection, search navigation and dismissal, scrolling, native-host
     callback modes, nested overlay order, focus restoration, and user-visible
     performance in intended layouts.
7. **YPE-5952: Coordinated release**
   - Land all included groups, complete the package and component gates, update
     consumer documentation, and publish the behavior as one major release.

YPE-5947 added no public Shadow DOM configuration. Its independently releasable
runtime effect was a patch-level resilience fix for stylesheet installation;
the additional automatic component boundaries now implemented by the later
groups remain one coordinated major-release contract and must not publish
partially.

Excluded components are not hidden work in these groups. `Textarea` needs a
separately approved form contract, and standalone `VerseActionPopover` needs an
anchor contract that does not cross tree scopes before either can join a future
boundary.

The dependency-ordered component groups, YPE-5994, and YPE-6040 are complete.
YPE-5889 and YPE-5946 provide reusable focus-restoration and cross-browser
evidence. YPE-5952 owns the bounded human assistive-technology validation,
consumer documentation, and major-release gate. Its final actual-Safari and
Safari/VoiceOver results, plus the explicit Windows/NVDA validation gap, are
recorded in the
[validation plan](shadow-dom-isolation-plan.md#actual-safari-browser-evidence).

## Validation gates

### Shared package gate

- Existing unit, type, lint, build, export, and compiled-style checks pass.
- The focused Shadow DOM suite passes Chromium, Firefox, and Playwright WebKit.
- Keep the exact final actual-Safari candidate result in the
  [validation plan](shadow-dom-isolation-plan.md#actual-safari-browser-evidence).
  Repeat after changes to the host, stylesheet installation, portal controller,
  focus controller, or other significant platform seams.
- YPE-5437's Normal and Strict Mode mount/remove/remount fixture stays green and
  continues to reuse one stylesheet object per document.
- The YPE-5400 custom-property guard stays exact; no wildcard ambient namespace
  is introduced.
- The bounded YPE-5952 Safari/VoiceOver smoke pass is recorded with exact
  browser, operating-system, and assistive-technology versions plus a result
  for every required journey. Chrome-or-Edge/NVDA is explicitly recorded as
  not run because no Windows test environment was available.
- Release claims are limited to those exact combinations and do not imply
  broader VoiceOver, NVDA, JAWS, mobile-screen-reader, or WCAG coverage.

### Component-ticket gate

Each included group records which checks apply and supplies focused evidence for
them; it does not repeat shared infrastructure proofs without a changed seam.

- SSR markup, hydration, visible empty interval, and representative layout
  movement are reviewed.
- Public refs, callbacks, composed events, and mount timing are preserved or
  documented as breaking behavior.
- Forms, native labels, accessible names/descriptions, and all ID relationships
  remain inside one tree or use an explicit public contract.
- Consumer children, `className`, style props, theme props, direction, root-font
  sizing, and supported custom properties have an explicit customization path.
- Overlays remain in the owning root, escape clipping through the native top
  layer, and preserve dismissal, focus containment, restoration, and teardown.
- Role and keyboard behavior is automated. Real assistive-technology behavior
  is claimed only for the exact YPE-5952 combinations and journeys recorded in
  the release-candidate evidence.
- User-visible performance is reviewed in the component's intended layout; the
  YPE-5437 diagnostic is not treated as a universal budget.
- The focused component journeys pass the package browser matrix.

## Consumer documentation and release requirements

The coordinated release must update the package README, root README where
applicable, Storybook guidance, changelog, and release notes to explain:

- the new light-DOM host and open shadow root;
- client-only rendering, first-paint behavior, and ref timing;
- document-query limitations and recommended role/public-ref automation;
- native event retargeting and the distinction from React callback targets;
- unsupported cross-tree forms, labels, and ARIA ID references;
- loss of consumer global-CSS access and the supported customization inputs;
- document-owned fonts, retained root `rem` sizing, direction inheritance, and
  ancestor-layout limitations;
- shadow-local overlay behavior and single-active-peer dismissal; and
- the exact automated browser matrix, targeted actual-Safari evidence, exact
  assistive-technology combinations and journey results, and every material
  unvalidated combination.

Release notes must identify the rollout as a breaking rendered-DOM change even
when a component's TypeScript props are unchanged.

YPE-5994 adds no independently releasable public configuration or package
version. YPE-5952 must include standalone theme settings in that coordinated
consumer handoff: open-root traversal replaces document-only queries, server
markup is a childless host with declarative display until the passive-effect
client mount, native events retarget at the host, global CSS no longer reaches
the five internal controls, and the explicit `theme`, interface direction, and
four top-level Expo callback props remain the supported integration contract. Do
not describe the focused browser matrix or DOM relationship assertions as real
assistive-technology validation.

## Follow-up ticket contract

Every implementation ticket created from this plan must include:

- its exact public export boundary and exclusions;
- dependencies on earlier implementation groups and existing supporting work;
- the applicable component-ticket gates above;
- reusable package evidence it does not need to duplicate;
- component-specific automated or manual evidence;
- consumer documentation and release-note impacts; and
- an explicit statement that it must not independently publish a partial public
  rollout.
