import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const distJs = resolve(uiRoot, 'dist/index.js');
const distCss = resolve(uiRoot, 'dist/stylex.css');

describe('StyleX Expo/Metro contract', () => {
  it.skipIf(!existsSync(distJs) || !existsSync(distCss))(
    'ships precompiled JS and a StyleX sheet so Metro does not need StyleX Babel',
    () => {

    const js = readFileSync(distJs, 'utf8');
    const css = readFileSync(distCss, 'utf8');

    expect(js).not.toMatch(/stylex\.create\s*\(\{/);
    expect(js).not.toMatch(/@stylexjs\/babel-plugin/);
    expect(js).toContain('yv-stylex-spike');
    expect(css).toContain('yv-stylex-spike');
    expect(css).not.toContain('@layer yv-sdk-utilities');
    expect(css).not.toContain('@utility card-content');
    },
  );
});
