# Shadow DOM Production Rollout Policy

## Status and intent

YPE-5356 approves a coordinated package-wide rollout plan for compatible public
UI components. It does not claim that the rollout has shipped. Until every
included implementation group and the release gate below are complete, the
runtime behavior remains the prototype recorded in
[ADR 0007](adr/0007-prototype-shadow-dom-style-isolation.md): only
`YouVersionAuthButton` creates an automatic shadow boundary.

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
- Real assistive-technology validation is deferred. Automated keyboard and DOM
  semantics remain required, and release notes must not imply verified screen-
  reader behavior.

## Public component boundary

The inventory follows the package's public entrypoint,
`packages/ui/src/index.ts`, with `packages/ui/src/components/index.ts` as its
primary component barrel. Types, constants, and helper functions are not
component rollout targets.

| Public export | Disposition | Automatic boundary | Required implementation or reason |
| --- | --- | --- | --- |
| `YouVersionAuthButton` | Included; already prototyped | The button | Preserve its current ref and event contract and include it in the final release checks. |
| `BibleChapterPicker.Root`, `.Trigger`, `.Content` | Included as one compound component | `Root` only | Keep context, trigger, content, and shadow-local popover in one tree. Audit consumer-supplied trigger children, callbacks, focus, and picker geometry. |
| `BibleVersionPicker.Root`, `.Trigger`, `.Content` | Included as one compound component | `Root` only | Promote the validated opt-in host to the public root and audit custom trigger styling, storage, focus, and native top-layer behavior. |
| `BibleLanguagePickerContent`, `BibleVersionPickerLanguageTrigger` | Included transitively | No independent boundary | Both require `BibleVersionPicker.Root` context and stay inside that root. Direct use outside the root is already unsupported. |
| `BibleReader.Root`, `.Content`, `.Toolbar` | Included as one compound component | `Root` only | Keep reader content, toolbar, pickers, settings, verse actions, and dialogs in one boundary. Audit consumer children, scrolling, selection, overlays, focus, refs, and first paint. |
| `BibleThemeSettingsContent` | Included | Its standalone mount, or the owning reader boundary | Preserve its Expo DOM callback contract and avoid a nested boundary when rendered by `BibleReader`. |
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
| YPE-5354 | The existing empty-server-host contract is valid but can visibly pop in or shift layout. | Accept it only after component-specific first-paint review; do not claim zero CLS or no visible delay. |
| YPE-5355 | Nested overlay order and teardown are sound; peer popovers dismiss one another, and focus-restoration gaps were identified. | Accept single-active-peer dismissal. Require the YPE-5889/PR 414 focus-restoration fix before overlay-heavy rollout groups complete. |
| YPE-5400 | The compiled custom-property inventory and exact allowlist guard close known ambient dependencies. | Keep the guard green and review every new reference-only custom property. |
| YPE-5436 | Forms, external labels and ARIA ID references stop at the boundary; refs, events, queries, and nested roots have documented constraints. | Exclude `Textarea`; require focused public-contract checks and consumer guidance for included components. |
| YPE-5437 | Twelve realistic component instances mount, unmount, and remount in Normal and Strict Mode while sharing one stylesheet object. | No shared-host scale blocker; performance remains a component-layout review rather than a CI timing threshold. |
| YPE-5946 | Its branch's 21 focused interactions pass Chromium, Firefox, Playwright WebKit, and local Safari 26.6.2; that branch is not yet merged into this one. | Make Chromium, Firefox, and WebKit CI release gates and repeat actual Safari only at the targeted triggers below. |

YPE-5890/PR 415 is test-maintenance support and does not change the rollout
policy. PR 418 repairs integration-branch CI and likewise does not change the
supported component contract.

## Known limitations and dispositions

