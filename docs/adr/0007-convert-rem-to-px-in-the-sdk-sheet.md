# 7. Convert every `rem` in the SDK sheet to `px`, and anchor the root font size

Date: 2026-08-07

## Status

Accepted. This decision extends
[ADR-0005](0005-scope-sdk-css-to-data-yv-sdk-subtrees.md) and
[ADR-0006](0006-layer-and-importantize-the-sdk-sheet.md). The
`:is([data-yv-sdk], [data-yv-sdk] *)` gate and the layered-important split are
both unchanged.

## Context

ADR-0006 closed the last cascade leak. The harness then reported zero leaks on
all fifteen components across all six consumer-CSS groups.

One channel was never measured, because it is not in the cascade.

A `rem` resolves against the **document root element**. A host page that writes
`html { font-size: 62.5% }` makes `1rem` equal `10px` for the whole document.
Tailwind v4 emits `rem` for nearly all spacing and typography, so every size the
SDK ships shrinks by 37.5 percent. No selector reaches that. No cascade layer
reaches it. `!important` does not reach it either. The leak is in the unit, not
in the cascade.

The 62.5 percent rule is not a hostile edge case. It is a common authoring
trick: it lets a developer write `1.6rem` and mean 16px.

### Measurement

A seventh harness group, `remRebase`, injects exactly `html { font-size: 62.5% }`
and nothing else.

The fixture is checked before the numbers are trusted. The harness injects into
`document.head`, so the story asserts
`getComputedStyle(document.documentElement).fontSize === '10px'`. It reads
`10px`, so the rule reaches the document root in the test environment.

Against the ADR-0006 sheet, the group leaked **2,098 computed-style
differences** across the fifteen stories:

| Story | Leaks | Story | Leaks |
| --- | --- | --- | --- |
| BibleChapterPicker | 1,044 | FootnoteContent | 35 |
| BibleVersionPicker | 408 | BibleVersionPickerLanguageTrigger | 20 |
| BibleReader | 119 | BibleTextView | 13 |
| BibleLanguagePickerContent | 117 | Textarea | 10 |
| VerseOfTheDay | 87 | ProfileAvatar | 4 |
| BibleCard | 69 | Separator | 2 |
| VerseActionPopover | 66 | | |
| BibleThemeSettingsContent | 62 | | |
| YouVersionAuthButton | 42 | | |

The other six groups stayed at zero, so this is a new channel and not a
regression of an old one.

### The alternative that was proposed, and what it measured

The handoff for this work suggested a different fix: declare an explicit
`font-size` on the `[data-yv-sdk]` root and stop there.

That was measured on its own, on a single throwaway story, before any code
changed:

| Sheet under test | Leaks |
| --- | --- |
| `remRebase` alone | 120 |
| `remRebase` + `[data-yv-sdk] { font-size: 16px }` | 110 |

It removes 10 of 120, or 8.3 percent. The reason is the one the specification
gives: a `rem` resolves against the document root element and never against an
ancestor. Declaring a font size on our own root cannot change what a `rem`
inside our sheet means.

What the 10 are is still worth knowing. They are `font-size` on five elements
and the `line-height` those five derive from it. Those elements had no
`font-size` of their own and inherited the consumer's `body` value.
`packages/core/src/styles/theme.css` declares `font-family`, `line-height`,
`color`, `letter-spacing` and the rest of the inherited text properties on the
SDK root — but not `font-size`.

So the alternative is not a rival to the rem rebase. It is the smaller half of
the same fix, and it addresses a second channel: inheritance. The two together
are the decision below.

## Decision

### 1. Convert every `rem` length in the sheet to `px` at 1rem = 16px

`packages/ui/scripts/scope-selectors.mjs` gains a pass between the selector gate
and the print:

```js
const ROOT_FONT_SIZE_PX = 16;

function rebaseLength(length) {
  if (length.unit !== 'rem') return undefined;
  return { unit: 'px', value: length.value * ROOT_FONT_SIZE_PX };
}
```

16, because that is the browser default. Every shipped size therefore keeps the
pixel value it had on an unmodified host page. Nothing looks different where
nothing was wrong.

**A Lightning CSS `Length` visitor, not a text pass.** A text replace of `rem`
would corrupt the sheet. `dist/tailwind.css` holds the string `rem` inside
escaped class names that Tailwind generates from arbitrary values —
`.yv\:text-\[0\.5rem\]`, `.yv\:w-\[11\.875rem\]`,
`.yv\:min-w-\[calc\(0\.25rem\*4\*2\+3ch\)\]` — and inside `.rem`, a real class
that `bible-reader.css` declares. Those are names, not lengths, and they are
correct as they are.

The `Length` visitor is also safe to use, unlike the `Declaration` visitor.
ADR-0006 records that Lightning CSS 1.31.1 cannot round-trip a declaration whose
value contains `var()`. `Length` is a different node type and does not hit that
bug. It was verified by hand on 1.31.1 to convert a `rem` in a declaration
value, a custom property value, a `calc()` operand, a `var()` fallback, a media
query condition, a `@keyframes` frame and a `max()` argument, while leaving
selectors untouched.

