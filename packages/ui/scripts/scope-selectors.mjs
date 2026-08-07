#!/usr/bin/env node
/**
 * Hardens the compiled SDK stylesheet in three ways.
 *
 * 0. It converts every `rem` length to `px` at 1rem = 16px.
 *
 *      padding: .25rem  →  padding: 4px
 *
 *    This one is not a cascade fix, because the leak it closes is not in the
 *    cascade. A `rem` resolves against the *document root* element, so a host
 *    page with `html { font-size: 62.5% }` shrinks every `rem` the SDK ships by
 *    37.5 percent. No selector, no layer and no `!important` can reach that. The
 *    unit has to go. See docs/adr/0007-convert-rem-to-px-in-the-sdk-sheet.md.
 *
 * 1. It adds a `[data-yv-sdk]` gate to every selector.
 *
 *      .yv\:mt-4  →  :is([data-yv-sdk], [data-yv-sdk] *).yv\:mt-4
 *
 *    The gate is the outbound guarantee. SDK CSS cannot match DOM that the SDK
 *    did not render. Inside an SDK subtree, `:is()` adds exactly 0,1,0, so our
 *    rules override bare element selectors.
 *
 * 2. It splits every rule in two, by property, and ships the halves differently.
 *
 *      @layer yv { … }   every property NOT in `EXEMPT_PROPERTIES`, `!important`
 *      (no layer)        every property in `EXEMPT_PROPERTIES`, normal
 *
 * The layer and the `!important` are one decision, not two. They only work
 * together.
 *
 *   - For a *normal* declaration, layer order runs low-to-high and unlayered
 *     author CSS ranks highest. A layered SDK rule thus loses to any consumer
 *     rule. That is why the SDK used to ship in no layer at all.
 *   - For an *important* declaration, CSS Cascade 5 §6.1 reverses the layer
 *     order, and unlayered-important ranks *last*. A layered important
 *     declaration therefore beats an unlayered important one, whatever the
 *     specificity on either side.
 *
 * So `@layer yv` plus `!important` beats a consumer's `button { padding: 2rem
 * !important }` and their `#app button { padding: 1rem }` alike, while the two
 * halves on their own each lose. Importance ranks above specificity, which is
 * why the high-specificity case falls out for free.
 *
 * The split is what the exemption list costs. An exempt declaration must stay
 * beatable by an inline style and by a running animation, so it cannot be
 * important — and a *normal* declaration inside `@layer yv` loses to ordinary
 * consumer CSS, which is strictly worse than shipping it in no layer. Measured:
 * putting the whole sheet in the layer leaked `font-size` and `border-*-width`
 * out of plain Tailwind Preflight, on 14 of the harness stories. The two halves
 * never compete with each other, because they hold disjoint property sets, so
 * splitting costs nothing in the SDK's own cascade.
 *
 * The one case this does not close: a consumer rule that is important *and*
 * sits in a layer they declared before `yv`. That is deliberate. A consumer who
 * writes that has opted into overriding us. An exempt property is the other
 * documented residual, and it is the price of a working popover. See
 * docs/style-isolation-residual-leak.md.
 *
 * The script uses Lightning CSS, not a regular expression and not
 * postcss-prefix-selector, for three reasons. Its `Selector` visitor is a typed
 * structural API, so it cannot corrupt an escaped class name such as
 * `.yv\:mt-4`. `@keyframes`, `@font-face` and `@property` produce no `Selector`
 * nodes and no `Rule.style` nodes, so the script skips them by construction
 * rather than by an exclusion list. It also flattens CSS nesting, which is what
 * makes the visitor safe: `bible-reader.css` and `@utility touch-hitbox` both
 * emit nested `&` rules, and a prefix on a nested selector corrupts it. We
 * rejected `postcss-prefix-selector@2.1.1`. It rewrites `:host` into
 * `[data-yv-sdk] :host`, which can never match, and thus removes every theme
 * variable without a warning.
 *
 * Usage:
 *   node scripts/scope-selectors.mjs [--minify] [--watch] [--in=PATH] [--out=PATH]
 *
 * See docs/adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md,
 * docs/adr/0006-layer-and-importantize-the-sdk-sheet.md,
 * docs/adr/0007-convert-rem-to-px-in-the-sdk-sheet.md and YPE-4113.
 */
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Features, transform } from 'lightningcss';

const SCOPE_ATTRIBUTE = 'data-yv-sdk';

/**
 * The cascade layer that holds the whole SDK sheet.
 *
 * The name is `yv`, not `yv-sdk-something`. It is one layer, not a set of them.
 * The earlier `yv-sdk-*` layers were sub-layers of a priority scheme that we
 * deleted, and `verify-styles.js` still asserts that no `@layer yv-sdk-` name
 * comes back.
 */
const LAYER_NAME = 'yv';

/**
 * Attributes that already limit a selector to SDK-rendered DOM.
 *
 * `bible-reader.css:1-2` matches `data-yv-sdk-bible-reader`, and nothing in the
 * repo sets it today. It stays a valid gate. It is a documented public hook for
 * non-React consumers who render Bible HTML themselves. A build failure for a
 * rule that is already safe helps nobody.
 */
const GATE_ATTRIBUTES = new Set([SCOPE_ATTRIBUTE, 'data-yv-sdk-bible-reader']);

/** `[data-slot='yv-bible-renderer']` is the attribute and value that `verse.tsx` stamps. */
const GATE_ATTRIBUTE_VALUES = new Map([['data-slot', 'yv-bible-renderer']]);

