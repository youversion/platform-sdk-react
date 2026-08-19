import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(import.meta.dirname, './bible-reader.css'), 'utf8');
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');

function rulesForExactClass(cls: string): string {
  const bodies: string[] = [];
  for (const match of cssWithoutComments.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const rawSel = match[1];
    const body = match[2];
    if (rawSel === undefined || body === undefined) continue;
    const sels = rawSel.split(',').map((s) => s.trim().replace(/\s+/g, ' '));
    if (sels.some((s) => s === `& .${cls}`)) {
      bodies.push(body);
    }
  }
  return bodies.join('\n');
}

describe('bible-reader phase-1 typography (Swift-adjusted tags)', () => {
  it('styles body, s1, and q1 with Swift rhythm and logical spacing', () => {
    const p = rulesForExactClass('p');
    expect(p).toContain('text-indent: 1em');
    expect(p).toContain('margin-block-end: 0.6em');
    expect(p).not.toContain('margin-bottom:');

    const s1 = rulesForExactClass('s1');
    expect(s1).toContain('font-size: 1.17em');
    expect(s1).toContain('font-weight: 500');
    expect(s1).toContain('margin-block-start: 0');
    expect(s1).toContain('margin-block-end: 0.25em');

    const q1 = rulesForExactClass('q1');
    expect(q1).toContain('padding-inline-start: 1em');
    expect(q1).toContain('text-indent: 0');
    expect(q1).not.toContain('text-indent: -');

    const q = rulesForExactClass('q');
    expect(q).not.toBe(q1);
    expect(q).toContain('text-indent: -');
  });

  it('raises verse labels 0.2em at 0.65em without changing family', () => {
    const labels = rulesForExactClass('yv-vlbl');
    expect(labels).toContain('font-size: 0.65em');
    expect(labels).toContain('top: -0.2em');
    expect(labels).not.toContain('top: -0.3em');
    expect(labels).toContain('font-family: var(--yv-font-sans)');
  });

  it('applies Swift-adjusted heading, poetry, paragraph, and list values', () => {
    expect(rulesForExactClass('s2')).toContain('font-weight: 500');
    expect(rulesForExactClass('s2')).toContain('font-style: italic');
    expect(rulesForExactClass('s2')).toContain('margin-block-start: 0.5em');
    expect(rulesForExactClass('s2')).toContain('margin-block-end: 0.5em');

    expect(rulesForExactClass('ms')).toContain('text-align: center');
    expect(rulesForExactClass('ms')).toContain('font-weight: 500');
    expect(rulesForExactClass('ms')).toContain('margin-block-end: 0.6em');
    expect(rulesForExactClass('ms1')).toContain('font-size: 1.17em');
    expect(rulesForExactClass('ms1')).toContain('font-weight: 500');
    expect(rulesForExactClass('mr')).toContain('font-size: 1.17em');
    expect(rulesForExactClass('mr')).toContain('font-style: italic');
    expect(rulesForExactClass('mr')).toContain('text-align: center');

    expect(rulesForExactClass('d')).toContain('text-align: center');
    expect(rulesForExactClass('d')).toContain('font-style: italic');
    expect(rulesForExactClass('d')).toContain('margin-block-start: 0.6em');
    expect(rulesForExactClass('d')).toContain('margin-block-end: 1.2em');

    expect(rulesForExactClass('sp')).toContain('font-size: 1.17em');
    expect(rulesForExactClass('sp')).toContain('font-weight: 500');
    expect(rulesForExactClass('sp')).toContain('font-style: italic');
    expect(rulesForExactClass('qa')).toContain('font-size: 1.17em');
    expect(rulesForExactClass('qa')).toContain('font-weight: 500');
    expect(rulesForExactClass('qa')).toContain('font-style: italic');

    expect(rulesForExactClass('is')).toContain('font-weight: 500');
    expect(rulesForExactClass('is')).toContain('text-align: center');
    expect(rulesForExactClass('imt')).toContain('font-size: 1.17em');
    expect(rulesForExactClass('imt')).toContain('font-weight: 500');
    expect(rulesForExactClass('imt')).toContain('text-align: center');

    expect(rulesForExactClass('q2')).toContain('padding-inline-start: 2em');
    expect(rulesForExactClass('q2')).toContain('text-indent: 0');
    expect(rulesForExactClass('q3')).toContain('padding-inline-start: 3em');
    expect(rulesForExactClass('q4')).toContain('padding-inline-start: 4em');
    expect(rulesForExactClass('iq1')).toContain('padding-inline-start: 1em');
    expect(rulesForExactClass('iq1')).toContain('text-indent: 0');
    expect(rulesForExactClass('iex')).toContain('text-indent: 1em');
    expect(rulesForExactClass('ipi')).toContain('padding-inline-start: 1em');
    expect(rulesForExactClass('im')).toContain('margin-block-start: 0.5em');
    expect(rulesForExactClass('qc')).toContain('text-align: center');
    expect(rulesForExactClass('qc')).toContain('margin-block-start: 0');
    expect(rulesForExactClass('qc')).toContain('margin-block-end: 0');
    expect(rulesForExactClass('qr')).toContain('text-align: end');
    expect(rulesForExactClass('qr')).toContain('font-style: italic');

    expect(rulesForExactClass('qm1')).toContain('padding-inline-start: 1em');
    expect(rulesForExactClass('qm1')).toContain('margin-block-start: 0.5em');
    expect(rulesForExactClass('qm1')).toContain('margin-block-end: 0.5em');
    expect(rulesForExactClass('qm1')).toContain('text-indent: 0');

    expect(rulesForExactClass('m')).toContain('margin-block-start: 0.5em');
    expect(rulesForExactClass('m')).toContain('margin-block-end: 0.5em');
    expect(rulesForExactClass('m')).toContain('text-indent: 0');
    expect(rulesForExactClass('nb')).toContain('text-indent: 0');
    expect(rulesForExactClass('ip')).toContain('margin-block-end: 0.6em');
    expect(rulesForExactClass('ip')).toContain('text-indent: 1em');

    expect(rulesForExactClass('pi')).toContain('margin-block-start: 0.5em');
    expect(rulesForExactClass('pi')).toContain('text-indent: 0');
    expect(rulesForExactClass('pi1')).toContain('padding-inline-start: 1em');
    expect(rulesForExactClass('pi1')).toContain('text-indent: 1em');
    expect(rulesForExactClass('pi1')).toContain('margin-block-end: 0.6em');
    expect(rulesForExactClass('pi2')).toContain('padding-inline-start: 2em');
    expect(rulesForExactClass('pi2')).toContain('text-indent: 1em');
    expect(rulesForExactClass('pi3')).toContain('padding-inline-start: 3em');

    expect(rulesForExactClass('pm')).toContain('padding-inline-start: 1em');
    expect(rulesForExactClass('pm')).toContain('margin-block-start: 0.5em');
    expect(rulesForExactClass('pmr')).toContain('text-align: end');
    expect(rulesForExactClass('pc')).toContain('text-align: center');
    expect(rulesForExactClass('pc')).toContain('font-variant: small-caps');
    expect(rulesForExactClass('pc')).toContain('margin-block-end: 0.6em');

    expect(rulesForExactClass('li1')).toContain('padding-inline-start: 1em');
    expect(rulesForExactClass('li1')).toContain('text-indent: 0');
    expect(rulesForExactClass('li2')).toContain('padding-inline-start: 2em');
    expect(rulesForExactClass('li3')).toContain('padding-inline-start: 3em');
    expect(rulesForExactClass('li4')).toContain('padding-inline-start: 4em');
    expect(rulesForExactClass('ili1')).toContain('padding-inline-start: 1em');
    expect(rulesForExactClass('ili1')).toContain('text-indent: 0');
  });

  it('applies Swift inline styles and drops phase-1 sibling combinators', () => {
    expect(rulesForExactClass('bdit')).toContain('font-weight: 500');
    expect(rulesForExactClass('bdit')).toContain('font-style: italic');
    expect(rulesForExactClass('bdit')).not.toContain('font-weight: bold');

    expect(rulesForExactClass('ord')).toContain('font-size: 0.65em');
    expect(rulesForExactClass('ord')).toContain('top: -0.2em');
    expect(rulesForExactClass('fv')).toContain('font-size: 0.65em');
    expect(rulesForExactClass('fv')).toContain('top: -0.2em');
    expect(rulesForExactClass('sup')).toContain('font-size: 0.65em');
    expect(rulesForExactClass('sup')).toContain('top: -0.2em');
    expect(css).not.toMatch(/&\s*\.note\s+\.fv\s*\{/);

    expect(rulesForExactClass('nd')).toContain('font-variant: small-caps');
    expect(rulesForExactClass('wj')).toContain('color: var(--yv-red)');
    expect(rulesForExactClass('it')).toContain('font-style: italic');
    expect(rulesForExactClass('add')).toContain('font-style: italic');
    expect(rulesForExactClass('qs')).toContain('font-style: italic');
    expect(rulesForExactClass('qs')).not.toContain('display: block');

    expect(css).not.toMatch(/&\s*\.p\s*\+\s*\.s1\b/);
    expect(css).not.toMatch(/&\s*\.q1\s*\+\s*\.p\b/);
    expect(css).not.toMatch(/&\s*\.p\s*\+\s*\.q1\b/);
  });
});
