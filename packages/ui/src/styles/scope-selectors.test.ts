import { describe, expect, it } from 'vitest';

import { scopeCss } from '../../scripts/scope-selectors.mjs';

/**
 * Covers the post-build selector rewrite that is the whole style-isolation
 * guarantee.
 *
 * The build already fails on a non-empty `ungated` list, so these tests are not
 * the safety net — they are the specification. They pin the shape of the gate,
 * the four cases that must be left alone, and the constructs a naive string
 * rewrite would corrupt: escaped class names, `@keyframes`, `@property`, and
 * nested `&` rules.
 *
 * See YPE-4113 and docs/adr/0005-scope-sdk-css-to-data-yv-sdk-subtrees.md.
 */
const GATE = ':is([data-yv-sdk], [data-yv-sdk] *)';

/** Rewrites `source` and fails the test if anything survived ungated. */
function scope(source: string): string {
  const { code, ungated } = scopeCss(source);
  expect(ungated, 'every selector must be gated after the rewrite').toEqual([]);
  return code;
}

describe('scopeCss', () => {
  describe('gates selectors that could otherwise match consumer DOM', () => {
    it('prepends the gate to a class selector', () => {
      expect(scope('.card { color: red }')).toContain(`${GATE}.card`);
    });

    it('keeps a leading type selector first, because :is(…)a is invalid CSS', () => {
      // A compound selector must start with its type selector. `:is(…)button`
      // parses as nothing; `button:is(…)` is what the browser accepts.
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
      // `*:is(…)` and `:is(…)` are the same selector, and Lightning CSS drops
      // the redundant `*`. What matters is that the gate is there.
      const code = scope('*, ::before { --tw-x: 1 }');
      expect(code).toContain(GATE);
      expect(code).not.toMatch(/(^|\})\s*\*/);
    });
  });

  describe('leaves selectors that are already safe', () => {
    it('leaves a selector that already names [data-yv-sdk]', () => {
      const code = scope('[data-yv-sdk] .yv-v-selected { text-decoration-line: underline }');
      expect(code).not.toContain(GATE);
      expect(code).toContain('[data-yv-sdk] .yv-v-selected');
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
      // Scoping these would work — every portal re-stamps the attribute — but it
      // adds risk for no gain. They render nothing and every name is namespaced.
      const code = scope(':root, :host { --yv-font-sans: Inter }');
      expect(code).not.toContain(GATE);
      expect(code).toContain(':root');
      expect(code).toContain(':host');
    });

    it('leaves a gate carried inside :is()', () => {
      const code = scope("[data-yv-sdk]:is([data-yv-theme='dark']) .x { color: red }");
      expect(code).not.toContain(GATE);
    });
  });

  describe('rejects a partial gate', () => {
    it('re-gates :is() when only one branch is scoped', () => {
      // `:is([data-yv-sdk], .card)` reaches consumer DOM through its second
      // branch, so it is not a gate. Every branch has to be scoped, not some.
      const code = scope(':is([data-yv-sdk], .card) { color: red }');
      expect(code).toContain(GATE);
    });

    it('does not treat a gate inside :not() as a gate', () => {
      const code = scope(':not([data-yv-sdk]) { color: red }');
      expect(code).toContain(GATE);
    });
  });

  describe('does not corrupt constructs a string rewrite would', () => {
    it('preserves escaped class names', () => {
      const code = scope('.yv\\:mt-4 { margin-top: 1rem }');
      expect(code).toContain(`${GATE}.yv\\:mt-4`);
    });

    it('preserves an escaped variant class with a pseudo-class', () => {
      const code = scope('.yv\\:hover\\:underline:hover { text-decoration-line: underline }');
      expect(code).toContain(`${GATE}.yv\\:hover\\:underline:hover`);
    });

    it('leaves @keyframes alone — keyframe selectors are not selectors', () => {
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
      // Tailwind writes `@layer properties` for the @property fallback whether or
      // not we ask for layers, so the rewrite has to reach inside one.
      const code = scope('@layer properties { .card { --tw-x: 1 } }');
      expect(code).toContain(`${GATE}.card`);
    });
  });

  describe('flattens CSS nesting before gating', () => {
    it('expands a nested & rule into a complete selector', () => {
      // Gating `&:before` in place would produce `:is(…)&:before`, which is
      // nonsense. Flattening first is what makes the visitor safe.
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

  describe('output shape', () => {
    it('minifies when asked', () => {
      const { code } = scopeCss('.card { color: red }', { minify: true });
      expect(code).toBe(':is([data-yv-sdk],[data-yv-sdk] *).card{color:red}');
    });

    it('adds exactly 0,1,0 of specificity, so relative order inside the SDK is unchanged', () => {
      // Every rule gains the same single attribute selector. `:is()` takes the
      // specificity of its most specific argument, and both branches of the gate
      // are one attribute selector.
      const code = scope('.a { color: red } .b .c { color: blue }');
      expect(code.match(/:is\(\[data-yv-sdk\], \[data-yv-sdk] \*\)/g)).toHaveLength(2);
    });
  });
});