/**
 * Pseudo-classes whose argument list can carry the gate for the selector.
 *
 * `:not()` is absent, because a gate inside a negation is the opposite of a
 * gate. `:has()` is absent, because `.foo:has([data-yv-sdk])` matches consumer
 * DOM.
 */
const GATE_BEARING_PSEUDO_CLASSES = new Set(['is', 'where', 'any']);

/**
 * Selectors that keep no gate.
 *
 * `:root` and `:host` carry Tailwind's theme variables, and every one of those
 * variables has the `--yv-*` namespace. They declare nothing that renders and
 * cannot collide, so a gate adds risk and gives no measurable gain. Change this
 * in one case only: we need a strict guarantee that the SDK writes nothing at
 * the document root.
 */
const UNSCOPED_PSEUDO_CLASSES = new Set(['root', 'host']);

const ATTRIBUTE_OPERATORS = {
  equal: '=',
  includes: '~=',
  'dash-match': '|=',
  prefix: '^=',
  substring: '*=',
  suffix: '$=',
};

const COMBINATORS = {
  descendant: ' ',
  child: ' > ',
  'next-sibling': ' + ',
  'later-sibling': ' ~ ',
  deep: ' >>> ',
  'deep-descendant': ' /deep/ ',
};

/** A new `:is([data-yv-sdk], [data-yv-sdk] *)` node. */
function scopeGate() {
  const attribute = { type: 'attribute', namespace: null, name: SCOPE_ATTRIBUTE, operation: null };

  return {
    type: 'pseudo-class',
    kind: 'is',
    selectors: [
      [attribute],
      [attribute, { type: 'combinator', value: 'descendant' }, { type: 'universal' }],
    ],
  };
}

function isGateAttribute(component) {
  if (GATE_ATTRIBUTES.has(component.name)) return true;

  const required = GATE_ATTRIBUTE_VALUES.get(component.name);
  return (
    required !== undefined &&
    component.operation?.operator === 'equal' &&
    component.operation.value === required
  );
}

/** True when the selector cannot match outside an SDK-rendered subtree. */
function hasScopeGate(components) {
  return components.some((component) => {
    if (component.type === 'attribute') return isGateAttribute(component);

    if (
      component.type === 'pseudo-class' &&
      GATE_BEARING_PSEUDO_CLASSES.has(component.kind) &&
      Array.isArray(component.selectors) &&
      component.selectors.length > 0
    ) {
      // Every branch, not some branches. `:is([data-yv-sdk], .card)` still
      // reaches consumer DOM through its second branch.
      return component.selectors.every(hasScopeGate);
    }

    return false;
  });
}

function isUnscopedByDesign(components) {
  return (
    components.length === 1 &&
    components[0].type === 'pseudo-class' &&
    UNSCOPED_PSEUDO_CLASSES.has(components[0].kind)
  );
}

function isAllowed(components) {
  return hasScopeGate(components) || isUnscopedByDesign(components);
}

/**
 * Puts the gate into the first compound of the selector.
 *
 * The gate goes at position 0, unless a type or universal selector is there
 * already. `:is(…)a` is invalid CSS, and `a:is(…)` is valid. A gate on the first
 * compound is enough for the whole selector. Anything that the rest of the
 * selector matches is a descendant of an element inside the SDK subtree.
 */
function gateSelector(components) {
  if (isAllowed(components)) return components;

  const first = components[0];
  const index = first && (first.type === 'type' || first.type === 'universal') ? 1 : 0;

  return [...components.slice(0, index), scopeGate(), ...components.slice(index)];
}

function formatComponent(component) {
  switch (component.type) {
    case 'universal':
      return '*';
    case 'type':
      return component.name;
    case 'class':
      return `.${component.name}`;
    case 'id':
      return `#${component.name}`;
    case 'nesting':
      return '&';
    case 'combinator':
      return COMBINATORS[component.value] ?? ' ';
    case 'attribute': {
      if (!component.operation) return `[${component.name}]`;
      const operator = ATTRIBUTE_OPERATORS[component.operation.operator] ?? '=';
      return `[${component.name}${operator}'${component.operation.value}']`;
    }
    case 'pseudo-class':
      return Array.isArray(component.selectors)
        ? `:${component.kind}(${component.selectors.map(formatSelector).join(', ')})`
        : `:${component.kind}`;
    case 'pseudo-element':
      return `::${component.kind}`;
    default:
      return `<${component.type}>`;
  }
}

/** Approximate selector text, used only in the build-failure message. */
function formatSelector(components) {
  return components.map(formatComponent).join('');
}

/* -------------------------------------------------------------------------- */
/* Root font size                                                              */
/* -------------------------------------------------------------------------- */

/**
 * The pixel value that one `rem` becomes.
 *
 * 16 is the initial value of `font-size`, which is what `medium` computes to in
 * every major browser at its default settings. It is therefore the value a
 * `rem` already had for a host that never touched the root font size, so the
 * conversion changes nothing for that host. It only removes the SDK's response
 * to a host that did touch it.
 */
const ROOT_FONT_SIZE_PX = 16;

