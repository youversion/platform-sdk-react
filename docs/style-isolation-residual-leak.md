# Residual-leak report: SDK components under consumer host CSS

Date: 2026-08-07 (supersedes the 2026-08-06 measurement)
Ticket: YPE-4113
Decision records: [ADR-0005](adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md),
[ADR-0006](adr/0006-layer-and-importantize-the-sdk-sheet.md),
[ADR-0007](adr/0007-convert-rem-to-px-in-the-sdk-sheet.md),
[ADR-0008](adr/0008-stop-sdk-css-at-consumer-slots.md)

## Conclusion

**No consumer rule in the fixture reaches an SDK component. All seven groups
report zero leaks on all fifteen components.**

**And no SDK rule reaches consumer content in a slot.** That is the reverse
direction, added by ADR-0008 and measured further down this report.

The previous version of this report named two rules that got through:

```css
button { padding: 2rem !important }        /* reached 155 buttons */
button { border-radius: 0 !important }     /* reached 65 of those 155 */
```

ADR-0006 closed both. The SDK sheet now ships in `@layer yv` with `!important`
on every non-exempt declaration, and a layered important declaration outranks an
unlayered important one at any specificity.

A third rule was found after that, and it is a different class of leak:

```css
html { font-size: 62.5% }                  /* shrank every SDK size by 37.5% */
```

This one is not in the cascade at all. A `rem` resolves against the document
root element, so no selector, layer or `!important` reaches it. ADR-0007 closed
it by converting every `rem` in the sheet to `px` at build time, and by giving
the SDK root an explicit `font-size`.

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

The run captured for this report: 43 test files, 548 tests, all passed.

| Path | What it is |
| --- | --- |
| `packages/ui/src/test/consumer-host.ts` | The seven consumer CSS groups |
| `packages/ui/src/test/style-diff.ts` | The 32 tracked properties and the diff |
| `packages/ui/src/components/style-isolation.stories.tsx` | 20 stories: one per component, the token-override check, and four reverse-direction stories |

The measured root is always the SDK's own element, never the Storybook canvas.
The canvas is consumer DOM. A count that includes the canvas reports a false
leak on every run.

## Result by consumer CSS group

"Before" is the same fifteen-story harness run against the sheet that preceded
the fix, on 2026-08-07. For the first six groups that is the ADR-0005 sheet; for
`remRebase` it is the ADR-0006 sheet. The four zero groups were zero throughout.

| Group | What it models | Before | After |
| --- | --- | --- | --- |
| `preflight` | A consumer running Tailwind v4 Preflight | 0 | **0** |
| `bareElements` | `button, a, p, ul, input { padding; margin; color; font-size; border; border-radius }` | 0 | **0** |
| `aggressiveReset` | `* { box-sizing: content-box; margin: 0 }` | 0 | **0** |
| `inheritedTypography` | `body { font-family; color; line-height; letter-spacing; word-spacing; text-align; text-transform; text-indent; white-space }` | 0 | **0** |
| `important` | `button { border-radius: 0 !important; padding: 2rem !important }` | 944 | **0** |
| `highSpecificity` | `#yv-consumer-host-root button { padding: 1.5rem; margin: 1.25rem; border-radius: 0 }` | 1,570 | **0** |
| `remRebase` | `html { font-size: 62.5% }` | 2,098 | **0** |

Zero means zero on every component, not an average.

The id in `highSpecificity` goes on `document.body`, so the rule reaches
Radix-portalled DOM as well as the in-tree subtree. Every story that renders a
`<button>` also asserts that the button matches `#yv-consumer-host-root button`
and that the `important` style tag is still in the document. Without that
positive control, a zero could mean "the fixture stopped matching" rather than
"the SDK held".

`remRebase` has its own positive control, for the same reason. The harness
injects into `document.head`, so a story could plausibly read zero because the
rule never reached the document root. Each story asserts
`getComputedStyle(document.documentElement).fontSize === '10px'` alongside the
leak count.

## The residual, by component

| Component | Before: `important` | Before: `highSpecificity` | Before: `remRebase` | After, all three |
| --- | --- | --- | --- | --- |
| `BibleChapterPicker` | 496 | 876 | 1,044 | **0** |
| `BibleVersionPicker` | 144 | 216 | 408 | **0** |
| `BibleReader` | 92 | 149 | 119 | **0** |
| `VerseActionPopover` | 56 | 84 | 66 | **0** |
| `BibleLanguagePickerContent` | 56 | 84 | 117 | **0** |
| `BibleTextView` | 44 | 77 | 13 | **0** |
| `BibleThemeSettingsContent` | 32 | 48 | 62 | **0** |
| `VerseOfTheDay` | 8 | 12 | 87 | **0** |
| `YouVersionAuthButton` | 8 | 12 | 42 | **0** |
| `BibleVersionPickerLanguageTrigger` | 8 | 12 | 20 | **0** |
| `BibleCard` | 0 | 0 | 69 | **0** |
| `FootnoteContent` | 0 | 0 | 35 | **0** |
| `ProfileAvatar` | 0 | 0 | 4 | **0** |
| `Separator` | 0 | 0 | 2 | **0** |
| `Textarea` | 0 | 0 | 10 | **0** |

The five components that measured zero on the first two groups render no
`<button>`, and both of those fixture rules target `button`. `remRebase` reaches
every component, because every component ships `rem` sizes.

