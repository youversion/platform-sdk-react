import { describe, expect, it } from 'vitest';

import { scopeCss } from '../../scripts/scope-selectors.mjs';

/**
 * Covers the post-build rewrite that is the whole style-isolation guarantee.
 *
 * The build already fails on a non-empty `ungated` or `problems` list. These
 * tests are thus not the safety net. They are the specification. They pin the
 * shape of the gate, the four cases that stay unchanged, the split into a
 * `@layer yv` half and an unlayered half, and which properties may not become
 * `!important`. They also pin the constructs that a plain string rewrite
 * corrupts: escaped class names, `@keyframes`, `@property`, and nested `&`
 * rules.
 *
 * See YPE-4113, docs/adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md,
 * docs/adr/0006-layer-and-importantize-the-sdk-sheet.md and
 * docs/adr/0008-stop-sdk-css-at-consumer-slots.md.
 */

/**
 * The gate, as Lightning CSS prints it.
 *
 * The descendant arm carries the slot exclusion, which is what stops SDK CSS at
 * consumer content. Lightning CSS drops the redundant `*` before the `:not()`,
 * so the printed arm is `[data-yv-sdk] :not(…)`, not `[data-yv-sdk] *:not(…)`.
 * The two are the same selector.
 */
const GATE = ':is([data-yv-sdk], [data-yv-sdk] :not([data-yv-slot], [data-yv-slot] *))';

/** The same gate, without the spaces that the minifier removes. */
const MINIFIED_GATE = ':is([data-yv-sdk],[data-yv-sdk] :not([data-yv-slot],[data-yv-slot] *))';

/** The exclusion on its own, for a hand-written selector that carries the gate already. */
const SLOT_EXCLUSION = ':not([data-yv-slot], [data-yv-slot] *)';

/** Rewrites `source`. The test fails when the rewrite left anything unsafe. */
function scope(source: string): string {
  const { code, ungated, problems } = scopeCss(source);
  expect(ungated, 'every selector must be gated after the rewrite').toEqual([]);
  expect(problems, 'the rewrite must leave no structural fault').toEqual([]);
  return code;
}