| Limitation | Disposition |
| --- | --- |
| Empty server host, possible visible pop-in, no no-JavaScript content, and possible layout movement | Accepted as the shared starting contract. Every included group must review its intended layouts and either accept the result or add a component-specific reservation/strategy ticket. |
| Ref is unavailable until the passive-effect shadow mount | Accepted and documented. Component tickets verify forwarded refs where the public component exposes one. |
| Native outer-form participation and cross-tree label or ARIA ID references do not work | Accepted boundary; `Textarea` is excluded. Included components keep their accessible relationships inside their root or expose explicit props/callbacks. |
| Document-rooted selectors and native event targets change | Accepted breaking change. Open-root traversal, role-based automation, public callbacks, and composed-event retargeting are documented. |
| Consumer global CSS and document-level token overrides do not style internals | Intentional. Supported props and component-owned tokens replace accidental global customization; consumer-supplied children require focused review. |
| `rem` still follows the owning document root size | Accepted sizing input and reviewed per component. |
| Font loading and public `@font-face` names remain document-owned | Accepted. `YouVersionProvider` remains responsible for document fonts, including inside same-origin iframe documents. |
| Ancestor layout can still hide, clip, transform, or constrain the shadow host | Accepted platform boundary. |
| Open roots are inspectable and mutable by same-page JavaScript | Accepted; isolation is not a security boundary. |
| Opening a peer popover dismisses the current peer across component roots | Accepted single-active-peer behavior. Supporting concurrent peer popovers would require a demonstrated product journey and separate design. |
| Nested-dialog and rapid-reopen final focus restoration is not fixed on the base branch | Release dependency assigned to YPE-5889/PR 414. Do not duplicate it in rollout tickets. |
| Stylesheet construction or adoption can throw | Shared implementation blocker. The foundation ticket must prove recovery to the local `<style>` path without losing component rendering. |
| Playwright WebKit is not actual Safari | Accepted CI boundary. Repeat SafariDriver validation before the coordinated release candidate and after changes to the host, stylesheet installation, portal controller, or focus controller. |
| Real screen-reader behavior is unverified | Explicitly deferred. Do not claim VoiceOver, NVDA, or other assistive-technology validation in release notes. |

## Implementation plan

Implementation work is grouped by composition and risk rather than by every
exported function. Each ticket links to YPE-5356 and this policy.

1. **YPE-5947: Shared automatic-boundary foundation**
   - Prevent accidental nested roots when included SDK components compose one
     another while preserving intentional consumer-created nesting.
   - Add stylesheet construction and adoption failure recovery.
   - Preserve the per-document stylesheet cache, owner-document behavior,
     Strict Mode lifecycle, and the existing open-root contract.
2. **YPE-5948: Leaf and standalone content components**
   - Roll out `ProfileAvatar`, `Separator`, `FootnoteContent`, and standalone
     `BibleThemeSettingsContent`.
   - Validate compact layout, public props/refs/events, first paint, and
     suppression of nested hosts in owning components.
3. **YPE-5949: Compound pickers**
   - Roll out `BibleChapterPicker.Root` and `BibleVersionPicker.Root` as the
     only boundaries for their compound exports.
   - Validate custom trigger children, context, storage, search inputs, focus,
     collision handling, and shadow-local top-layer behavior.
4. **YPE-5950: Scripture presentation**
   - Roll out standalone `BibleTextView`, `VerseOfTheDay`, and `BibleCard`.
   - Validate reader styles, scripture direction, footnotes, highlights,
     sharing, loading/error states, picker composition, sizing, and first paint.
5. **YPE-5951: Bible reader**
   - Roll out `BibleReader.Root` as the boundary for reader content, toolbar,
     pickers, settings, verse actions, permission dialogs, and sign-in dialogs.
   - Validate selection, scrolling, native-host callback modes, nested overlay
     order, focus restoration, and user-visible performance in intended layouts.
6. **YPE-5952: Coordinated release**
   - Land all included groups, complete the package and component gates, update
     consumer documentation, and publish the behavior as one major release.

Excluded components are not hidden work in these groups. `Textarea` needs a
separately approved form contract, and standalone `VerseActionPopover` needs an
anchor contract that does not cross tree scopes before either can join a future
boundary.

YPE-5947 blocks the component groups. YPE-5949 also blocks the scripture and
reader groups; YPE-5948 and YPE-5950 block the reader. YPE-5889/PR 414 blocks the
reader's overlay completion. YPE-5946 and the completed reader group block the
coordinated release.

## Validation gates

### Shared package gate

- Existing unit, type, lint, build, export, and compiled-style checks pass.
- The focused Shadow DOM suite passes Chromium, Firefox, and Playwright WebKit.
- Actual Safari is repeated before the coordinated release candidate and after
  changes to the host, stylesheet installation, portal controller, or focus
  controller.
- YPE-5437's Normal and Strict Mode mount/remove/remount fixture stays green and
  continues to reuse one stylesheet object per document.
- The YPE-5400 custom-property guard stays exact; no wildcard ambient namespace
  is introduced.
- No release claim implies real assistive-technology validation.

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
  remains unclaimed until separately validated.
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
- the exact automated browser matrix, targeted actual-Safari evidence, and
  explicit deferral of real assistive-technology claims.

Release notes must identify the rollout as a breaking rendered-DOM change even
when a component's TypeScript props are unchanged.

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
