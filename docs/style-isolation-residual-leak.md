# Residual-leak report: SDK components under hostile host CSS

Date: 2026-08-06
Ticket: YPE-4113
Decision record: [ADR-0005](adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md)

## Conclusion

**Two consumer declarations still reach SDK components. Both use `!important`.
No other rule reaches them.**

```css
button { padding: 2rem !important }        /* reaches 155 buttons */
button { border-radius: 0 !important }     /* reaches 65 of those 155 */
```

Every rule in the fixture without `!important` reports zero leaks on every
component. **Do not adopt shadow DOM.** ADR-0005 sets one condition for shadow
DOM: a residual that includes rules without `!important`. There is no such
residual.

## How we produced these numbers

The harness is in the repo and runs in CI.

```bash
pnpm --filter @youversion/platform-react-ui build:css
pnpm --filter @youversion/platform-react-ui build:css:scope
pnpm --filter @youversion/platform-react-ui test:integration
```

Each story renders one component. It removes all hostile CSS and records 32
computed properties on every element of the SDK subtree. It then adds one hostile
group at a time and records the properties again. Each (element, property) pair
with a changed value is one leak.

The run captured for this report: 43 test files, 523 tests, all passed.

| Path | What it is |
| --- | --- |
| `packages/ui/src/test/hostile-host.ts` | The five hostile CSS groups |
| `packages/ui/src/test/style-diff.ts` | The 32 tracked properties and the diff |
| `packages/ui/src/components/style-isolation.stories.tsx` | 14 stories, one per component plus the token-override check |

The measured root is always the SDK's own element, never the Storybook canvas.
The canvas is consumer DOM. A count that includes the canvas reports a false
leak on every run.

## Result by hostile group

Totals for all 13 hostile-host stories.

| Group | What it models | Leaks |
| --- | --- | --- |
| `preflight` | A consumer running Tailwind v4 Preflight | **0** |
| `bareElements` | `button, a, p, ul, input { padding; margin; color; font-size; border; border-radius }` | **0** |
| `aggressiveReset` | `* { box-sizing: content-box; margin: 0 }` | **0** |
| `inheritedTypography` | `body { font-family; color; line-height; letter-spacing; word-spacing; text-align; text-transform; text-indent; white-space }` | **0** |
| `important` | `button { border-radius: 0 !important; padding: 2rem !important }` | **880** |

Zero means zero on every component, not an average.

## The residual, by component

The 880 leaks are 155 elements times the properties that changed on each one.

| Component | Leaks | Elements hit | Elements not hit |
| --- | --- | --- | --- |
| `BibleChapterPicker` | 496 | 95 buttons | every non-button element |
| `BibleVersionPicker` | 144 | 18 buttons | every non-button element |
| `BibleReader` | 92 | 17 buttons | every non-button element |
| `VerseActionPopover` | 56 | 7 buttons | every non-button element |
| `BibleTextView` | 44 | 11 buttons | every non-button element |
| `BibleThemeSettingsContent` | 32 | 5 buttons | every non-button element |
| `VerseOfTheDay` | 8 | 1 button | every non-button element |
| `YouVersionAuthButton` | 8 | 1 button | every non-button element |
| `BibleCard` | 0 | renders no `<button>` | all |
| `FootnoteContent` | 0 | renders no `<button>` | all |
| `ProfileAvatar` | 0 | renders no `<button>` | all |
| `Separator` | 0 | renders no `<button>` | all |
| `Textarea` | 0 | renders no `<button>` | all |

The eight components render 155 `<button>` elements in total. All 155 leak. No
element that is not a `<button>` leaks anywhere. The residual is exactly the
selector that the consumer wrote, and nothing more.

## The residual, by rule and by element

### `button { padding: 2rem !important }`

This rule reaches all 155 buttons, on all four sides. It causes 620 of the 880
leaks.

| Component | Element | Clean padding | Under the rule |
| --- | --- | --- | --- |
| `BibleChapterPicker` | 66 book accordion triggers (`[data-slot="accordion-trigger"]`, for example "1 Chronicles") | `16px 0` | `32px` |
| `BibleChapterPicker` | 28 chapter number buttons (`[data-slot="button"]`, "1" through "28") | `0` | `32px` |
| `BibleChapterPicker` | popover close button | `0` | `32px` |
| `BibleVersionPicker` | 14 version rows (`[data-slot="item"]`, for example `aria-label="New International Version 2011"`) | `12px 16px` | `32px` |
| `BibleVersionPicker` | 2 tab triggers (`[data-slot="tabs-trigger"]`, "Suggested" and "All (5)") and the popover close button | `0` | `32px` |
| `BibleVersionPicker` | language trigger (`aria-label="Select language"`) | `0 10px` | `32px` |
| `BibleReader` | toolbar: previous chapter, next chapter, "Change Bible book and chapter", "Change Bible version", Settings, `[data-testid="user-menu-trigger"]` | `0`, `0 10px`, `0 16px` | `32px` |
| `BibleReader` | 11 footnote triggers (`[data-slot="popover-trigger"]`, `aria-label="Footnote"`) | `0` | `32px` |
| `BibleTextView` | 11 footnote triggers (`[data-slot="popover-trigger"]`, `aria-label="Footnote"`) | `0` | `32px` |
| `VerseActionPopover` | 5 highlight swatches (`aria-label="Apply highlight"`) | `0` | `32px` |
| `VerseActionPopover` | Copy, Share | `4px 8px` | `32px` |
| `BibleThemeSettingsContent` | `[data-testid="decrease-font-size"]`, `[data-testid="increase-font-size"]`, `[data-testid="line-spacing"]` | `8px 16px` | `32px` |
| `BibleThemeSettingsContent` | 2 font buttons ("Inter", "Untitled Serif") | `8px 24px` | `32px` |
| `VerseOfTheDay` | share button (`aria-label="Share"`) | `0` | `32px` |
| `YouVersionAuthButton` | the sign-in button itself ("Sign in with YouVersion") | `0 16px` | `32px` |

