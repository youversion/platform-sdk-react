#!/usr/bin/env node
/**
 * Adds a `[data-yv-sdk]` gate to every selector in the compiled SDK stylesheet.
 *
 *   .yv\:mt-4  →  :is([data-yv-sdk], [data-yv-sdk] *).yv\:mt-4
 *
 * This is the whole style-isolation guarantee, and it replaces the `yv-sdk-*`
 * cascade layers. Layered SDK rules lost to a consumer's unlayered CSS. That
 * protected the consumer and guaranteed the leak in the other direction. The
 * gate protects both directions. SDK CSS cannot match DOM that the SDK did not
 * render. Inside an SDK subtree, `:is()` adds exactly 0,1,0, so our rules
 * override bare element selectors.
 *
 * The script uses Lightning CSS, not a regular expression and not
 * postcss-prefix-selector, for three reasons. Its `Selector` visitor is a typed
 * structural API, so it cannot corrupt an escaped class name such as
 * `.yv\:mt-4`. `@keyframes`, `@font-face` and `@property` produce no `Selector`
 * nodes, so the script skips them by construction rather than by an exclusion
 * list. It also flattens CSS nesting, which is what makes the visitor safe:
 * `bible-reader.css` and `@utility touch-hitbox` both emit nested `&` rules, and
 * a prefix on a nested selector corrupts it. We rejected
 * `postcss-prefix-selector@2.1.1`. It rewrites `:host` into
 * `[data-yv-sdk] :host`, which can never match, and thus removes every theme
 * variable without a warning.
 *
 * Usage:
 *   node scripts/scope-selectors.mjs [--minify] [--watch] [--in=PATH] [--out=PATH]
 *
 * See docs/adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md and YPE-4113.
 */
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Features, transform } from 'lightningcss';

const SCOPE_ATTRIBUTE = 'data-yv-sdk';

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

/**
 * Parses the rewritten CSS again and collects every selector that can still
 * match consumer DOM.
 *
 * This is the real guarantee. A string search for `:is([data-yv-sdk]` proves
 * that the script ran. Only a second parse proves that the script left nothing
 * behind.
 */
function findUngatedSelectors(code, filename) {
  const ungated = [];

  transform({
    filename,
    code,
    minify: false,
    visitor: {
      Selector(components) {
        if (!isAllowed(components)) ungated.push(formatSelector(components));
      },
    },
  });

  return [...new Set(ungated)];
}

/**
 * Rewrites `source` so that no selector can match outside `[data-yv-sdk]`.
 *
 * @param {string} source Compiled Tailwind CSS.
 * @param {{ minify?: boolean, filename?: string }} [options]
 * @returns {{ code: string, ungated: string[] }} The rewritten CSS, and every
 *   selector that has no gate after the rewrite. A non-empty `ungated` list is a
 *   build failure, not a warning.
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
    minify,
    visitor: { Selector: gateSelector },
  });

  // Pass 3: check the result.
  return { code: gated.toString(), ungated: findUngatedSelectors(gated, filename) };
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
  const { code, ungated } = scopeCss(source, { minify, filename: input });

  if (ungated.length > 0) {
    console.error(
      `❌ ${String(ungated.length)} selector(s) are not gated on [${SCOPE_ATTRIBUTE}]:\n` +
        ungated.map((selector) => `  - ${selector}`).join('\n') +
        '\n\nSDK CSS must not be able to match DOM the SDK did not render.',
    );
    return false;
  }

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, code);
  console.log(`✅ Scoped ${output} to [${SCOPE_ATTRIBUTE}] (${String(code.length)} bytes)`);
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