## The reverse direction: SDK CSS reaching into consumer content

An SDK component that renders `children`, or render-prop output, puts the
consumer's own markup inside a `[data-yv-sdk]` subtree. Until ADR-0008 the gate
matched all of it, and `theme.css` reset and recolored it.

### The baseline

This direction needs a different baseline from the one above. The forward
direction removes the consumer sheet. The reverse direction cannot remove the SDK
sheet, because that would also remove every value consumer content legitimately
**inherits**, and inheritance is not a leak.

So the baseline is a placement. The harness renders the same consumer markup
twice in one document, with the SDK sheet present for both: once with no
`[data-yv-sdk]` ancestor, once inside an SDK component's consumer slot. A
difference between the two is SDK CSS matching consumer DOM, and nothing else.
The fixture declares all 32 tracked properties on every element, so inheritance
is not part of the comparison.

### Result

| Placement | Before | After |
| --- | --- | --- |
| `BibleReader.Root` children, in a `data-yv-slot` wrapper | 255 | **0** |
| `BibleChapterPicker.Trigger` children | 68 | **0** |
| `BibleVersionPicker.Trigger` children | 68 | **0** |
| `BibleReader.Root` children, no slot (positive control) | 255 | 416 |

The last row is the positive control, and it went the other way. See residual 4
below.

## What still gets through

Five things. All are deliberate, and none is in the forward fixture.

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

### 3. The root font size, on purpose

`[data-yv-sdk] { font-size: 16px }` is a `font-size` declaration, so it is
exempt by the rule above. It stays unlayered and normal at 0,1,0, and a consumer
rule beats it.

That is the design. It is the one way a consumer can make the SDK scale with
their own type size, now that the sheet ships `px`.

The cost is an accessibility one and it is stated plainly in
[ADR-0007](adr/0007-convert-rem-to-px-in-the-sdk-sheet.md): the SDK no longer
grows when a reader raises their **browser's** default font size. Browser zoom
still works, because zoom scales `px`. A consumer who needs type scaling has
four supported paths: override `[data-yv-sdk] { font-size }`, raise a `--yv-*`
size token, pass a component's `fontSize` prop, or open an issue.

### 4. Consumer content that is not in a slot

Three sites render consumer content and cannot be stamped:

| Site | Why |
| --- | --- |
| `BibleReader.Root` children | One stamped `div` holds SDK compound children (`Toolbar`, `Content`) and consumer children together. A slot around all of them switches off the styling the SDK children need |
| `BibleChapterPicker.Trigger` with `asChild` | `asChild` merges our props onto the consumer's own element. There is no element left to wrap |
| `BibleVersionPicker.Trigger` with `asChild` | Same |

Content at those sites is now restyled *harder* than before ADR-0008, and the
number is above: the no-slot control went from 255 leaks to 416. The gate's rise
from 0,1,0 to 0,2,0 lifted the SDK's normal declarations — the exempt ones, which
stay unlayered — above a consumer rule at 0,1,0. The new properties are
`font-size`, `font-style`, `font-weight` and the four `border-*-width` longhands,
which `theme.css` sets through `font: inherit` and `border: 0 solid`.

The fix is one attribute. A consumer wraps their content in an element with
`data-yv-slot`, and the count returns to zero. The harness story
`BibleReaderConsumerSlot` does exactly that.

ADR-0008 records the alternative that would have avoided the rise,
`:where(:not(…))`, and why it was not taken.

### 5. A selector whose subject sits past the gate compound

The build check reads `data-yv-sdk` where it appears literally in a compound. A
Tailwind variant such as `.yv\:space-y-4 > :not(:last-child)` carries the gate on
its *first* compound, and its subject is a later one. The check does not fire,
and such a rule can still match the slot wrapper element the SDK renders.

It cannot reach the consumer's own elements below the wrapper, because a child
combinator does not go that deep. The reverse harness measures the outcome, and
it reads zero on all three slotted placements.

## Keeping this report accurate

Every group is asserted, not only recorded. The three former leak groups now
assert zero, and each carries its own positive control: a button story asserts
the fixture still matches the button, and `remRebase` asserts the document root
really reads `10px`. A zero that comes from a non-matching fixture fails the
story.

The build-time checks back the harness up, in
`packages/ui/scripts/scope-selectors.mjs` and `scripts/verify-styles.js`. They
fail the build on an ungated selector, a gated selector that reaches past the
gate without a slot exclusion, a non-exempt declaration that is not
important, an exempt declaration that is important, an `!important` inside a
`@keyframes` body, a `@keyframes` animating a property missing from the
exemption list, a surviving `rem` length, a missing or misplaced `@layer yv`
block, and a `dist/index.js` without `@layer yv{`.

**Not covered by any automated check:** popover and dialog *placement*, and
enter/exit animation *appearance*. The harness compares computed styles on a
settled DOM; it does not watch a transition run or read a popper's final
position against its trigger. A manual Storybook pass covers those.

**Also not covered by the build check:** a `rem` written in an inline `style`
prop. The check reads the compiled sheet, and an inline style is not in it.
Write `px` in a `style` prop. The harness catches one that slips through, as a
`remRebase` leak.

To produce the numbers in this file again, run the commands at the top of this
report. Then read the per-group counts that each story writes to the console.
