/**
 * Hostile-host fixture - adversarial global CSS a consuming app might ship.
 *
 * The SDK promises that a partner can drop Bible components into any app and get
 * the components we designed. This file is the adversary that proves it. Each
 * group is a separate `<style>` element so the residual-leak report can name
 * which class of consumer rule still bleeds through, rather than reporting one
 * undifferentiated blob.
 *
 * The groups come straight from the YPE-4113 acceptance criteria:
 *
 * | Group                 | What it models                                       |
 * | --------------------- | ---------------------------------------------------- |
 * | `preflight`           | A consumer running Tailwind v4 with Preflight on     |
 * | `bareElements`        | Hand-written element selectors (`button {}`, `p {}`)  |
 * | `aggressiveReset`     | A `*` reset                                          |
 * | `inheritedTypography` | Typography set on `body` and inherited downward      |
 * | `important`           | `!important` overrides - the unsupported tail        |
 *
 * Injection order matters. Every group is appended to `document.head` *after*
 * the SDK's `<style precedence="yv-sdk">` tag, so a source-order tie resolves
 * the way it would in a real consumer app: in the consumer's favour.
 */

/**
 * Tailwind v4 Preflight, as a consumer actually ships it.
 *
 * This is `tailwindcss@4.1.15`'s `preflight.css` after the Tailwind CLI has
 * resolved its build-time `--theme()` calls. The on-disk source is not usable
 * here: a browser drops `font-family: --theme(...)` as invalid, so injecting the
 * raw file would silently under-test the font-family channel.
 *
 * Regenerate with:
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
 * Bare element selectors - the leak the ticket names first. Specificity 0,0,1,
 * unlayered, and today that beats every `yv:`-prefixed SDK utility.
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
 * The universal reset. Two declarations only, both of which the SDK's own reset
 * also sets - so after the cascade fix this group must produce zero leaks.
 */
const AGGRESSIVE_RESET = `
* {
  box-sizing: content-box;
  margin: 0;
}
`;

/**
 * Typography on `body`. Nothing here matches an SDK element directly; every
 * value arrives by inheritance, which is why cascade rank cannot stop it. Each
 * property listed here is one the SDK currently declines to declare.
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
 * The residual tail. No light-DOM technique stops a consumer `!important` rule
 * that targets our elements, and the override policy treats it as out of
 * contract. Kept in the fixture so the residual report can measure it instead of
 * guessing at it.
 */
const IMPORTANT = `
button {
  border-radius: 0 !important;
  padding: 2rem !important;
}
`;

export const HOSTILE_GROUPS = {
  preflight: PREFLIGHT,
  bareElements: BARE_ELEMENTS,
  aggressiveReset: AGGRESSIVE_RESET,
  inheritedTypography: INHERITED_TYPOGRAPHY,
  important: IMPORTANT,
} satisfies Record<string, string>;

export type HostileGroup = keyof typeof HOSTILE_GROUPS;

/** Marks every `<style>` this module owns, so cleanup never touches the SDK's. */
export const HOSTILE_STYLE_ATTRIBUTE = 'data-yv-hostile-host';

export const ALL_HOSTILE_GROUPS = Object.keys(HOSTILE_GROUPS) as HostileGroup[];

/** Widens the `'all'` shorthand into the explicit group list. */
export function resolveHostileGroups(groups: HostileGroup[] | 'all'): HostileGroup[] {
  return groups === 'all' ? [...ALL_HOSTILE_GROUPS] : [...groups];
}

/**
 * Appends one `<style>` per group to `document.head`, after the SDK's tag.
 *
 * @returns a cleanup function that removes only the tags this call added.
 */
export function injectHostileCss(groups: HostileGroup[] | 'all'): () => void {
  const added: HTMLStyleElement[] = [];

  for (const group of resolveHostileGroups(groups)) {
    const style = document.createElement('style');
    style.setAttribute(HOSTILE_STYLE_ATTRIBUTE, group);
    style.textContent = HOSTILE_GROUPS[group];
    // appendChild, not prepend: the SDK's precedence-hoisted tag is already in
    // <head>, and a real consumer's sheet loads after it.
    document.head.appendChild(style);
    added.push(style);
  }

  return () => {
    for (const style of added) style.remove();
  };
}

/**
 * Removes every hostile `<style>` in the document, whoever added it. The
 * measurement harness needs a clean baseline it can trust, and a story that
 * unmounted mid-flight could otherwise leave a tag behind.
 */
export function removeHostileCss(): void {
  for (const style of document.querySelectorAll(`style[${HOSTILE_STYLE_ATTRIBUTE}]`)) {
    style.remove();
  }
}
