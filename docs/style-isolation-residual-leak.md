# Residual-leak report: SDK components under consumer host CSS

Date: 2026-08-07 (supersedes the 2026-08-06 measurement)
Ticket: YPE-4113
Decision records: [ADR-0005](adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md),
[ADR-0006](adr/0006-layer-and-importantize-the-sdk-sheet.md)

## Conclusion

**No consumer rule in the fixture reaches an SDK component. All six groups
report zero leaks on all fifteen components.**

The previous version of this report named two rules that got through:

```css
button { padding: 2rem !important }        /* reached 155 buttons */
button { border-radius: 0 !important }     /* reached 65 of those 155 */
```

ADR-0006 closed both. The SDK sheet now ships in `@layer yv` with `!important`
on every non-exempt declaration, and a layered important declaration outranks an
unlayered important one at any specificity.

**Do not adopt shadow DOM.** ADR-0005 set one condition: a residual that
includes rules without `!important`. There was never such a residual, and now
there is no measured residual of either kind.

## How we produced these numbers

The harness is in the repo and runs in CI.

```bash
pnpm turbo build --filter=@youversion/platform-react-ui
pnpm --filter @youversion/platform-react-ui test:integration
```

Each story renders one component. It removes all consumer CSS and records 32
computed properties on every element of the SDK subtree. It then adds one
consumer CSS group at a time and records the properties again. Each (element,
property) pair with a changed value is one leak.

The run captured for this report: 43 test files, 541 tests, all passed.

| Path | What it is |
| --- | --- |
| `packages/ui/src/test/consumer-host.ts` | The six consumer CSS groups |
| `packages/ui/src/test/style-diff.ts` | The 32 tracked properties and the diff |
| `packages/ui/src/components/style-isolation.stories.tsx` | 16 stories, one per component plus the token-override check |

The measured root is always the SDK's own element, never the Storybook canvas.
The canvas is consumer DOM. A count that includes the canvas reports a false
leak on every run.

## Result by consumer CSS group

"Before" is the same fifteen-story harness run against the ADR-0005 sheet, on
2026-08-07. The four zero groups were zero before and after.

| Group | What it models | Before | After |
| --- | --- | --- | --- |
| `preflight` | A consumer running Tailwind v4 Preflight | 0 | **0** |
| `bareElements` | `button, a, p, ul, input { padding; margin; color; font-size; border; border-radius }` | 0 | **0** |
| `aggressiveReset` | `* { box-sizing: content-box; margin: 0 }` | 0 | **0** |
| `inheritedTypography` | `body { font-family; color; line-height; letter-spacing; word-spacing; text-align; text-transform; text-indent; white-space }` | 0 | **0** |
| `important` | `button { border-radius: 0 !important; padding: 2rem !important }` | 944 | **0** |
| `highSpecificity` | `#yv-consumer-host-root button { padding: 1.5rem; margin: 1.25rem; border-radius: 0 }` | 1,570 | **0** |

Zero means zero on every component, not an average.

The id in `highSpecificity` goes on `document.body`, so the rule reaches
Radix-portalled DOM as well as the in-tree subtree. Every story that renders a
`<button>` also asserts that the button matches `#yv-consumer-host-root button`
and that the `important` style tag is still in the document. Without that
positive control, a zero could mean "the fixture stopped matching" rather than
"the SDK held".

## The residual, by component

| Component | Before: `important` | Before: `highSpecificity` | After, both |
| --- | --- | --- | --- |
| `BibleChapterPicker` | 496 | 876 | **0** |
| `BibleVersionPicker` | 144 | 216 | **0** |
| `BibleReader` | 92 | 149 | **0** |
| `VerseActionPopover` | 56 | 84 | **0** |
| `BibleLanguagePickerContent` | 56 | 84 | **0** |
| `BibleTextView` | 44 | 77 | **0** |
| `BibleThemeSettingsContent` | 32 | 48 | **0** |
| `VerseOfTheDay` | 8 | 12 | **0** |
| `YouVersionAuthButton` | 8 | 12 | **0** |
| `BibleVersionPickerLanguageTrigger` | 8 | 12 | **0** |
| `BibleCard` | 0 | 0 | **0** |
| `FootnoteContent` | 0 | 0 | **0** |
| `ProfileAvatar` | 0 | 0 | **0** |
| `Separator` | 0 | 0 | **0** |
| `Textarea` | 0 | 0 | **0** |

The five components that measured zero before render no `<button>`. Both
fixture rules target `button`.

## What still gets through

Two things. Both are deliberate, and neither is in the fixture.

### 1. A consumer rule that is `!important` and in a layer declared before `yv`

```css
@layer theirs, yv;                      /* their layer declared first */
@layer theirs { button { padding: 2rem !important } }
```

For important declarations the layer order reverses, so the layer declared
*first* wins. A consumer who writes this has read the cascade specification and
decided to override us. That is a supported way to opt out, not a leak. It costs
them a `@layer` declaration in a fixed order, which no consumer writes by
accident.

We do not close this. Closing it would need a layer declared before every layer
a consumer might name, which is not expressible.

### 2. The exempt properties

`packages/ui/scripts/scope-selectors.mjs` keeps a property exemption list.
Those declarations stay unlayered and normal, which is exactly the cascade
position they had before ADR-0006. A consumer rule that targets one of them,
with `!important` or at higher specificity, still wins.

The list and the reason for each family are in
[ADR-0006](adr/0006-layer-and-importantize-the-sdk-sheet.md). In summary:

| Family | Why it cannot be important |
| --- | --- |
| `opacity`, `transform`, `height`, `filter` | Animated by a `@keyframes` in this sheet. An important cascaded declaration outranks the animation origin and freezes the animation |
| The rest of the transform pipeline | Composes with `transform` at runtime |
| `animation-*`, `transition-*` | Radix `Presence` writes `animation-fill-mode` inline to hold an exit frame |
| `position`, `top`/`right`/`bottom`/`left`, `inset-*`, `z-index`, `min-width`, `visibility`, `pointer-events` | Radix and floating-ui write these inline to place a popper. An author `!important` outranks the inline `style` attribute |
| `font-size`, `background-color`, `border-*` and their shorthands | SDK components write these inline. Preflight and `theme.css` compile into this sheet and would beat our own components |
| Every `--*` custom property | A consumer `[data-yv-sdk] { --yv-primary: … }` override must keep winning. This is the documented customization path |

The trade is explicit: a working popover and a working animation, at the price
of a consumer being able to override the properties that make them work.

## Keeping this report accurate

Every group is asserted, not only recorded. The two former leak groups now
assert zero, and every story that renders a button also asserts that the fixture
still matches it. A zero that comes from a non-matching fixture fails the story.

Three build-time checks back the harness up, in
`packages/ui/scripts/scope-selectors.mjs` and `scripts/verify-styles.js`. They
fail the build on an ungated selector, a non-exempt declaration that is not
important, an exempt declaration that is important, an `!important` inside a
`@keyframes` body, a `@keyframes` animating a property missing from the
exemption list, a missing or misplaced `@layer yv` block, and a `dist/index.js`
without `@layer yv{`.

**Not covered by any automated check:** popover and dialog *placement*, and
enter/exit animation *appearance*. The harness compares computed styles on a
settled DOM; it does not watch a transition run or read a popper's final
position against its trigger. A manual Storybook pass covers those.

To produce the numbers in this file again, run the commands at the top of this
report. Then read the per-group counts that each story writes to the console.