/**
 * Rewrites one `rem` length as the `px` length it means at a 16px root.
 *
 * Lightning CSS calls this for every length in the sheet, and only for lengths.
 * A selector is never a length, so `.yv\:text-\[0\.5rem\]` and the `.rem` class
 * in `bible-reader.css` are untouched. That is the whole reason this pass uses a
 * visitor and not a text pass: the string `rem` appears in both.
 *
 * The `Length` visitor is not affected by the `var()` round-trip bug that forces
 * `splitByImportance` into text surgery. That bug is in the `Declaration`
 * visitor. A length inside `var(--x, 0 0 1rem #000)` converts correctly, and so
 * does a length inside `calc()`, inside a `@keyframes` body, inside a `--yv-*`
 * custom property and inside a media query condition.
 *
 * Four places deserve their own note:
 *
 *   - **Custom properties.** `--yv-spacing: .25rem` becomes `4px`. This is where
 *     most of the win is. Tailwind writes almost every spacing utility as
 *     `calc(var(--yv-spacing) * 4)`, so one token carries hundreds of rules.
 *   - **`calc()` and `var()` fallbacks.** Converted in place. A `calc()` that
 *     mixes units, such as `calc(100vw - 2rem)`, keeps its shape and loses only
 *     the `rem` term.
 *   - **Media query conditions.** A `rem` in a media query never tracked the root
 *     element to begin with. Media Queries 4 §1.3 says relative units in a query
 *     resolve against the *initial* value of `font-size`, so that a declaration
 *     can never change which query matches. Converting at 16px is therefore
 *     exact for a reader on browser defaults. It is not exact for a reader who
 *     raised the browser's default font size, whose breakpoints stop moving with
 *     it. ADR-0007 records that.
 *   - **`@keyframes`.** Converted like any other declaration. A frame is not a
 *     cascaded declaration, so nothing here interacts with the exemption list.
 *
 * @param {{ unit: string, value: number }} length
 * @returns {{ unit: string, value: number } | undefined} The replacement, or
 *   `undefined` to keep the length as it is.
 */
function rebaseLength(length) {
  if (length.unit !== 'rem') return undefined;
  return { unit: 'px', value: length.value * ROOT_FONT_SIZE_PX };
}

/* -------------------------------------------------------------------------- */
/* Importance                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The properties that stay *normal* when everything else becomes `!important`.
 *
 * Blanket importantization is wrong, and the reason is the cascade order itself.
 * An author `!important` declaration outranks both the inline `style` attribute
 * and the CSS animation origin. So an important declaration of a property that
 * something else drives at runtime does not "win an argument". It removes the
 * runtime behaviour.
 *
 * Every entry below is a property that something outside this stylesheet must
 * be able to set. Each family says who sets it and what breaks without the
 * exemption. Nothing goes on this list because it "feels risky".
 *
 * Two rules keep the list honest:
 *
 *   - A shorthand is exempt when any of its longhands is exempt. See
 *     `EXEMPT_SHORTHAND_PROPERTIES`.
 *   - The verification pass fails the build when a `@keyframes` in this sheet
 *     animates a property that is not on this list. The list cannot silently
 *     fall behind the animations.
 */
const EXEMPT_PROPERTIES = new Set([
  /*
   * 1. Animated by a `@keyframes` inside this sheet.
   *
   * An important cascaded declaration outranks the animation origin, so an
   * important `opacity` freezes every fade at its declared value. These four
   * are the properties that `tw-animate-css` and our own keyframes animate:
   * spin and pulse (`transform`, `opacity`), the Radix enter/exit set
   * (`opacity`, `transform`, `filter`), accordion-down/up (`height`).
   */
  'opacity',
  'transform',
  'height',
  'filter',

  /*
   * 2. Composes with `transform` at runtime.
   *
   * `translate`, `scale` and `rotate` are independent transform properties, and
   * `transform-origin` and friends change what a transform means. Importantizing
   * half of the transform pipeline while the animated half stays normal produces
   * a transform that is right in neither state.
   */
  'translate',
  'scale',
  'rotate',
  'transform-origin',
  'transform-style',
  'transform-box',
  'perspective',
  'perspective-origin',
  'backface-visibility',
  'will-change',

  /*
   * 3. Drives an animation or a transition.
   *
   * Radix `Presence` writes `animation-fill-mode` inline to hold an exit frame
   * while it measures. An important `animation-fill-mode` unmounts the element
   * mid-exit. The rest of the family is here for the same reason: these
   * properties are the controls, and a control that cannot be changed is not a
   * control.
   */
  'animation',
  'animation-name',
  'animation-duration',
  'animation-timing-function',
  'animation-delay',
  'animation-iteration-count',
  'animation-direction',
  'animation-fill-mode',
  'animation-play-state',
  'animation-composition',
  'animation-timeline',
  'animation-range',
  'animation-range-start',
  'animation-range-end',
  'transition',
  'transition-property',
  'transition-duration',
  'transition-timing-function',
  'transition-delay',
  'transition-behavior',

  /*
   * 4. Written as an inline style by Radix or floating-ui.
   *
   * The Radix Popper wrapper positions poppers and dialogs with an inline
   * `style`: `position`, `left`, `top`, `transform`, `will-change`, `min-width`,
   * `z-index`, `visibility`. `DismissableLayer` and the Dialog overlay write
   * `pointer-events`. An important declaration of any of these pins the popover
   * to wherever our utility class put it, which is the top-left corner of the
   * viewport.
   */
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'inset',
  'inset-block',
  'inset-block-start',
  'inset-block-end',
  'inset-inline',
  'inset-inline-start',
  'inset-inline-end',
  'z-index',
  'min-width',
  'visibility',
  'pointer-events',

  /*
   * 5. Written as an inline style by an SDK component.
   *
   * Tailwind Preflight and `theme.css` are compiled *into* this sheet, and both
   * declare `background-color` and `border-*` on bare elements. Importantizing
   * them makes this sheet beat our own components:
   *
   *   - `font-size`: verse.tsx, bible-reader.tsx, bible-version-picker.tsx
   *   - `background-color` and `border`: the highlight swatch in
   *     verse-action-popover.tsx
   *   - `border-color` and `border-width`: YouVersionAuthButton
   *   - `height`: animated-height.tsx (already exempt under family 1)
   */
  'font-size',
  'background-color',
  'border-width',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-block-start-width',
  'border-block-end-width',
  'border-inline-start-width',
  'border-inline-end-width',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-block-start-color',
  'border-block-end-color',
  'border-inline-start-color',
  'border-inline-end-color',
  'border-style',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-block-start-style',
  'border-block-end-style',
  'border-inline-start-style',
  'border-inline-end-style',
]);

