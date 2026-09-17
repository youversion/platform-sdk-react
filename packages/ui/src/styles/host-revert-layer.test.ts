import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * A2 isolation rule. jsdom cannot prove cascade layers or `revert-layer`, so
 * this file only guards the source contract. Computed-style proof lives in
 * `host-css-isolation.stories.tsx` (Chromium / Storybook play). The compiled
 * sheet staying unlayered is `scripts/verify-styles.js`.
 */
const styleDir = import.meta.dirname;
const globalCss = readFileSync(resolve(styleDir, './global.css'), 'utf8');
const chromeCss = readFileSync(resolve(styleDir, './chrome.css'), 'utf8');

const EXPECTED_SELECTORS = [
  '[data-yv-sdk] *',
  '[data-yv-sdk] *::before',
  '[data-yv-sdk] *::after',
] as const;

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

function declarationMap(body: string): Map<string, string> {
  const declarations = new Map<string, string>();
  for (const part of body.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    declarations.set(trimmed.slice(0, colon).trim(), trimmed.slice(colon + 1).trim());
  }
  return declarations;
}

function revertLayerRules(css: string): [selectors: string[], body: string][] {
  const rules: [string[], string][] = [];
  let from = 0;
  while (from < css.length) {
    const marker = css.indexOf('revert-layer', from);
    if (marker === -1) break;
    const open = css.lastIndexOf('{', marker);
    const close = css.indexOf('}', marker);
    if (open === -1 || close === -1) break;
    const prevClose = css.lastIndexOf('}', open);
    const selectors = css
      .slice(prevClose + 1, open)
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    rules.push([selectors, css.slice(open + 1, close)]);
    from = close + 1;
  }
  return rules;
}

function expectA2Rule(css: string, label: string): void {
  const withoutComments = stripComments(css);
  const collapsed = withoutComments.replace(/\s+/g, ' ');

  expect(collapsed, label).not.toMatch(/\ball\s*:\s*revert/);

  const rules = revertLayerRules(collapsed);
  expect(rules.length, `${label}: expected at least one revert-layer rule`).toBeGreaterThan(0);

  for (const [selectors, body] of rules) {
    expect(selectors, label).toEqual([...EXPECTED_SELECTORS]);
    expect(body, label).not.toMatch(/\bdisplay\s*:/);
    expect(body, label).not.toMatch(/\bmax-width\s*:/);

    const declarations = declarationMap(body);
    for (const property of REVERT_PROPERTIES) {
      expect(declarations.get(property), `${label} ${property}`).toBe('revert-layer');
    }
  }
}

describe('A2 host isolation rule', () => {
  it('declares revert-layer on the listed shorthands in global.css and chrome.css', () => {
    expectA2Rule(globalCss, 'global.css');
    expectA2Rule(chromeCss, 'chrome.css');
  });
});
