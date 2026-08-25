import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as babel from '@babel/core';
import stylexPlugin from '@stylexjs/babel-plugin';
import { stylexBabelTransformOptions } from './stylex-config.mjs';

const uiRoot = fileURLToPath(new URL('..', import.meta.url));
const srcRoot = join(uiRoot, 'src');
const coreStyles = join(uiRoot, '../core/src/styles');

const HOST_RESET = `/* Hostile host-page rules cannot generate content around the isolated SDK UI.
   For !important declarations on a shadow host, the shadow-tree declaration
   outranks an outer author declaration by design. */
:host::before,
:host::after {
  content: none !important;
  display: none !important;
}
`;

function collectStylexFiles() {
  return globSync('**/*.{ts,tsx}', { cwd: srcRoot }).
    map((file) => join(srcRoot, file)).
    filter((file) => {
      const code = readFileSync(file, 'utf8');
      return code.includes('@stylexjs/stylex');
    });
}

async function compile() {
  const rules = [];
  for (const filename of collectStylexFiles()) {
    const source = readFileSync(filename, 'utf8');
    const result = await babel.transformAsync(source, {
      ...stylexBabelTransformOptions,
      filename,
    });
    const fileRules = result?.metadata?.stylex;
    if (Array.isArray(fileRules) && fileRules.length > 0) {
      rules.push(...fileRules);
    }
  }

  const stylexCss = stylexPlugin
    .processStylexRules(rules, { useLayers: false })
    // defineVars emit `:root, .hash`. `:root` is the light-DOM document, so
    // remap onto Austin's shadow host and the existing theme root.
    .replaceAll(':root', ':host, [data-yv-sdk]');
  const themeCss = readFileSync(join(coreStyles, 'theme.css'), 'utf8');
  const bibleReaderCss = readFileSync(join(coreStyles, 'bible-reader.css'), 'utf8');

  const bundle = [
    '/* yv-stylex-spike: precompiled StyleX + --yv tokens. No Tailwind utilities. */',
    HOST_RESET,
    themeCss,
    bibleReaderCss,
    stylexCss,
  ].join('\n');

  const generatedDir = join(uiRoot, 'src/styles');
  const distDir = join(uiRoot, 'dist');
  mkdirSync(generatedDir, { recursive: true });
  mkdirSync(distDir, { recursive: true });
  writeFileSync(join(generatedDir, 'stylex.generated.css'), bundle);
  writeFileSync(join(distDir, 'stylex.css'), bundle);

  const fromRoot = relative(uiRoot, join(distDir, 'stylex.css'));
  console.log(`StyleX sheet written (${bundle.length} bytes) → ${fromRoot}`);
}

await compile();