/**
 * Shorthands that hold at least one exempt longhand.
 *
 * `font: inherit !important` would freeze `font-size`, which an SDK component
 * sets inline. The comment on each entry names the exempt longhand that puts it
 * here. `inset`, `transition` and `animation` are shorthands too, and they are
 * already in `EXEMPT_PROPERTIES` because every one of their longhands is exempt.
 */
const EXEMPT_SHORTHAND_PROPERTIES = new Set([
  'font', // font-size
  'background', // background-color

  /*
   * `border` reaches this sheet as Preflight's `border: 0 solid` on every
   * element. Important, it erases the highlight swatch's inline
   * `border: 1px solid rgba(…)` in verse-action-popover.tsx, and the inline
   * `borderColor` / `borderWidth` on YouVersionAuthButton.
   */
  'border',
  'border-top', // border-top-width / -color / -style
  'border-right',
  'border-bottom',
  'border-left',
  'border-block',
  'border-block-start',
  'border-block-end',
  'border-inline',
  'border-inline-start',
  'border-inline-end',
  'all', // every longhand, exempt ones included
]);

const VENDOR_PREFIX = /^-(?:webkit|moz|ms|o|khtml|epub)-/;

/**
 * The property name a Lightning CSS declaration node carries.
 *
 * Three shapes exist. A known property is `{ property: 'color' }`. A property
 * whose value holds a `var()` is `{ property: 'unparsed', value: { propertyId }
 * }`. A custom property is `{ property: 'custom', value: { name } }`.
 */
function declarationProperty(declaration) {
  if (declaration.property === 'custom') {
    return typeof declaration.value?.name === 'string' ? declaration.value.name : 'custom';
  }

  if (declaration.property === 'unparsed') {
    const propertyId = declaration.value?.propertyId;
    if (!propertyId) return 'unparsed';
    return propertyId.property === 'custom' && typeof propertyId.name === 'string'
      ? propertyId.name
      : propertyId.property;
  }

  return declaration.property;
}

/**
 * True when the declaration must stay normal.
 *
 * Custom properties are exempt as a family. Two reasons, and either is enough.
 * `--yv-*` tokens are the supported customization API, and an important token
 * cannot be overridden by the consumer, which is the whole point of a token.
 * Tailwind writes `--tw-*` fallbacks into its own `@layer properties` block, and
 * that block is a *lower*-priority fallback for the same names. Importantizing
 * both sides reverses which one wins, because layer order reverses for
 * important declarations.
 */
function isExemptProperty(property) {
  if (property.startsWith('--')) return true;

  const name = property.replace(VENDOR_PREFIX, '');
  return EXEMPT_PROPERTIES.has(name) || EXEMPT_SHORTHAND_PROPERTIES.has(name);
}

/**
 * At-rules whose block holds descriptors, not declarations.
 *
 * `!important` is invalid in every one of these, and a browser drops the whole
 * descriptor when it sees one. Inside `@keyframes` that is the worst case: the
 * frame silently stops animating the property. The walk does not descend into
 * these blocks at all.
 */
const DESCRIPTOR_AT_RULES = new Set([
  'keyframes',
  '-webkit-keyframes',
  '-moz-keyframes',
  'font-face',
  'property',
  'counter-style',
  'font-palette-values',
  'font-feature-values',
  'view-transition',
  'position-try',
  'color-profile',
  'page',
  'viewport',
]);

/**
 * At-rules whose block holds whatever its parent's block held.
 *
 * `@media`, `@supports` and friends are conditions around content. At the top
 * level their content is rules; inside a style rule it is declarations. The walk
 * therefore carries the parent's context through them unchanged.
 */
const CONDITIONAL_AT_RULES = new Set([
  'media',
  'supports',
  'container',
  'layer',
  'scope',
  'starting-style',
  'document',
]);

/** Matches a declaration that is already important. */
const ALREADY_IMPORTANT = /!\s*important\s*$/i;

/**
 * Splits `code` into the half that goes in `@layer yv` and the half that does
 * not, marking the first half `!important`.
 *
 * Every non-exempt declaration goes to `layered` and gains `!important`. Every
 * exempt declaration goes to `unlayered` unchanged. A rule that holds both kinds
 * is emitted twice, once in each half, under the same selector. Descriptor
 * at-rules — `@keyframes`, `@font-face`, `@property` — go to `unlayered` whole:
 * they declare no cascading declarations, and `!important` is invalid in them.
 *
 * This is text surgery, and it is deliberate. Lightning CSS 1.31.1 cannot
 * round-trip a declaration through its JS visitor API once the value holds a
 * `var()`: returning the node throws `failed to deserialize; expected an
 * object-like struct named Specifier`. Mutating the node in place is ignored.
 * `Declaration` and `DeclarationExit` fail the same way. Nearly every rule in
 * this sheet reads a `--yv-*` or `--tw-*` token, so the visitor route covers
 * almost nothing of what has to be covered.
 *
 * What makes the surgery safe is not the walk below. It is `verifyOutput`, which
 * parses the result and fails the build when any non-exempt declaration is still
 * normal, when an exempt one became important, or when the text no longer parses
 * at all. A walk that mis-read the sheet cannot ship.
 *
 * @param {string} code Printed CSS.
 * @param {boolean} minify Whether the printed CSS is minified.
 * @returns {{ layered: string, unlayered: string, exemptAlreadyImportant: Set<string> }}
 *   The two halves, and the exempt properties that were already important on the
 *   way in. `verifyOutput` needs the third value to tell "the source shipped
 *   this" from "the walk importantized something it must not have".
 */
