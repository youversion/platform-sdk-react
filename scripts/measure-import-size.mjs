#!/usr/bin/env node
/**
 * Frozen ruler for the UI bundle-size hillclimb.
 *
 * Minify + gzip-9 + brotli of a consumer import, matching
 * docs/ui-import-size-research.md. size-limit remains the CI gate.
 * This script is the before/after number a reviewer can rerun.
 *
 * Requires a prior UI build (`packages/ui/dist`).
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import * as esbuild from 'esbuild';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const UI_EXTERNAL = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@tanstack/react-query',
  'jsdom',
];

/** @type {Array<{ name: string; path: string; import?: string; external?: string[] }>} */
const TARGETS = [
  {
    name: 'ui / YouVersionProvider only',
    path: 'packages/ui/dist/index.js',
    import: '{ YouVersionProvider }',
    external: UI_EXTERNAL,
  },
  {
    name: 'ui / full barrel',
    path: 'packages/ui/dist/index.js',
    external: UI_EXTERNAL,
  },
  {
    name: 'ui / chrome.css',
    path: 'packages/ui/dist/chrome.css',
  },
  {
    name: 'ui / tailwind.css',
    path: 'packages/ui/dist/tailwind.css',
  },
  {
    name: 'ui / bible-reader.css',
    path: 'packages/ui/dist/bible-reader.css',
  },
];

function compress(bytes) {
  return {
    raw: bytes.byteLength,
    gzip: gzipSync(bytes, { level: 9 }).byteLength,
    brotli: brotliCompressSync(bytes).byteLength,
  };
}

function consumerSource(absEntry, namedImport) {
  const importPath = absEntry.replace(/\\/g, '/');
  if (namedImport) {
    const symbol = namedImport.replace(/[{}\s]/g, '');
    return `import ${namedImport} from '${importPath}';\nexport { ${symbol} };\n`;
  }
  return `import * as pkg from '${importPath}';\nexport default pkg;\n`;
}

async function bundleTarget(target) {
  const absEntry = join(repoRoot, target.path);
  if (!existsSync(absEntry)) {
    throw new Error(`missing ${target.path} — build the UI package first`);
  }

  if (!target.external) {
    return compress(readFileSync(absEntry));
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'yv-measure-'));
  const consumerPath = join(tempDir, 'consumer.mjs');
  writeFileSync(consumerPath, consumerSource(absEntry, target.import), 'utf8');

  try {
    const result = await esbuild.build({
      absWorkingDir: repoRoot,
      entryPoints: [consumerPath],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      minify: true,
      treeShaking: true,
      write: false,
      external: target.external,
      logLevel: 'silent',
    });
    const bytes = result.outputFiles?.[0]?.contents;
    if (!bytes) {
      throw new Error(`${target.name}: esbuild produced no output`);
    }
    return compress(bytes);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function pad(n) {
  return n.toLocaleString('en-US').padStart(12);
}

async function main() {
  console.log('Import size (minify + gzip-9 + brotli)');
  console.log('  react, react-dom, jsx-runtime, react-query, jsdom are external');
  console.log('  esbuild without splitting inlines import() locale chunks');
  console.log('');
  console.log(`${'name'.padEnd(36)}${'raw'.padStart(12)}${'gzip'.padStart(12)}${'brotli'.padStart(12)}`);

  for (const target of TARGETS) {
    const sizes = await bundleTarget(target);
    console.log(
      `${target.name.padEnd(36)}${pad(sizes.raw)}${pad(sizes.gzip)}${pad(sizes.brotli)}`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
