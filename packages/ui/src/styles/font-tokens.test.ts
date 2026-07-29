import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The serif font stack is declared TWICE — once as a runtime custom property in
 * core's `theme.css` (`--yv-font-serif`) and once as a Tailwind theme key in ui's
 * `global.css` (`--font-serif`). They are literal duplicates, not aliases: core
 * cannot import Tailwind, and `@theme inline` values are inlined into utilities
 * rather than emitted as runtime custom properties, so `--font-serif` cannot
 * reference `--yv-font-serif` without invalidating the value.
 *
 * Nothing else catches drift between them. jsdom never loads either sheet, so
 * asserting against the CSS source on disk (the pattern from `verse.test.tsx`) is
 * the only way to check a token's literal value.
 *
 * Resolve relative to this file so it works whether the suite runs from the ui
 * package (the filtered command) or the repo root (turbo).
 */
const themeCss = readFileSync(
  resolve(import.meta.dirname, '../../../core/src/styles/theme.css'),
  'utf8',
);
const globalCss = readFileSync(resolve(import.meta.dirname, './global.css'), 'utf8');

function extractStack(css: string, property: string): string | undefined {
  // Skip comments so a font name mentioned in prose can't be mistaken for the
  // declaration.
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const matches = Array.from(
    withoutComments.matchAll(new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);`, 'g')),
  );
  expect(matches, `expected exactly one \`${property}\` declaration`).toHaveLength(1);
  return matches[0]![1]!.trim();
}

describe('serif font token (core theme.css ↔ ui global.css)', () => {
  const coreSerif = extractStack(themeCss, '--yv-font-serif');
  const uiSerif = extractStack(globalCss, '--font-serif');

  it('names Untitled Serif first in core theme.css', () => {
    expect(coreSerif).toBe("'Untitled Serif', 'Source Serif 4', serif");
  });

  it('keeps the two duplicate declarations byte-identical', () => {
    expect(uiSerif).toBe(coreSerif);
  });

  it('keeps Source Serif 4 in the stack as the fallback', () => {
    // Untitled Serif is fetched at runtime from the gated Fonts API and can fail
    // (no app key, blocked request, offline). Source Serif 4 must stay so the
    // fallback is a serif we actually load, not the platform default.
    expect(coreSerif).toContain("'Source Serif 4'");
    expect(globalCss).toContain('Source+Serif+4');
  });
});

describe('sans font token (core theme.css ↔ ui global.css)', () => {
  // The sans stack is unchanged by the serif work. Guarded here so it can't drift
  // alongside the serif change either.
  it('keeps the two duplicate declarations byte-identical on Inter', () => {
    const coreSans = extractStack(themeCss, '--yv-font-sans');
    const uiSans = extractStack(globalCss, '--font-sans');
    expect(coreSans).toBe("'Inter', sans-serif");
    expect(uiSans).toBe(coreSans);
  });
});