### `button { border-radius: 0 !important }`

This rule reaches 65 of the 155 buttons, on all four corners. It causes 260 of
the 880 leaks.

The other 90 buttons compute to `0px` already. The rule matches them and changes
nothing. The 66 book accordion triggers in the chapter picker are most of that
group.

| Component | Element | Clean radius | Under the rule |
| --- | --- | --- | --- |
| `BibleChapterPicker` | 28 chapter number buttons | `4px` | `0px` |
| `BibleChapterPicker` | popover close button | `30px` | `0px` |
| `BibleVersionPicker` | all 18 buttons (version rows, tab triggers, close, language trigger) | `8px` | `0px` |
| `BibleReader` | 6 toolbar buttons | `30px` | `0px` |
| `VerseActionPopover` | 5 highlight swatches | fully round (`3.35544e+07px`) | `0px` |
| `VerseActionPopover` | Copy, Share | `30px` | `0px` |
| `BibleThemeSettingsContent` | 3 icon buttons | `8px` | `0px` |
| `VerseOfTheDay` | share button | `30px` | `0px` |
| `YouVersionAuthButton` | the sign-in button | `30px` | `0px` |

`BibleTextView` is not in this table. Its 11 footnote triggers are square
already, so only their padding changes.

## What a partner sees

A partner who ships `button { padding: 2rem !important }` in their global CSS
gets:

- A chapter picker with 66 book rows and 28 chapter tiles, each one 64px taller
  than designed, inside a popover sized for the original.
- Footnote markers in Bible text that are 64px squares instead of inline glyphs.
- A sign-in button and a Verse of the Day share button with square corners.

The components still render. They do not look like the components we designed.

## Why no light-DOM technique corrects this

The CSS cascade sorts `!important` author declarations above normal author
declarations, before it compares specificity
([CSS Cascade 5 §6.1](https://www.w3.org/TR/css-cascade-5/#cascade-sort)). The
`:is([data-yv-sdk], [data-yv-sdk] *)` gate raises SDK rules from 0,1,0 to 0,2,0
and above. That decides every comparison between normal declarations in our
favor, and it decides nothing here.

Three options exist, and two are worse than the leak:

1. **Mark every SDK declaration `!important`.** This wins here and loses the next
   time. It removes every legitimate escape hatch and makes our own internal
   overrides unreasonable. A consumer `!important` rule still ties and wins on
   source order, because their sheet loads after ours.
2. **Shadow DOM.** This closes the leak. A document stylesheet does not match
   inside a shadow tree at all, with or without `!important`. The costs are in
   ADR-0005 and they are large. Radix portals mount outside the root.
   `FocusScope`, `aria-hidden` and dismissable-layer all break at the boundary.
   React 19 `<style precedence>` hoisting into a shadow root is undocumented.
   Tailwind Labs state that v4 does not target shadow DOM, because v4 depends on
   `@property`.
3. **Treat the leak as out of contract.** A consumer who writes `!important`
   against SDK elements makes an explicit choice to override us.

## Recommendation

**Do not adopt shadow DOM.**

ADR-0005 fixed the condition before the harness produced a number: recommend
shadow DOM only if the residual includes rules that do not use `!important`. The
residual is 880 leaks, and all 880 come from two `!important` declarations. Every
group without `!important` reports zero.

The condition is not met, and the result is not close to it. Option 3 is the
answer, and `packages/ui/README.md` now states it to consumers in their own
language.

If a real partner reports a real break from a rule that does not use
`!important`, read this decision again. The harness measures that case. Add their rule to
`HOSTILE_GROUPS`, run the suite, and read the number.

## Keeping this report accurate

The `important` group is asserted, not only recorded. Each story reads the
rendered DOM. A component with a `<button>` must leak under that group, and a
component without a `<button>` must report zero. If the leak drops to zero and
the fixture did not change, the rule stopped matching and the measurement is
stale.

To produce the numbers in this file again, run the commands at the top of this
report. Then read the per-group counts that each story writes to the console.
