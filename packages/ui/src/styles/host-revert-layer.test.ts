import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A2 isolation rule. jsdom cannot prove cascade layers or `revert-layer`, so
 * this file only guards the source contract. Computed-style proof lives in
 * `host-css-isolation.stories.tsx` (Chromium / Storybook play).
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

function layerDepthAt(css: string, index: number): number {
  const before = css.slice(0, index);
  let depth = 0;
  const tokens = before.matchAll(/@layer\b[^;{]*[{;]|[{}]/g);
  for (const token of tokens) {
    const value = token[0];
    if (value.startsWith('@layer') && value.endsWith('{')) {
      depth += 1;
      continue;
    }
    if (value === '{' && depth > 0) {
      depth += 1;
      continue;
    }
    if (value === '}' && depth > 0) {
      depth -= 1;
    }
  }
  return depth;
}

type IsolationRule = {
  index: number;
  body: string;
};

function isolationRule(css: string): IsolationRule {
  const withoutComments = stripComments(css);
  const collapsed = withoutComments.replace(/\s+/g, ' ');
  const index = collapsed.indexOf(SELECTOR);
  expect(index, `expected unlayered selector ${SELECTOR}`).toBeGreaterThan(-1);

  const open = collapsed.indexOf('{', index);
  const close = collapsed.indexOf('}', open);
  expect(open).toBeGreaterThan(index);
  expect(close).toBeGreaterThan(open);

  return {
    index: withoutComments.indexOf('[data-yv-sdk] *'),
    body: collapsed.slice(open + 1, close),
  };
}

describe('A2 host isolation rule in global.css', () => {
  it('declares revert-layer on the listed shorthands, unlayered, not on the root, and not via all', () => {
    const withoutComments = stripComments(globalCss);
    const rule = isolationRule(globalCss);

    expect(layerDepthAt(withoutComments, rule.index)).toBe(0);
    expect(withoutComments).not.toMatch(/\[data-yv-sdk\]\s*,/);
    expect(rule.body).not.toMatch(/\ball\s*:/);
    expect(rule.body).not.toMatch(/\bdisplay\s*:/);
    expect(rule.body).not.toMatch(/\bmax-width\s*:/);

    for (const property of REVERT_PROPERTIES) {
      expect(rule.body, property).toMatch(new RegExp(`${property}\\s*:\\s*revert-layer`));
    }
  });
});
