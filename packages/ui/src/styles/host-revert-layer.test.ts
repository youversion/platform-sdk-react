import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A2 isolation rule. jsdom cannot prove cascade layers or `revert-layer`, so
 * this file only guards the source contract. Computed-style proof lives in
 * `host-css-isolation.stories.tsx` (Chromium / Storybook play). The compiled
 * sheet staying unlayered is `scripts/verify-styles.js`.
 */
const globalCss = readFileSync(resolve(import.meta.dirname, './global.css'), 'utf8');

const SELECTOR = '[data-yv-sdk] *, [data-yv-sdk] *::before, [data-yv-sdk] *::after';

const REVERT_PROPERTIES = [
  'box-sizing',
  'padding',
  'margin',
  'border',
  'background',
  'font',
  'color',
  'line-height',
  'letter-spacing',
  'appearance',
  '-webkit-appearance',
  'text-decoration',
  'list-style',
  'text-transform',
] as const;

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('A2 host isolation rule in global.css', () => {
  it('declares revert-layer on the listed shorthands, on descendants only, and not via all', () => {
    const withoutComments = stripComments(globalCss);
    const collapsed = withoutComments.replace(/\s+/g, ' ');

    expect(collapsed).toContain(SELECTOR);
    expect(withoutComments).not.toMatch(/\[data-yv-sdk\]\s*,/);
    expect(collapsed).not.toMatch(/\ball\s*:\s*revert/);

    const open = collapsed.indexOf(SELECTOR);
    const body = collapsed.slice(collapsed.indexOf('{', open) + 1, collapsed.indexOf('}', open));
    expect(body).not.toMatch(/\bdisplay\s*:/);
    expect(body).not.toMatch(/\bmax-width\s*:/);

    for (const property of REVERT_PROPERTIES) {
      expect(body, property).toMatch(new RegExp(`${property}\\s*:\\s*revert-layer`));
    }
  });
});