describe('scopeCss', () => {
  describe('gates selectors that can otherwise match consumer DOM', () => {
    it('prepends the gate to a class selector', () => {
      expect(scope('.card { color: red }')).toContain(`${GATE}.card`);
    });

    it('keeps a leading type selector first, because :is(…)a is invalid CSS', () => {
      // A compound selector must start with its type selector. `:is(…)button`
      // parses as nothing. The browser accepts `button:is(…)`.
      expect(scope('button { padding: 0 }')).toContain(`button${GATE}`);
    });

    it('gates only the first compound, since the rest is already inside the subtree', () => {
      const code = scope('.list .item { color: red }');
      expect(code).toContain(`${GATE}.list .item`);
    });

    it('gates a pseudo-element selector', () => {
      expect(scope('.field::placeholder { opacity: 1 }')).toContain(`${GATE}.field::placeholder`);
    });

    it('gates every selector in a list independently', () => {
      const code = scope('.a, .b { color: red }');
      expect(code).toContain(`${GATE}.a`);
      expect(code).toContain(`${GATE}.b`);
    });

    it('gates the universal selector', () => {
      // `*:is(…)` and `:is(…)` are the same selector, and Lightning CSS removes
      // the unnecessary `*`. The gate is what matters.
      const code = scope('*, ::before { --tw-x: 1 }');
      expect(code).toContain(GATE);
      expect(code).not.toMatch(/(^|\})\s*\*/);
    });
  });

  describe('leaves selectors that are already safe', () => {
    it('leaves a selector that already names [data-yv-sdk]', () => {
      // A hand-written gated selector writes its own slot exclusion. The build
      // rejects it without one — see the `stops at consumer slots` block.
      const code = scope(
        `[data-yv-sdk] .yv-v-selected${SLOT_EXCLUSION} { text-decoration-line: underline }`,
      );
      expect(code).not.toContain(GATE);
      expect(code).toContain(`[data-yv-sdk] .yv-v-selected${SLOT_EXCLUSION}`);
    });

    it('leaves the Bible renderer slot', () => {
      const code = scope("[data-slot='yv-bible-renderer'] { display: block }");
      expect(code).not.toContain(GATE);
    });

    it('leaves [data-yv-sdk-bible-reader], the non-React consumer hook', () => {
      const code = scope('[data-yv-sdk-bible-reader] { display: block }');
      expect(code).not.toContain(GATE);
    });

    it('leaves :root and :host, which only carry --yv-* variables', () => {
      // A gate on these two works, because every portal stamps the attribute
      // again. It adds risk and gives no gain. They render nothing, and every
      // name has the `--yv-*` namespace.
      const code = scope(':root, :host { --yv-font-sans: Inter }');
      expect(code).not.toContain(GATE);
      expect(code).toContain(':root');
      expect(code).toContain(':host');
    });

    it('leaves a gate carried inside :is()', () => {
      const code = scope(
        `[data-yv-sdk]:is([data-yv-theme='dark']) .x${SLOT_EXCLUSION} { color: red }`,
      );
      expect(code).not.toContain(GATE);
    });
  });

  describe('rejects a partial gate', () => {
    it('re-gates :is() when only one branch is scoped', () => {
      // `:is([data-yv-sdk], .card)` reaches consumer DOM through its second
      // branch. It is thus not a gate. Every branch needs the gate, not some.
      const code = scope(':is([data-yv-sdk], .card) { color: red }');
      expect(code).toContain(GATE);
    });

    it('does not treat a gate inside :not() as a gate', () => {
      const code = scope(':not([data-yv-sdk]) { color: red }');
      expect(code).toContain(GATE);
    });
  });

  describe('stops at consumer slots', () => {
    it('excludes a slot, and everything under it, from the gate', () => {
      // The whole point of the change. A consumer's `children` render inside our
      // subtree, and the old `[data-yv-sdk] *` arm matched every one of them.
      expect(scope('.card { color: red }')).toContain(
        ':is([data-yv-sdk], [data-yv-sdk] :not([data-yv-slot], [data-yv-slot] *))',
      );
    });

    it('reports a hand-written gated selector that has no slot exclusion', () => {
      // `src/styles/global.css` and `packages/core/src/styles/theme.css` write
      // their own gate, so the rewrite skips them. This check is what keeps the
      // two halves of the boundary in step.
      const { problems } = scopeCss('[data-yv-sdk] .yv-v-selected { color: red }');
      expect(problems).toHaveLength(1);
      expect(problems[0]).toContain('data-yv-slot');
    });

    it('reports a missing exclusion inside an :is() branch', () => {
      // The `dark` custom variant lives in exactly this position.
      const { problems } = scopeCss(
        "&:is([data-yv-sdk][data-yv-theme='dark'] *) { color: red }".replace('&', '.x'),
      );
      expect(problems).toHaveLength(1);
    });

    it('accepts a hand-written gated selector that carries the exclusion', () => {
      const { problems } = scopeCss(`[data-yv-sdk] .yv-v-selected${SLOT_EXCLUSION} { color: red }`);
      expect(problems).toEqual([]);
    });

    it('wants the exclusion on the subject, not on the gate compound', () => {
      // `[data-yv-sdk]:not(…) a` excludes the wrong element and still restyles
      // the consumer's link.
      const { problems } = scopeCss(`[data-yv-sdk]${SLOT_EXCLUSION} a { color: red }`);
      expect(problems).toHaveLength(1);
    });
  });

  describe('does not corrupt the constructs that a string rewrite corrupts', () => {
    it('preserves escaped class names', () => {
      const code = scope('.yv\\:mt-4 { margin-top: 1rem }');
      expect(code).toContain(`${GATE}.yv\\:mt-4`);
    });

    it('preserves an escaped variant class with a pseudo-class', () => {
      const code = scope('.yv\\:hover\\:underline:hover { text-decoration-line: underline }');
      expect(code).toContain(`${GATE}.yv\\:hover\\:underline:hover`);
    });

    it('leaves @keyframes alone, because keyframe selectors are not selectors', () => {
      const code = scope('@keyframes yv-spin { from { opacity: 0 } to { opacity: 1 } }');
      expect(code).toContain('@keyframes yv-spin');
      expect(code).not.toContain(GATE);
    });

    it('leaves @property alone', () => {
      const code = scope(
        '@property --tw-scale-x { syntax: "<number>"; inherits: false; initial-value: 1 }',
      );
      expect(code).toContain('@property --tw-scale-x');
      expect(code).not.toContain(GATE);
    });

    it('leaves @font-face alone', () => {
      const code = scope("@font-face { font-family: Inter; src: url('/inter.woff2') }");
      expect(code).toContain('@font-face');
      expect(code).not.toContain(GATE);
    });

    it('gates selectors inside an @media wrapper', () => {
      const code = scope('@media (min-width: 40rem) { .card { color: red } }');
      expect(code).toContain('@media');
      expect(code).toContain(`${GATE}.card`);
    });

    it('gates selectors inside an @supports wrapper', () => {
      const code = scope('@supports (color: red) { *, ::before { --tw-x: 1 } }');
      expect(code).toContain('@supports');
      expect(code).toContain(GATE);
    });

    it('gates rules inside a cascade layer Tailwind emits on its own', () => {
      // Tailwind writes `@layer properties` for the @property fallback, whatever
      // our directives say. The rewrite must thus reach inside a layer block.
      const code = scope('@layer properties { .card { --tw-x: 1 } }');
      expect(code).toContain(`${GATE}.card`);
    });
  });

  describe('flattens CSS nesting before gating', () => {
    it('expands a nested & rule into a complete selector', () => {
      // A gate on `&:before` in place produces `:is(…)&:before`, which is
      // invalid. The flatten pass first is what makes the visitor safe.
      const code = scope('.touch-hitbox { position: relative; &:before { content: "" } }');
      expect(code).toContain(`${GATE}.touch-hitbox`);
      expect(code).not.toContain('&');
      expect(code).toMatch(/:before|::before/);
    });

    it('expands a nested descendant rule under an already-gated root', () => {
      const code = scope(
        "[data-slot='yv-bible-renderer'] { display: block; & * { font-size: inherit } }",
      );
      expect(code).not.toContain(GATE);
      expect(code).not.toContain('&');
      expect(code).toContain('[data-slot="yv-bible-renderer"] *');
    });

    it('gates a nested rule whose parent needs gating', () => {
      const code = scope('.card { color: red; & .title { font-weight: 700 } }');
      expect(code).toContain(`${GATE}.card .title`);
    });
  });

  describe('splits the sheet into a layered half and an unlayered half', () => {
    it('declares the layer first, then opens it, and closes it at the end', () => {
      const code = scope('.card { color: red }');
      expect(code).toMatch(/^@layer yv;\s*@layer yv \{/);
      expect(code.trimEnd().endsWith('}')).toBe(true);
    });

    it('uses the bare name `yv`, never a yv-sdk-* sub-layer', () => {
      // `verify-styles.js` fails the build on `@layer yv-sdk-`. Those were the
      // priority sub-layers that this change replaced.
      expect(scope('.card { color: red }')).not.toContain('@layer yv-sdk-');
    });

    it('emits one rule into both halves when it holds both kinds of property', () => {
      // The two halves hold disjoint property sets, so they never compete with
      // each other, and the split costs nothing in the SDK's own cascade.
      const { code } = scopeCss('.card { color: red; position: absolute }', { minify: true });
      expect(code).toBe(
        '@layer yv;' +
          `${MINIFIED_GATE}.card{position:absolute}` +
          `@layer yv{${MINIFIED_GATE}.card{color:red!important}}`,
      );
    });

    it('opens no layer at all when every declaration is exempt', () => {
      // A layered normal declaration loses to an unlayered consumer one at any
      // specificity. Exempt properties must thus stay outside the layer.
      const code = scope(':root { --yv-primary: red }');
      expect(code).not.toContain('@layer yv {');
      expect(code).toContain('@layer yv;');
    });

    it("leaves Tailwind's own @layer properties where Tailwind put it", () => {
      // Tailwind emits `@layer properties` for the @property fallback whatever
      // our directives say. Its body is all `--tw-*` custom properties, which
      // are exempt as a family, so the whole block lands in the unlayered half
      // with the cascade position Tailwind shipped.
      const code = scope('@layer properties { .card { --tw-x: 1 } }');
      expect(code).toContain('@layer properties');
      expect(code).not.toContain('@layer yv {');
    });

    it('carries a conditional wrapper into whichever half needs it', () => {
      // 40rem arrives as 640px, because the rem rebase reaches into the media
      // query too. See the `rem` describe block below for why that is correct.
      const { code } = scopeCss('@media (min-width: 40rem) { .card { color: red; top: 0 } }', {
        minify: true,
      });
      expect(code).toContain(`@media (width>=640px){${MINIFIED_GATE}.card{top:0}}`);
      expect(code).toContain(
        `@layer yv{@media (width>=640px){${MINIFIED_GATE}.card{color:red!important}}}`,
      );
    });

    it('keeps @import above the layer block, where the parser needs it', () => {
      // `@import` must precede every rule. A bare `@layer <name>;` statement is
      // one of the two things allowed before it.
      const code = scope("@import 'https://example.test/f.css'; .card { color: red }");
      expect(code.indexOf('@import')).toBeLessThan(code.indexOf('@layer yv {'));
      expect(code.indexOf('@layer yv;')).toBeLessThan(code.indexOf('@import'));
    });

    it('does not cut an @import at a semicolon inside its quoted URL', () => {
      // The Google Fonts URL carries `wght@400;700`. A `[^;]*;` scan splits the
      // sheet in the middle of the string and produces unparsable CSS.
      const code = scope('@import "https://fonts.test/x?w=400;700"; .card { color: red }');
      expect(code).toContain('@import "https://fonts.test/x?w=400;700"');
    });
  });

  describe('marks declarations !important', () => {
    it('importantizes an ordinary declaration', () => {
      expect(scope('.card { color: red }')).toContain('color: red !important');
    });

    it('leaves a keyframe-animated property alone, or the animation freezes', () => {
      // An important cascaded declaration outranks the animation origin. An
      // important `opacity` holds every fade at its declared value.
      const code = scope('.card { opacity: .5; transform: none; height: 2px; filter: none }');
      expect(code).not.toContain('!important');
    });

    it('leaves the properties Radix writes inline, or the popover cannot be placed', () => {
      const code = scope('.card { position: absolute; left: 0; top: 0; z-index: 50 }');
      expect(code).not.toContain('!important');
    });

    it('leaves custom properties alone, so a --yv-* token override still wins', () => {
      const code = scope(':root { --yv-primary: red }');
      expect(code).not.toContain('!important');
    });

    it('leaves a shorthand alone when one of its longhands is exempt', () => {
      // `font: inherit !important` freezes `font-size`, which verse.tsx sets
      // inline. Same story for `background` and `background-color`.
      const code = scope('.card { font: inherit; background: none }');
      expect(code).not.toContain('!important');
    });

    it('never puts !important inside a @keyframes body, where it is invalid CSS', () => {
      const code = scope('@keyframes fade { from { opacity: 0 } to { opacity: 1 } }');
      expect(code).not.toContain('!important');
    });

    it('keeps an author-written !important on an exempt property', () => {
      // `yv:h-6!` in verse-of-the-day.tsx writes `height: … !important` by hand.
      // The pass neither strips it nor moves it into the layer.
      const { code, problems } = scopeCss('.card { height: 1.5rem !important }');
      expect(problems).toEqual([]);
      expect(code).toContain('!important');
      expect(code).not.toContain('@layer yv {');
    });

    it('reports a keyframe-animated property that is missing from the exemption list', () => {
      // The guard that keeps the list from falling behind the animations.
      const { problems } = scopeCss('@keyframes grow { to { width: 10px } } .a { color: red }');
      expect(problems.join('\n')).toContain('width');
    });
  });

  describe('converts every rem length to px', () => {
    // A `rem` resolves against the document root element. A host page with
    // `html { font-size: 62.5% }` therefore shrinks every `rem` the SDK ships
    // by 37.5 percent, and no selector, layer or `!important` reaches that.
    // 1rem = 16px is the browser default, so the sheet keeps the size it had.
    // See docs/adr/0007-convert-rem-to-px-in-the-sdk-sheet.md.

    it('rebases a plain declaration', () => {
      expect(scope('.a { padding: 0.25rem }')).toContain('padding: 4px');
    });

    it('rebases a custom property value', () => {
      // The value a `var()` later resolves to. Miss this one and the rebase
      // means nothing, because the theme ships its sizes as tokens.
      expect(scope(':root { --yv-radius: 2rem }')).toContain('--yv-radius: 32px');
    });

    it('rebases inside calc() and inside a var() fallback', () => {
      const code = scope('.a { width: calc(100% - 1rem); height: var(--x, 0.5rem) }');
      expect(code).toContain('calc(100% - 16px)');
      expect(code).toContain('var(--x, 8px)');
    });

    it('rebases a media query condition', () => {
      // Safe, and for a different reason than the rest. Media Queries Level 4
      // resolves a relative unit in a query against the *initial* value of
      // `font-size`, not the root element's computed value, so a host
      // `html { font-size }` never moved these breakpoints anyway. 16px is
      // that initial value at browser defaults.
      expect(scope('@media (min-width: 40rem) { .a { color: red } }')).toContain('width >= 640px');
    });

    it('rebases inside a @keyframes frame', () => {
      const code = scope('@keyframes slide { to { transform: translateX(1rem) } }');
      expect(code).toContain('translateX(16px)');
    });

    it('leaves a class name that contains the string rem alone', () => {
      // `.rem` is a real class in bible-reader.css, and Tailwind escapes an
      // arbitrary value into the selector. Both are names, not lengths.
      const code = scope('.rem { color: red } .yv\\:text-\\[0\\.5rem\\] { font-size: 0.5rem }');
      expect(code).toContain('.rem');
      expect(code).toContain('.yv\\:text-\\[0\\.5rem\\]');
      expect(code).toContain('font-size: 8px');
    });

    it('reports no surviving rem, which is the guard that fails the build', () => {
      // `verifyOutput` re-parses the result and pushes a problem for every
      // `rem` it still finds. The guard fires if someone removes or reorders
      // the rebase pass. No input can make it fire while the pass is in place,
      // because the pass and the guard read the same lengths, so this asserts
      // the clean side.
      const { problems } = scopeCss('.a { padding: 1rem; --x: 2rem }');
      expect(problems).toEqual([]);
    });
  });

  describe('output shape', () => {
    it('minifies when asked', () => {
      const { code } = scopeCss('.card { color: red }', { minify: true });
      expect(code).toBe(`@layer yv;@layer yv{${MINIFIED_GATE}.card{color:red!important}}`);
    });

    it('adds exactly 0,2,0 of specificity, so relative order inside the SDK is unchanged', () => {
      // Every rule gains the same gate. `:is()` and `:not()` each take the
      // specificity of their most specific argument. The gate's second branch is
      // one attribute plus a `:not()` holding one attribute, so the gain is
      // 0,2,0, and it is the same 0,2,0 for every rule in the sheet.
      const code = scope('.a { color: red } .b .c { color: blue }');
      const gates = code.split(GATE).length - 1;
      expect(gates).toBe(2);
    });
  });
});
