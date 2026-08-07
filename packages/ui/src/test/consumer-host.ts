/**
 * Consumer-host fixture: the global CSS that a consuming app can ship.
 *
 * The SDK promises that a partner can put Bible components into any app and get
 * the components we designed. This file is the test of that promise. Each group
 * is a separate `<style>` element. The residual-leak report can thus name the
 * class of consumer rule that still leaks, and not one undifferentiated block.
 *
 * The groups come from the YPE-4113 acceptance criteria:
 *
 * | Group                 | What it models                                       |
 * | --------------------- | ---------------------------------------------------- |
 * | `preflight`           | A consumer that runs Tailwind v4 with Preflight on   |
 * | `bareElements`        | Hand-written element selectors (`button {}`, `p {}`)  |
 * | `aggressiveReset`     | A `*` reset                                          |
 * | `inheritedTypography` | Typography set on `body` and inherited downward      |
 * | `important`           | `!important` overrides                               |
 * | `highSpecificity`     | An id selector, at 1,0,1                             |
 * | `remRebase`           | A root font-size that rescales every `rem`           |
 *
 * The injection order matters. Every group is appended to `document.head`
 * *after* the SDK's `<style precedence="yv-sdk">` tag. A tie on source order
 * thus resolves as it does in a real consumer app, in the consumer's favor.
 */

/**
 * Tailwind v4 Preflight, in the form that a consumer ships.
 *
 * This is the `preflight.css` of `tailwindcss@4.1.15`, after the Tailwind CLI
 * resolved its build-time `--theme()` calls. The source file on disk is not
 * usable here. A browser drops `font-family: --theme(...)` as invalid. The raw
 * file thus under-tests the font-family channel, and gives no warning.
 *
 * To generate the file again:
 *   echo '@import "tailwindcss/preflight.css";' > in.css
 *   npx tailwindcss -i in.css -o out.css
 */
const PREFLIGHT = `
*, ::after, ::before, ::backdrop, ::file-selector-button {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0 solid;
}
html, :host {
  line-height: 1.5;
  -webkit-text-size-adjust: 100%;
  tab-size: 4;
  font-family: ui-sans-serif, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  font-feature-settings: normal;
  font-variation-settings: normal;
  -webkit-tap-highlight-color: transparent;
}
hr {
  height: 0;
  color: inherit;
  border-top-width: 1px;
}
abbr:where([title]) {
  -webkit-text-decoration: underline dotted;
  text-decoration: underline dotted;
}
h1, h2, h3, h4, h5, h6 {
  font-size: inherit;
  font-weight: inherit;
}
a {
  color: inherit;
  -webkit-text-decoration: inherit;
  text-decoration: inherit;
}
b, strong {
  font-weight: bolder;
}
code, kbd, samp, pre {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-feature-settings: normal;
  font-variation-settings: normal;
  font-size: 1em;
}
small {
  font-size: 80%;
}
sub, sup {
  font-size: 75%;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
}
sub {
  bottom: -0.25em;
}
sup {
  top: -0.5em;
}
table {
  text-indent: 0;
  border-color: inherit;
  border-collapse: collapse;
}
:-moz-focusring {
  outline: auto;
}
progress {
  vertical-align: baseline;
}
summary {
  display: list-item;
}
ol, ul, menu {
  list-style: none;
}
img, svg, video, canvas, audio, iframe, embed, object {
  display: block;
  vertical-align: middle;
}
img, video {
  max-width: 100%;
  height: auto;
}
button, input, select, optgroup, textarea, ::file-selector-button {
  font: inherit;
  font-feature-settings: inherit;
  font-variation-settings: inherit;
  letter-spacing: inherit;
  color: inherit;
  border-radius: 0;
  background-color: transparent;
  opacity: 1;
}
:where(select:is([multiple], [size])) optgroup {
  font-weight: bolder;
}
:where(select:is([multiple], [size])) optgroup option {
  padding-inline-start: 20px;
}
::file-selector-button {
  margin-inline-end: 4px;
}
::placeholder {
  opacity: 1;
}
textarea {
  resize: vertical;
}
::-webkit-search-decoration {
  -webkit-appearance: none;
}
::-webkit-date-and-time-value {
  min-height: 1lh;
  text-align: inherit;
}
::-webkit-datetime-edit {
  display: inline-flex;
}
::-webkit-datetime-edit-fields-wrapper {
  padding: 0;
}
::-webkit-calendar-picker-indicator {
  line-height: 1;
}
:-moz-ui-invalid {
  box-shadow: none;
}
button, input:where([type='button'], [type='reset'], [type='submit']), ::file-selector-button {
  appearance: button;
}
::-webkit-inner-spin-button, ::-webkit-outer-spin-button {
  height: auto;
}
[hidden]:where(:not([hidden='until-found'])) {
  display: none !important;
}
`;

