import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards the inherited-property declarations on the SDK root.
 *
 * A consumer `body { font-family: … }` rule matches no SDK element, so the
 * cascade cannot fight it. The value arrives by inheritance, and inheritance
 * applies only where the element declares nothing itself. A declaration of each
 * of these properties on `[data-yv-sdk]` is the whole fix. The removal of one
 * declaration opens the leak again for that one property, without a warning. No
 * test that renders a component finds that, unless the test reads that exact
 * property.
 *
 * This test reads the CSS source from disk, and not the computed styles. It
 * follows `packages/ui/src/styles/font-tokens.test.ts`. Neither jsdom nor node
 * loads a stylesheet, so the source text is the only available evidence. The
 * consumer-host integration stories in `packages/ui` prove that the declarations
 * work in a browser.
 *
 * See YPE-4113.
 */
const themeCss = readFileSync(resolve(import.meta.dirname, './theme.css'), 'utf8');

/** Every property that the SDK root must declare, so the host cannot inherit into us. */
const PINNED_INHERITED_PROPERTIES = [
  'color',
  'font-family',
  'font-variant',
  'letter-spacing',
  'line-height',
  'text-align',
  'text-indent',
  'text-shadow',
  'text-transform',
  'white-space',
  'word-spacing',
] as const;

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * Returns the body of the first `{ … }` block that opens at or after `from`.
 *
 * This function counts braces, and does not use a regular expression. The reset
 * block holds nested rules, and a non-greedy match stops at the first inner `}`.
 */
function blockBodyAt(css: string, from: number): string {
  const open = css.indexOf('{', from);
  expect(open, 'expected a rule body to follow the selector').toBeGreaterThan(-1);

  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }

  throw new Error('theme.css has an unbalanced rule body');
}

/** Removes the nested rules. Only the declarations on the element itself remain. */
function ownDeclarations(body: string): string {
  let depth = 0;
  let out = '';

  for (const character of body) {
    if (character === '{') depth += 1;
    else if (character === '}') depth -= 1;
    else if (depth === 0) out += character;
  }

  return out;
}

/**
 * The reset block, in whichever selector form it now uses.
 *
 * `theme.css` has two top-level `[data-yv-sdk]` rules: the token block and the
 * reset block. The reset block resets the box model, so `box-sizing` tells the
 * two apart. The selector match is loose because Phase 4 of YPE-4113 removes the
 * `:where()` wrapper, and this test must survive that change.
 */
function findResetBlock(): string {
  const css = stripComments(themeCss);
  const selector = /(?:^|\})\s*(?::where\(\s*)?\[data-yv-sdk\]\s*\)?\s*\{/gm;

  for (const match of css.matchAll(selector)) {
    const body = blockBodyAt(css, match.index);
    if (body.includes('box-sizing')) return body;
  }

  throw new Error('could not find the [data-yv-sdk] reset block in theme.css');
}

describe('[data-yv-sdk] inherited-property reset', () => {
  const declarations = ownDeclarations(findResetBlock());

  it.each(PINNED_INHERITED_PROPERTIES)('declares %s on the SDK root', (property) => {
    // The pattern anchors on `;` or on the start of a line. A property name that
    // is part of another name thus cannot satisfy the wrong case.
    const declared = new RegExp(`(?:^|;)\\s*${property}\\s*:`, 'm').test(declarations);
    expect(declared, `theme.css must declare \`${property}\` on [data-yv-sdk]`).toBe(true);
  });

  it('leaves direction to the host, so RTL content still works', () => {
    // bible-reader.css handles `[dir='rtl']`, and `text-align: start` follows
    // the direction. A `direction: ltr` declaration here breaks Hebrew and
    // Arabic Bibles. The absence of that declaration is on purpose.
    expect(/(?:^|;)\s*direction\s*:/m.test(declarations)).toBe(false);
  });

  it('resolves color from the theme token, not a literal', () => {
    // A literal value does not change with `data-yv-theme='dark'`.
    expect(declarations).toMatch(/(?:^|;)\s*color:\s*var\(--yv-foreground\)/m);
  });
});