function splitByImportance(code, minify) {
  const exemptAlreadyImportant = new Set();
  const suffix = minify ? '!important' : ' !important';

  /** Routes one declaration to a half, keeping its surrounding whitespace. */
  function routeDeclaration(statement, halves) {
    const [, before, text, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(statement);
    if (text === '') return;

    const colon = text.indexOf(':');
    if (colon === -1) {
      halves.unlayered += statement + ';';
      return;
    }

    const property = text.slice(0, colon).trim().toLowerCase();
    const exempt = isExemptProperty(property);

    if (ALREADY_IMPORTANT.test(text)) {
      if (exempt) exemptAlreadyImportant.add(property);
      // An `!important` the author wrote. It keeps whichever half its property
      // belongs to, so `yv:h-6!` stays as important and unlayered as it was.
      halves[exempt ? 'unlayered' : 'layered'] += statement + ';';
      return;
    }

    if (exempt) halves.unlayered += statement + ';';
    else halves.layered += `${before}${text}${suffix}${after};`;
  }

  /** Splits one `prelude { body }` rule into its two halves. */
  function splitRule(prelude, body, declarationContext) {
    const at = /^@([\w-]+)/.exec(prelude.trim());
    const name = at?.[1].toLowerCase();

    if (name && DESCRIPTOR_AT_RULES.has(name)) return { layered: '', unlayered: body };
    if (name && CONDITIONAL_AT_RULES.has(name)) return walk(body, declarationContext);
    return walk(body, name ? declarationContext : true);
  }

  /**
   * Splits the contents of one block.
   *
   * `declarationContext` says what a `;`-terminated statement is here. Inside a
   * style rule it is a declaration. At the top level, or inside `@media` at the
   * top level, it is an at-statement such as `@import` or `@layer yv;`. Those go
   * to `unlayered` untouched, where `assembleSheet` lifts them back to the top.
   */
  function walk(body, declarationContext) {
    const halves = { layered: '', unlayered: '' };
    let start = 0;
    let parens = 0;

    const flush = (statement) => {
      if (declarationContext) routeDeclaration(statement, halves);
      else if (statement.trim() !== '') halves.unlayered += statement + ';';
    };

    for (let index = 0; index < body.length; index += 1) {
      const character = body[index];

      if (character === '/' && body[index + 1] === '*') {
        const end = body.indexOf('*/', index + 2);
        index = end === -1 ? body.length : end + 1;
        continue;
      }
      if (character === '"' || character === "'") {
        index = skipString(body, index);
        continue;
      }
      if (character === '\\') {
        index += 1;
        continue;
      }
      if (character === '(') {
        parens += 1;
        continue;
      }
      if (character === ')') {
        parens -= 1;
        continue;
      }
      if (parens > 0) continue;

      if (character === ';') {
        flush(body.slice(start, index));
        start = index + 1;
        continue;
      }
      if (character === '{') {
        const close = findBlockEnd(body, index);
        const prelude = body.slice(start, index);
        const inner = splitRule(prelude, body.slice(index + 1, close), declarationContext);

        // An empty half means this rule had nothing of that kind. Emitting the
        // wrapper anyway would ship an empty rule for most of the sheet.
        for (const half of ['layered', 'unlayered']) {
          if (inner[half].trim() === '') continue;
          // The pretty-printed path loses the newline that used to sit before
          // the closing brace, because it belonged to the dropped `;`.
          const tail = minify || inner[half].endsWith('\n') ? '' : '\n';
          halves[half] += `${prelude}{${inner[half]}${tail}}`;
        }

        index = close;
        start = index + 1;
      }
    }

    flush(body.slice(start));

    // A block's last declaration needs no `;`, and the minifier drops it. We
    // append one after every declaration and drop the last again here, rather
    // than look ahead to find out which declaration ends up last in its half.
    if (minify && declarationContext) {
      for (const half of ['layered', 'unlayered']) {
        if (halves[half].endsWith(';')) halves[half] = halves[half].slice(0, -1);
      }
    }

    return halves;
  }

  return { ...walk(code, false), exemptAlreadyImportant };
}

/** The index of the `}` that closes the `{` at `open`. */
function findBlockEnd(code, open) {
  let depth = 0;

  for (let index = open; index < code.length; index += 1) {
    const character = code[index];

    if (character === '/' && code[index + 1] === '*') {
      const end = code.indexOf('*/', index + 2);
      index = end === -1 ? code.length : end + 1;
      continue;
    }
    if (character === '"' || character === "'") {
      index = skipString(code, index);
      continue;
    }
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return code.length;
}

/* -------------------------------------------------------------------------- */
/* Layer wrapper                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Splits `code` into the at-statements that must stay at the top, and the rest.
 *
 * `@charset` has to be the very first byte of the file. `@import` has to precede
 * every rule, and `@layer <name>;` is one of the two things allowed before it.
 * The output order is therefore charset, `@layer yv;`, imports, then the block.
 */
function splitLeadingStatements(code) {
  let cursor = 0;

  const consumeWhitespace = () => {
    while (cursor < code.length && /\s/.test(code[cursor])) cursor += 1;
  };

  if (/^@charset\b/i.test(code)) {
    const end = findStatementEnd(code, 0);
    if (end !== -1) {
      cursor = end + 1;
      consumeWhitespace();
    }
  }

  const charset = code.slice(0, cursor);
  const headStart = cursor;

  for (;;) {
    consumeWhitespace();

    if (code.startsWith('/*', cursor)) {
      const end = code.indexOf('*/', cursor + 2);
      cursor = end === -1 ? code.length : end + 2;
      continue;
    }
    if (!/^@import\b/i.test(code.slice(cursor, cursor + 8))) break;

    const end = findStatementEnd(code, cursor);
    if (end === -1) break;
    cursor = end + 1;
  }

  return { charset, head: code.slice(headStart, cursor), body: code.slice(cursor) };
}

/**
 * The index of the `;` that ends the statement starting at `start`, or -1.
 *
 * This has to skip strings, and that is not a detail. The sheet's one `@import`
 * is a Google Fonts URL, and `family=Inter:wght@400;700` puts a semicolon inside
 * the quoted URL. A regex that stops at the first `;` cuts the statement in half
 * and produces CSS that no longer parses.
 */
function findStatementEnd(code, start) {
  for (let index = start; index < code.length; index += 1) {
    const character = code[index];

    if (character === '/' && code[index + 1] === '*') {
      const end = code.indexOf('*/', index + 2);
      index = end === -1 ? code.length : end + 1;
      continue;
    }
    if (character === '"' || character === "'") {
      index = skipString(code, index);
      continue;
    }
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (character === ';') return index;
    if (character === '{') return -1;
  }

  return -1;
}

/**
 * Joins the two halves into the sheet that ships.
 *
 * The order is `@charset`, `@layer yv;`, the `@import`s, the unlayered half,
 * then the `@layer yv { … }` block. The first three are where the parser
 * requires them: `@charset` is the first byte, `@import` precedes every rule,
 * and a bare `@layer <name>;` is one of the two things allowed before an
 * `@import`. Declaring `yv` there, rather than letting the block declare it,
 * puts the sheet's layer on the first line where a reader looks for it.
 *
 * The two halves' relative order carries no meaning. They hold disjoint property
 * sets, so no declaration in one ever competes with a declaration in the other.
 *
 * Tailwind emits an `@layer properties` block of its own, for the `@property`
 * fallback, whatever our directives say. Its contents are all `--tw-*` custom
 * properties, which are exempt, so the whole block lands in the unlayered half
 * and keeps the shape Tailwind shipped: a lower-priority fallback for the same
 * names, in the same place in the cascade it has today.
 *
 * This runs after the last Lightning CSS print, and it has to. Lightning CSS
 * treats the leading `@layer yv;` as redundant next to a block that declares the
 * same name and prints only the block. `verifyOutput` parses the result, so an
 * assembly that produced invalid CSS fails the build rather than shipping.
 */
function assembleSheet(layered, unlayered, minify) {
  const { charset, head, body } = splitLeadingStatements(unlayered);

  const open = minify ? '{' : ' {\n';
  const close = minify ? '}' : '\n}\n';
  const gap = minify ? '' : '\n';
  const layer =
    layered.trim() === '' ? '' : `@layer ${LAYER_NAME}${open}${layered}${close}${gap}`;

  return `${charset}@layer ${LAYER_NAME};${gap}${head}${body}${gap}${layer}`;
}

/** Advances past a quoted string that starts at `index`. */
function skipString(code, index) {
  const quote = code[index];

  for (let cursor = index + 1; cursor < code.length; cursor += 1) {
    if (code[cursor] === '\\') {
      cursor += 1;
      continue;
    }
    if (code[cursor] === quote) return cursor;
  }

  return code.length;
}

/**
 * The `{ … }` blocks at nesting depth zero, with the prelude that introduces
 * each one. Comments, strings and escapes are skipped, so a `}` inside
 * `content: "}"` or an escaped class name cannot shift the depth.
 */
function findTopLevelBlocks(code) {
  const blocks = [];
  let depth = 0;
  let preludeStart = 0;

  for (let index = 0; index < code.length; index += 1) {
    const character = code[index];

    if (character === '/' && code[index + 1] === '*') {
      const end = code.indexOf('*/', index + 2);
      index = end === -1 ? code.length : end + 1;
      continue;
    }
    if (character === '"' || character === "'") {
      index = skipString(code, index);
      continue;
    }
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (character === '{') {
      if (depth === 0) blocks.push({ prelude: code.slice(preludeStart, index).trim(), open: index });
      depth += 1;
      continue;
    }
    if (character === '}') {
      depth -= 1;
      if (depth === 0 && blocks.length > 0) {
        blocks[blocks.length - 1].close = index;
        // The next block's prelude starts here, not at the last `;`. Without
        // this, the block after a block reads its prelude as `}@layer yv`.
        preludeStart = index + 1;
      }
      continue;
    }
    if (character === ';' && depth === 0) preludeStart = index + 1;
  }

  return blocks;
}

/**
 * Structural check on the layer.
 *
 * The sheet must declare `yv` first, hold exactly one `@layer yv` block, and end
 * with it. One block, because a second one would let the two halves of a split
 * rule interleave in a way the assembler never intended. Last, because that is
 * where the assembler puts it, and a rule that drifted out of the block is a
 * rule whose `!important` no longer has a layer behind it.
 */
function findLayerProblems(code) {
  const problems = [];

  if (!new RegExp(`^\\s*(?:@charset\\b[^;]*;\\s*)?@layer\\s+${LAYER_NAME}\\s*;`).test(code)) {
    problems.push(`the output does not open with \`@layer ${LAYER_NAME};\``);
  }

  const blocks = findTopLevelBlocks(code);
  const wrappers = blocks.filter((block) => block.prelude === `@layer ${LAYER_NAME}`);

  // Zero is legal, and only for a sheet whose every declaration is exempt. The
  // `unimportant` check is what catches a layered half that went empty by
  // mistake: it fires on the first non-exempt declaration left normal.
  if (wrappers.length > 1) {
    problems.push(
      `the output has ${String(wrappers.length)} \`@layer ${LAYER_NAME}\` blocks; ` +
        `it must have at most one`,
    );
    return problems;
  }
  if (wrappers.length === 0) return problems;

  const [wrapper] = wrappers;

  if (wrapper !== blocks[blocks.length - 1]) {
    problems.push(`the \`@layer ${LAYER_NAME}\` block is not the last block in the sheet`);
  }
  if (wrapper.close === undefined || code.slice(wrapper.close + 1).trim() !== '') {
    problems.push(`the output has content after the \`@layer ${LAYER_NAME}\` block`);
  }

  return problems;
}

/* -------------------------------------------------------------------------- */
/* Verification                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Parses the rewritten CSS again and reports everything that must not ship.
 *
 * This is the real guarantee. A string search proves that the script ran. Only
 * a second parse proves that the script left nothing behind. The build has no
 * browser, so these six checks stand in for what a person would otherwise have
 * to look for by hand:
 *
 *   1. Every selector carries the gate.
 *   2. Every non-exempt declaration is important, so no ordinary consumer rule
 *      outranks it.
 *   3. No exempt declaration is important, so nothing froze an animation or
 *      pinned a popover. This is the check that makes the text pass in
 *      `importantizeCss` safe.
 *   4. No `@keyframes` body holds `!important`, where it is invalid CSS.
 *   5. The whole sheet sits inside one `@layer yv` block.
 *   6. No `rem` length survives anywhere, so the host's root font size cannot
 *      rescale the sheet.
 *
 * A `@keyframes` that animates a property missing from `EXEMPT_PROPERTIES` is a
 * seventh failure, and it is the one that keeps the list from falling behind.
 *
 * Check 6 reads every length the parser produces, which covers a declaration
 * value, a custom property value, a `calc()` operand, a `var()` fallback, a
 * media query condition and a `@keyframes` frame. It does not read the string
 * `rem` inside a selector, and it must not: `.yv\:text-\[0\.5rem\]` is a class
 * name, and `.rem` is a class `bible-reader.css` declares. Both are names, not
 * lengths, and both are correct as they are.
 *
 * @returns {{ ungated: string[], problems: string[] }}
 */
function verifyOutput(code, filename, exemptAlreadyImportant = new Set()) {
  const ungated = [];
  const unimportant = new Set();
  const wronglyImportant = new Set();
  const importantKeyframes = new Set();
  const unexemptAnimated = new Set();
  const survivingRem = new Set();

  // A throw here is the point: it means the layer wrap produced CSS that no
  // longer parses, and that must never reach `dist/`.
  transform({
    filename,
    code: Buffer.from(code),
    minify: false,
    visitor: {
      Selector(components) {
        if (!isAllowed(components)) ungated.push(formatSelector(components));
      },
      Length(length) {
        // Read only. The rebase already happened in pass 3; this walk exists to
        // catch the length that pass missed.
        if (length.unit === 'rem') survivingRem.add(`${String(length.value)}rem`);
        return undefined;
      },
      Rule: {
        style(rule) {
          for (const declaration of rule.value?.declarations?.declarations ?? []) {
            const property = declarationProperty(declaration);
            if (!isExemptProperty(property)) unimportant.add(property);
          }
          // The other direction. An important declaration of an exempt property
          // is exactly the failure the exemption list exists to prevent, so a
          // walk that over-applied must fail the build too.
          for (const declaration of rule.value?.declarations?.importantDeclarations ?? []) {
            const property = declarationProperty(declaration);
            if (isExemptProperty(property) && !exemptAlreadyImportant.has(property)) {
              wronglyImportant.add(property);
            }
          }
          return undefined;
        },
        keyframes(rule) {
          for (const frame of rule.value?.keyframes ?? []) {
            // `!important` inside a @keyframes body is invalid CSS. The browser
            // drops the whole declaration, so the frame silently stops
            // animating that property.
            for (const declaration of frame.declarations?.importantDeclarations ?? []) {
              importantKeyframes.add(declarationProperty(declaration));
            }
            for (const declaration of frame.declarations?.declarations ?? []) {
              const property = declarationProperty(declaration);
              if (!isExemptProperty(property)) unexemptAnimated.add(property);
            }
          }
          return undefined;
        },
      },
    },
  });

  const problems = findLayerProblems(code);

  if (unimportant.size > 0) {
    problems.push(
      `${String(unimportant.size)} non-exempt propert(ies) are not important: ` +
        [...unimportant].sort().join(', '),
    );
  }
  if (wronglyImportant.size > 0) {
    problems.push(
      `${String(wronglyImportant.size)} exempt propert(ies) became important: ` +
        [...wronglyImportant].sort().join(', '),
    );
  }
  if (importantKeyframes.size > 0) {
    problems.push(
      `@keyframes bodies must never hold !important, and these do: ` +
        [...importantKeyframes].sort().join(', '),
    );
  }
  if (unexemptAnimated.size > 0) {
    problems.push(
      `these propert(ies) are animated by a @keyframes but are not in ` +
        `EXEMPT_PROPERTIES, so an important declaration would freeze the ` +
        `animation: ${[...unexemptAnimated].sort().join(', ')}`,
    );
  }
  if (survivingRem.size > 0) {
    problems.push(
      `${String(survivingRem.size)} \`rem\` length(s) survived the rebase, and a ` +
        `host \`html { font-size }\` would rescale them: ` +
        [...survivingRem].sort().join(', '),
    );
  }

  return { ungated: [...new Set(ungated)], problems };
}

/**
 * Rewrites `source` so that no selector can match outside `[data-yv-sdk]`, and
 * so that no ordinary consumer rule can override what it declares.
 *
 * @param {string} source Compiled Tailwind CSS.
 * @param {{ minify?: boolean, filename?: string }} [options]
 * @returns {{ code: string, ungated: string[], problems: string[] }} The
 *   rewritten CSS, every selector that has no gate after the rewrite, and every
 *   other structural fault the re-parse found. A non-empty list of either kind
 *   is a build failure, not a warning.
 */
export function scopeCss(source, options = {}) {
  const { minify = false, filename = 'tailwind.css' } = options;

  // Pass 1: flatten the nesting. `bible-reader.css` nests rules under
  // `[data-slot='yv-bible-renderer']` with `&`, and `@utility touch-hitbox`
  // emits a nested `&:before`. A visitor that runs against those sees a partial
  // selector and prefixes it into an invalid one. After the flattening, the
  // visitor sees only complete selectors.
  const { code: flattened } = transform({
    filename,
    code: Buffer.from(source),
    include: Features.Nesting,
    minify: false,
  });

  // Pass 2: add the gate.
  const { code: gated } = transform({
    filename,
    code: flattened,
    minify: false,
    visitor: { Selector: gateSelector },
  });

  // Pass 3: convert every `rem` length to `px`. Separate from pass 2 so that a
  // failure names one job. The two visitors never see the same node anyway: one
  // walks selectors, the other walks lengths.
  const { code: rebased } = transform({
    filename,
    code: gated,
    minify: false,
    visitor: { Length: rebaseLength },
  });

  // Pass 4: print the final sheet.
  const { code: printed } = transform({ filename, code: rebased, minify });

  // Pass 5: split the sheet by property, mark the layered half important, and
  // join the two halves. Both steps are text edits, and both run after the last
  // print. Lightning CSS cannot express either one: see `splitByImportance` for
  // the visitor limitation and `assembleSheet` for the dropped `@layer yv;`.
  const { layered, unlayered, exemptAlreadyImportant } = splitByImportance(
    printed.toString(),
    minify,
  );
  const code = assembleSheet(layered, unlayered, minify);

  // Pass 6: check the result.
  return { code, ...verifyOutput(code, filename, exemptAlreadyImportant) };
}

/* -------------------------------------------------------------------------- */
/* CLI                                                                         */
/* -------------------------------------------------------------------------- */

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_INPUT = resolve(PACKAGE_ROOT, '.cache/tailwind.raw.css');
const DEFAULT_OUTPUT = resolve(PACKAGE_ROOT, 'dist/tailwind.css');

function parseArguments(argv) {
  const flag = (name) => argv.includes(`--${name}`);
  const value = (name) => {
    const match = argv.find((argument) => argument.startsWith(`--${name}=`));
    return match?.slice(name.length + 3);
  };

  const input = value('in');
  const output = value('out');

  return {
    minify: flag('minify'),
    watch: flag('watch'),
    input: input ? resolve(process.cwd(), input) : DEFAULT_INPUT,
    output: output ? resolve(process.cwd(), output) : DEFAULT_OUTPUT,
  };
}

/** @returns {boolean} true when the rewrite produced a publishable stylesheet. */
function runOnce({ input, output, minify }) {
  if (!existsSync(input)) {
    console.error(`❌ ${input} is missing. Run build:css first.`);
    return false;
  }

  const source = readFileSync(input, 'utf-8');
  const { code, ungated, problems } = scopeCss(source, { minify, filename: input });

  if (ungated.length > 0) {
    console.error(
      `❌ ${String(ungated.length)} selector(s) are not gated on [${SCOPE_ATTRIBUTE}]:\n` +
        ungated.map((selector) => `  - ${selector}`).join('\n') +
        '\n\nSDK CSS must not be able to match DOM the SDK did not render.',
    );
    return false;
  }

  if (problems.length > 0) {
    console.error(
      `❌ the rewritten sheet is not isolated:\n` +
        problems.map((problem) => `  - ${problem}`).join('\n') +
        '\n\nSee EXEMPT_PROPERTIES in scripts/scope-selectors.mjs.',
    );
    return false;
  }

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, code);
  console.log(
    `✅ Scoped ${output} to [${SCOPE_ATTRIBUTE}] in @layer ${LAYER_NAME} ` +
      `(${String(code.length)} bytes)`,
  );
  return true;
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  const ok = runOnce(options);

  if (!options.watch) {
    if (!ok) process.exit(1);
    return;
  }

  mkdirSync(dirname(options.input), { recursive: true });

  // Watch the directory, not the file. The Tailwind CLI replaces its output
  // file, and a file watch does not survive a replacement on every platform.
  let pending;
  watch(dirname(options.input), (_event, filename) => {
    if (filename && !options.input.endsWith(filename)) return;
    clearTimeout(pending);
    pending = setTimeout(() => runOnce(options), 50);
  });
  console.log(`👀 Watching ${options.input}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