/**
 * Bare element selectors, the leak that the ticket names first. Specificity
 * 0,0,1, in no layer. Before the gate existed, these rules overrode every
 * `yv:`-prefixed SDK utility.
 */
const BARE_ELEMENTS = `
button, a, p, ul, input {
  padding: 1rem;
  margin: 0.75rem;
  color: #ff00ff;
  font-size: 9px;
  border-width: 3px;
  border-style: dashed;
  border-color: #00ffff;
  border-radius: 0;
}
ul {
  list-style-type: square;
}
a {
  text-decoration-line: underline;
}
`;

/**
 * The universal reset. It has two declarations, and the SDK's own reset sets
 * both of them. After the cascade fix, this group must produce zero leaks.
 */
const AGGRESSIVE_RESET = `
* {
  box-sizing: content-box;
  margin: 0;
}
`;

/**
 * Typography on `body`. Nothing here matches an SDK element directly. Every
 * value arrives by inheritance, which is why cascade order cannot stop it. Each
 * property here is one that the SDK did not declare before this change.
 */
const INHERITED_TYPOGRAPHY = `
body {
  font-family: 'Comic Sans MS', 'Chalkboard SE', cursive;
  color: #00ff00;
  line-height: 3;
  letter-spacing: 0.5em;
  word-spacing: 1em;
  text-align: right;
  text-transform: uppercase;
  text-indent: 2em;
  white-space: pre-wrap;
}
`;

/**
 * `!important`, unlayered. This group used to be the recorded residual.
 *
 * It is not one any more. The SDK sheet ships inside a declared `@layer yv`, and
 * every non-exempt declaration in it is important. CSS Cascade 5 §6.1 reverses
 * layer order for important declarations and ranks unlayered-important *last*,
 * so a layered important SDK rule beats this one. The group stays, because it is
 * the measurement that proves the claim.
 */
const IMPORTANT = `
button {
  border-radius: 0 !important;
  padding: 2rem !important;
}
`;

/**
 * The id that the `highSpecificity` group targets, placed on `document.body`.
 *
 * A story asserts that `#${CONSUMER_HOST_ROOT_ID} button` really matches a
 * rendered button before it asserts zero leaks. A zero-leak assertion against a
 * selector that matches nothing passes for the wrong reason, and would keep
 * passing after the isolation broke.
 *
 * The id sits on `document.body`, not on `#storybook-root`. Radix portals the
 * popovers and dialogs straight into `document.body`, and a fixture that cannot
 * reach the portalled DOM tests half of the components.
 */
export const CONSUMER_HOST_ROOT_ID = 'yv-consumer-host-root';

/**
 * An id selector, at 1,0,1. The gate only adds 0,1,0, so specificity alone loses
 * here. Importance is what wins, because the cascade compares importance before
 * specificity.
 */
const HIGH_SPECIFICITY = `
#${CONSUMER_HOST_ROOT_ID} button {
  padding: 1.5rem;
  margin: 1.25rem;
  border-radius: 0;
}
`;

/**
 * The "62.5% trick": a root font-size that rescales every `rem` in the document.
 *
 * This group attacks the unit, not the cascade. `rem` resolves against the
 * *document root* element, so no selector, no layer and no `!important` on an
 * SDK rule can change what a `rem` in that rule means. A host that writes
 * `html { font-size: 62.5% }` makes `1rem` equal `10px`, and every `rem` length
 * the SDK ships shrinks by 37.5 percent.
 *
 * The trick is common. It lets an author write `1.6rem` for 16px. Tailwind v4
 * emits `rem` for nearly all spacing and typography, so the SDK sheet was full
 * of the unit.
 *
 * The fix is in the build, not in this file:
 * `scripts/scope-selectors.mjs` converts every `rem` length in the compiled
 * sheet to `px` at 1rem = 16px. See
 * docs/adr/0007-convert-rem-to-px-in-the-sdk-sheet.md.
 */