Four places deserve their reasoning written down:

- **Custom properties.** Converted. `--yv-radius: 2rem` becomes `32px`. Miss
  these and the rebase means little, because the theme ships its sizes as
  tokens and the utilities read them through `var()`.
- **`calc()` and `var()` fallbacks.** Converted. `calc(100vw - 2rem)` becomes
  `calc(100vw - 32px)`. A `rem` inside an expression resolves the same way a
  bare one does.
- **Media queries.** Converted, and safe for a *different* reason.
  [Media Queries Level 4 §1.3](https://www.w3.org/TR/mediaqueries-4/#units)
  resolves a relative unit in a query against the **initial** value of
  `font-size`, not the root element's computed value. A host
  `html { font-size: 62.5% }` therefore never moved our breakpoints. Converting
  `40rem` to `640px` is exact at browser defaults and changes nothing there. It
  is not exact for a reader who raised the browser's own default font size; see
  the trade-off below.
- **`@keyframes`.** Converted. A frame is a declaration list and a `rem` in it
  resolves like any other.

### 2. The SDK root declares its own font size

`packages/ui/src/styles/global.css` adds:

```css
[data-yv-sdk] {
  font-size: 16px;
}
```

This closes the inheritance channel that the rem rebase cannot see: an element
with no `font-size` of its own, inheriting the consumer's `body` value.

`font-size` is on `EXEMPT_PROPERTIES` (ADR-0006, family 5), so the declaration
stays unlayered and normal at 0,1,0. A consumer can still override it. That is
deliberate, and it is the accessibility escape hatch named below.

It goes in the UI package's `global.css` and not in
`packages/core/src/styles/theme.css`, which was out of scope for this change.
`global.css` compiles into the same sheet, so the effect is identical.

### 3. Inline `rem` in component source is converted too

An inline `style` never passes through `scope-selectors.mjs`, so the build
cannot reach it. Three literals existed and are now `px`:

- `verse.tsx`, the footnote verse-context block: `1.25rem` to `20px`.
- `YouVersionAuthButton.tsx`, twice, the rectangular variant:
  `--yv-radius: 0.65rem` to `10.4px`.

The first one is what the harness caught after the build fix landed:
FootnoteContent still leaked four values, at exactly 62.5 percent.

### 4. The build fails if a `rem` survives

`verifyOutput` re-parses its own output with a read-only `Length` visitor and
pushes a problem for every `rem` it still finds. This is the sixth check in that
function and it runs on every build.

The guard is symmetric with the rebase pass: both read the lengths the parser
produces, so no input makes it fire while the pass is in place. What it catches
is the pass being removed, reordered or broken by a Lightning CSS upgrade.

## Consequences

- **`remRebase` went from 2,098 leaks to 0**, on all fifteen components. The
  other six groups are unchanged at 0. The full run is 43 files, 548 tests, all
  passed.

- **The SDK no longer responds to a raised browser default font size.** This is
  a real accessibility cost and it is the point of the trade-off, not an
  oversight. A reader who sets their browser's default text size to "Large" used
  to see larger SDK text, because Tailwind's `rem` sizes tracked it. They no
  longer do.

  What still works:

  - **Browser zoom.** Ctrl-plus and Ctrl-minus scale `px` exactly as they scale
    `rem`. This is how most readers enlarge a page, and it is unaffected.
  - **A consumer override.** `[data-yv-sdk] { font-size: 1.25rem }` in the host
    sheet raises the root anchor, and it wins, because our declaration is
    unlayered and normal at 0,1,0. The sheet's own `px` sizes do not follow it,
    but text that inherits does.
  - **`--yv-*` tokens.** A consumer can raise any size token the theme exposes.
  - **Component props.** `BibleReader` and the reader components take a
    `fontSize` prop and honor it.

  This is the trade-off a browser-extension UI accepts to stay isolated from a
  page it does not control. We chose predictable rendering in every host over
  automatic response to one accessibility setting, and we kept an explicit
  opt-in for consumers who want the latter.

- **Breakpoints stop tracking the browser default too.** By the Media Queries
  Level 4 rule above, `40rem` was already immune to a host
  `html { font-size }`. It was *not* immune to the reader's own browser default,
  which is what "initial value" means. After the conversion, `640px` is fixed.
  A reader on a raised default now crosses our breakpoints at the same viewport
  width as everyone else.

- **`dist/tailwind.css` is 8 bytes smaller raw and 22 bytes larger gzipped**:
  128,093 to 128,085, and 14,639 to 14,661. `4px` and `.25rem` are the same
  length; the gzip difference is noise in the dictionary.

- **New `rem` can still enter through an inline style.** The build guard reads
  the sheet, and an inline `style` is not in it. Write `px` in a `style` prop.
  The harness is the backstop: a `rem` there shows up as a `remRebase` leak.

- **A reversal is one function and one rule.** Delete `rebaseLength` and its
  pass, delete the `Length` visitor in `verifyOutput`, and delete the
  `[data-yv-sdk] { font-size }` block. The `remRebase` harness group fails
  first, which is why it asserts rather than records.
