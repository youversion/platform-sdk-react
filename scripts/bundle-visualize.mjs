#!/usr/bin/env node
/**
 * Generate esbuild metafile JSON reports for https://esbuild.github.io/analyze/
 *
 * Fallback when `pnpm size:why` is unavailable (preset-small-lib does not
 * support --why). Writes bundle-report/<pkg>-<entry>.json artifacts.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = join(repoRoot, 'bundle-report');

/** @type {Array<{ id: string; entry: string; import?: string; external?: string[] }>} */
const TARGETS = [
  {
    id: 'core-index',
    entry: 'packages/core/dist/index.js',
  },
  {
    id: 'core-apiclient',
    entry: 'packages/core/dist/index.js',
    import: '{ ApiClient }',
  },
  {
    id: 'core-browser',
    entry: 'packages/core/dist/browser.js',
    import: '{ transformBibleHtml }',
  },
  {
    id: 'core-server',
    entry: 'packages/core/dist/server.js',
  },
  {
    id: 'hooks-index',
    entry: 'packages/hooks/dist/index.js',
    external: ['react', 'react-dom'],
  },
  {
    id: 'hooks-usechapter',
    entry: 'packages/hooks/dist/index.js',
    import: '{ useChapter }',
    external: ['react', 'react-dom'],
  },
  {
    id: 'ui-index',
    entry: 'packages/ui/dist/index.js',
    import: '{ YouVersionProvider }',
    external: ['react', 'react-dom'],
  },
];

function buildConsumerSource(target) {
  const importPath = join(repoRoot, target.entry).replace(/\\/g, '/');
  if (target.import) {
    const symbol = target.import.replace(/[{}\s]/g, '');
    if (symbol === 'ApiClient') {
      return `import ${target.import} from '${importPath}';\nnew ApiClient({ apiHost: 'https://api.youversion.com' });\n`;
    }
    if (symbol === 'useChapter') {
      return `import ${target.import} from '${importPath}';\nexport { ${symbol} };\n`;
    }
    if (symbol === 'transformBibleHtml') {
      return `import ${target.import} from '${importPath}';\nexport { ${symbol} };\n`;
    }
    if (symbol === 'YouVersionProvider') {
      return `import ${target.import} from '${importPath}';\nexport { ${symbol} };\n`;
    }
    return `import ${target.import} from '${importPath}';\nvoid ${symbol};\n`;
  }
  return `import * as pkg from '${importPath}';\nexport default pkg;\n`;
}

async function analyzeTarget(target, tempDir) {
  const consumerPath = join(tempDir, `.consumer-${target.id}.mjs`);
  const consumerSource = buildConsumerSource(target);
  writeFileSync(consumerPath, consumerSource, 'utf8');

  const external = target.external ?? [];
  if (target.entry.includes('core/')) {
    external.push('jsdom');
  }

  const result = await esbuild.build({
    absWorkingDir: repoRoot,
    entryPoints: [consumerPath],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    minify: false,
    treeShaking: true,
    metafile: true,
    write: false,
    external,
    logLevel: 'silent',
  });

  const outPath = join(reportDir, `${target.id}.json`);
  writeFileSync(outPath, JSON.stringify(result.metafile), 'utf8');
  const bytes = result.outputFiles?.[0]?.contents.byteLength ?? 0;
  return { id: target.id, outPath, bytes };
}

async function main() {
  mkdirSync(reportDir, { recursive: true });
  const tempDir = mkdtempSync(join(tmpdir(), 'yv-bundle-visualize-'));

  try {
    const results = [];
    for (const target of TARGETS) {
      results.push(await analyzeTarget(target, tempDir));
    }

    console.log('Bundle analysis reports written to bundle-report/');
    for (const { id, outPath, bytes } of results) {
      console.log(`  ${id}: ${bytes.toLocaleString()} bytes → ${outPath.replace(repoRoot + '/', '')}`);
    }

    const empty = results.filter((r) => r.bytes === 0);
    if (empty.length > 0) {
      console.warn('Warning: some reports have zero bundle size:', empty.map((r) => r.id).join(', '));
    }

    const nonEmpty = results.filter((r) => r.bytes > 0);
    if (nonEmpty.length === 0) {
      console.error('No bundle reports were generated.');
      process.exit(1);
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