const REM_REBASE = `
html {
  font-size: 62.5%;
}
`;

export const CONSUMER_CSS_GROUPS = {
  preflight: PREFLIGHT,
  bareElements: BARE_ELEMENTS,
  aggressiveReset: AGGRESSIVE_RESET,
  inheritedTypography: INHERITED_TYPOGRAPHY,
  important: IMPORTANT,
  highSpecificity: HIGH_SPECIFICITY,
  remRebase: REM_REBASE,
} satisfies Record<string, string>;

export type ConsumerCssGroup = keyof typeof CONSUMER_CSS_GROUPS;

/** Marks every `<style>` element this module owns, so cleanup never removes the SDK's. */
export const CONSUMER_HOST_STYLE_ATTRIBUTE = 'data-yv-consumer-host';

export const ALL_CONSUMER_CSS_GROUPS = Object.keys(CONSUMER_CSS_GROUPS) as ConsumerCssGroup[];

/** Expands the `'all'` value into the explicit group list. */
export function resolveConsumerCssGroups(groups: ConsumerCssGroup[] | 'all'): ConsumerCssGroup[] {
  return groups === 'all' ? [...ALL_CONSUMER_CSS_GROUPS] : [...groups];
}

/** The page's own body id, so the harness can hand it back. */
let previousBodyId: string | null = null;

/** Puts `CONSUMER_HOST_ROOT_ID` on `document.body`, so `highSpecificity` matches. */
function claimBodyId(): void {
  if (document.body.id === CONSUMER_HOST_ROOT_ID) return;
  previousBodyId = document.body.id;
  document.body.id = CONSUMER_HOST_ROOT_ID;
}

/** Hands the body id back. An id the harness did not set is left alone. */
function releaseBodyId(): void {
  if (document.body.id !== CONSUMER_HOST_ROOT_ID) return;
  document.body.id = previousBodyId ?? '';
  previousBodyId = null;
}

/**
 * Appends one `<style>` element per group to `document.head`, after the SDK tag.
 *
 * The id goes on `document.body` for every call, not only for the
 * `highSpecificity` group. An id on its own selects nothing and inherits
 * nothing, so it cannot move a measurement. Setting it unconditionally keeps the
 * DOM identical across the clean snapshot and every group snapshot, which is the
 * condition the diff depends on.
 *
 * @returns a cleanup function that removes only the tags that this call added.
 */
export function injectConsumerCss(groups: ConsumerCssGroup[] | 'all'): () => void {
  const added: HTMLStyleElement[] = [];
  claimBodyId();

  for (const group of resolveConsumerCssGroups(groups)) {
    const style = document.createElement('style');
    style.setAttribute(CONSUMER_HOST_STYLE_ATTRIBUTE, group);
    style.textContent = CONSUMER_CSS_GROUPS[group];
    // appendChild, not prepend. The precedence-hoisted SDK tag is in <head>
    // already, and a real consumer sheet loads after it.
    document.head.appendChild(style);
    added.push(style);
  }

  return () => {
    for (const style of added) style.remove();
  };
}

/**
 * Removes every consumer CSS `<style>` element in the document, whichever code
 * added it. The measurement harness needs a clean baseline it can trust, and a
 * story that unmounted during a run can leave a tag behind.
 *
 * The body id stays. `measureLeaks` calls this between groups, and a body id
 * that came and went would change the DOM under the diff.
 */
export function removeConsumerCss(): void {
  for (const style of document.querySelectorAll(`style[${CONSUMER_HOST_STYLE_ATTRIBUTE}]`)) {
    style.remove();
  }
}

/** Undoes everything `injectConsumerCss` did, including the body id. */
export function resetConsumerHost(): void {
  removeConsumerCss();
  releaseBodyId();
}
