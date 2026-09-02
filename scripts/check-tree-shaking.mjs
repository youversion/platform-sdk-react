#!/usr/bin/env node
/**
 * Tree-shaking verification for published SDK packages.
 *
 * Packages are resolved from built dist via esbuild alias; the package.json
 * exports map is not exercised by this script.
 * esbuild bundles a minimal fixture with treeShaking:true, then we assert:
 *
 * 1. Narrow import (one symbol) excludes sentinel string literals from other exports.
 * 2. Control imports (symbols that own those sentinels) still include them (proves
 *    sentinels are valid and the check would catch a regression).
 * 3. Narrow bundle is smaller than a multi-export barrel bundle.
 * 4. Integrity probe: treeShaking:false on the narrow import includes
 *    `probe` (or `absent`) sentinels that still live in that module graph.
 *    Named tsup entries can keep other `absent` strings off the graph entirely.
 *
 * 0. package.json sideEffects matches expected values (webpack/Rollup consumers).
 *
 * Note: esbuild tree-shaking checks use pre-bundled tsup dist and do not honor
 * package.json sideEffects; CI asserts sideEffects separately (step 0).
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PACKAGE_ALIASES = {
  '@youversion/platform-core': join(repoRoot, 'packages/core'),
  '@youversion/platform-core/browser': join(repoRoot, 'packages/core/dist/browser.js'),
  '@youversion/platform-core/server': join(repoRoot, 'packages/core/dist/server.js'),
  '@youversion/platform-react-hooks': join(repoRoot, 'packages/hooks'),
  '@youversion/platform-react-ui': join(repoRoot, 'packages/ui'),
};

const bold = (s) => `\x1B[1m${s}\x1B[0m`;
const green = (s) => `\x1B[32m${s}\x1B[0m`;
const red = (s) => `\x1B[31m${s}\x1B[0m`;
const dim = (s) => `\x1B[2m${s}\x1B[0m`;

/** @type {Array<{ package: string; path: string; sideEffects: boolean | string[] }>} */
const EXPECTED_SIDE_EFFECTS = [
  {
    package: '@youversion/platform-core',
    path: join(repoRoot, 'packages/core/package.json'),
    sideEffects: ['**/*.css'],
  },
  {
    package: '@youversion/platform-react-hooks',
    path: join(repoRoot, 'packages/hooks/package.json'),
    sideEffects: false,
  },
  {
    package: '@youversion/platform-react-ui',
    path: join(repoRoot, 'packages/ui/package.json'),
    sideEffects: ['**/*.css'],
  },
];

/** @param {unknown} actual @param {boolean | string[]} expected */
function sideEffectsEqual(actual, expected) {
  if (actual === expected) return true;
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return actual.length === expected.length && actual.every((v, i) => v === expected[i]);
  }
  return false;
}

function assertPackageSideEffects() {
  const errors = [];
  for (const { package: pkg, path, sideEffects } of EXPECTED_SIDE_EFFECTS) {
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    const actual = manifest.sideEffects;
    if (!sideEffectsEqual(actual, sideEffects)) {
      errors.push(
        `${pkg} package.json sideEffects: expected ${JSON.stringify(sideEffects)}, got ${JSON.stringify(actual)}`,
      );
    }
  }
  return errors;
}

/** @type {Array<{ package: string; external: string[]; narrow: object; controls: object[]; fullBarrel: object }>} */
const CHECKS = [
  {
    package: '@youversion/platform-core',
    external: ['jsdom'],
    narrow: {
      label: 'ApiClient only',
      source: `import { ApiClient } from '@youversion/platform-core';\nnew ApiClient({ apiHost: 'https://api.youversion.com' });\n`,
      absent: [
        'Color must be a 6-character hex string without #',
        'App key is required to request a data exchange token.',
        'Invalid state parameter - possible CSRF attack',
      ],
    },
    controls: [
      {
        label: 'HighlightsClient',
        source: `import { HighlightsClient } from '@youversion/platform-core';\nexport { HighlightsClient };\n`,
        present: ['Color must be a 6-character hex string without #'],
      },
      {
        label: 'DataExchangeClient',
        source: `import { DataExchangeClient } from '@youversion/platform-core';\nexport { DataExchangeClient };\n`,
        present: ['App key is required to request a data exchange token.'],
      },
      {
        label: 'YouVersionAPIUsers',
        source: `import { YouVersionAPIUsers } from '@youversion/platform-core';\nexport { YouVersionAPIUsers };\n`,
        present: ['Invalid state parameter - possible CSRF attack'],
      },
    ],
    fullBarrel: {
      label: 'multi-export barrel',
      source: `import {
  ApiClient,
  BibleClient,
  HighlightsClient,
  DataExchangeClient,
  LanguagesClient,
  OrganizationsClient,
} from '@youversion/platform-core';
export {
  ApiClient,
  BibleClient,
  HighlightsClient,
  DataExchangeClient,
  LanguagesClient,
  OrganizationsClient,
};
`,
    },
  },
  {
    package: '@youversion/platform-react-hooks',
    external: ['react', 'react-dom', 'jsdom', '@tanstack/react-query'],
    narrow: {
      label: 'useChapter only',
      source: `import { useChapter } from '@youversion/platform-react-hooks';\nexport { useChapter };\n`,
      absent: [
        'A redirect URL is required to start sign-in for highlights.',
        'YouVersion context is required to start a data exchange.',
        'youversion-platform:granted-permissions',
        'page_size="*" required 1-3 fields to be specified',
        'Server-side HTML transformation requires "jsdom"',
      ],
      // Auth strings still live on the hooks barrel. The grants key does not:
      // useChapter reads version-filter state, not Configuration.
      probe: [
        'A redirect URL is required to start sign-in for highlights.',
        'YouVersion context is required to start a data exchange.',
      ],
    },
    controls: [
      {
        label: 'useHighlightAuthActions',
        source: `import { useHighlightAuthActions } from '@youversion/platform-react-hooks';\nexport { useHighlightAuthActions };\n`,
        present: [
          'A redirect URL is required to start sign-in for highlights.',
          'YouVersion context is required to start a data exchange.',
        ],
      },
    ],
    fullBarrel: {
      label: 'multi-export barrel',
      source: `import {
  useChapter,
  useHighlightAuthActions,
  useYVAuth,
  useBibleClient,
} from '@youversion/platform-react-hooks';
export { useChapter, useHighlightAuthActions, useYVAuth, useBibleClient };
`,
    },
  },
  {
    package: '@youversion/platform-react-ui',
    external: ['react', 'react/jsx-runtime', 'react-dom', 'jsdom', '@tanstack/react-query'],
    narrow: {
      label: 'YouVersionProvider only',
      source: `import { YouVersionProvider } from '@youversion/platform-react-ui';\nexport { YouVersionProvider };\n`,
      absent: [
        'BibleChapterPicker components must be used within BibleChapterPicker.Root',
        'BibleVersionPicker components must be used within BibleVersionPicker.Root',
        'BibleReader components must be used within BibleReader.Root',
        '--yv-reader-font-size',
        'Verse of The Day',
      ],
      // Named tsup entries keep picker / reader / VOTD off the Provider
      // module graph. Chrome, component, and reader sheets are separate
      // modules, so reader CSS is not on this graph even unshaken. The
      // probe uses a core string that still rides in via hooks.
      probe: ['Color must be a 6-character hex string without #'],
      present: [
        'yv-sdk-styles',
        '@layer yv-sdk-styles',
      ],
    },
    controls: [
      {
        label: 'BibleChapterPicker',
        source: `import { BibleChapterPicker } from '@youversion/platform-react-ui';\nexport { BibleChapterPicker };\n`,
        present: [
          'BibleChapterPicker components must be used within BibleChapterPicker.Root',
        ],
      },
      {
        label: 'BibleVersionPicker',
        source: `import { BibleVersionPicker } from '@youversion/platform-react-ui';\nexport { BibleVersionPicker };\n`,
        present: [
          'BibleVersionPicker components must be used within BibleVersionPicker.Root',
        ],
      },
      {
        label: 'BibleReader',
        source: `import { BibleReader } from '@youversion/platform-react-ui';\nexport { BibleReader };\n`,
        present: [
          'BibleReader components must be used within BibleReader.Root',
          '--yv-reader-font-size',
          'yv-sdk-components',
          'scrollbar-hide',
        ],
      },
    ],
    fullBarrel: {
      label: 'multi-export barrel',
      source: `import { YouVersionProvider, BibleReader, BibleChapterPicker, BibleVersionPicker } from '@youversion/platform-react-ui';\nexport { YouVersionProvider, BibleReader, BibleChapterPicker, BibleVersionPicker };\n`,
    },
  },
];

async function bundleConsumer(source, external, { treeShaking = true } = {}) {
  const tempDir = mkdtempSync(join(tmpdir(), 'yv-tree-shake-'));
  const consumerPath = join(tempDir, 'consumer.mjs');
  writeFileSync(consumerPath, source, 'utf8');

  try {
    const result = await esbuild.build({
      absWorkingDir: repoRoot,
      entryPoints: [consumerPath],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      minify: false,
      treeShaking,
      write: false,
      external,
      alias: PACKAGE_ALIASES,
      logLevel: 'silent',
    });

    return {
      text: result.outputFiles?.[0]?.text ?? '',
      bytes: result.outputFiles?.[0]?.contents.byteLength ?? 0,
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runPackageCheck(check) {
  const errors = [];
  const rows = [];

  const narrow = await bundleConsumer(check.narrow.source, check.external);
  const narrowLeaks = check.narrow.absent.filter((sentinel) => narrow.text.includes(sentinel));
  rows.push({
    kind: 'narrow',
    label: check.narrow.label,
    bytes: narrow.bytes,
    pass: narrowLeaks.length === 0,
    detail:
      narrowLeaks.length === 0
        ? 'no leaked sentinels'
        : `leaked: ${narrowLeaks.map((s) => JSON.stringify(s)).join(', ')}`,
  });
  if (narrowLeaks.length > 0) {
    errors.push(
      `${check.package} narrow import leaked unused-module sentinels: ${narrowLeaks.join(' | ')}`,
    );
  }

  const narrowPresent = check.narrow.present ?? [];
  if (narrowPresent.length > 0) {
    const missingPresent = narrowPresent.filter((sentinel) => !narrow.text.includes(sentinel));
    rows.push({
      kind: 'narrow-present',
      label: `${check.narrow.label} required`,
      bytes: narrow.bytes,
      pass: missingPresent.length === 0,
      detail:
        missingPresent.length === 0
          ? 'expected sentinels present'
          : `missing: ${missingPresent.map((s) => JSON.stringify(s)).join(', ')}`,
    });
    if (missingPresent.length > 0) {
      errors.push(
        `${check.package} narrow import missing required sentinels — styles left the Provider graph`,
      );
    }
  }

  for (const control of check.controls) {
    const bundle = await bundleConsumer(control.source, check.external);
    const missing = control.present.filter((sentinel) => !bundle.text.includes(sentinel));
    rows.push({
      kind: 'control',
      label: control.label,
      bytes: bundle.bytes,
      pass: missing.length === 0,
      detail:
        missing.length === 0
          ? 'expected sentinels present'
          : `missing: ${missing.map((s) => JSON.stringify(s)).join(', ')}`,
    });
    if (missing.length > 0) {
      errors.push(
        `${check.package} control "${control.label}" missing expected sentinels — update sentinels or exports`,
      );
    }
  }

  const full = await bundleConsumer(check.fullBarrel.source, check.external);
  const sizePass = narrow.bytes < full.bytes;
  rows.push({
    kind: 'size',
    label: `${check.narrow.label} vs ${check.fullBarrel.label}`,
    bytes: narrow.bytes,
    pass: sizePass,
    detail: sizePass
      ? `${narrow.bytes.toLocaleString()} B < ${full.bytes.toLocaleString()} B`
      : `${narrow.bytes.toLocaleString()} B >= ${full.bytes.toLocaleString()} B`,
  });
  if (!sizePass) {
    errors.push(
      `${check.package} narrow bundle is not smaller than barrel (${narrow.bytes} vs ${full.bytes} bytes)`,
    );
  }

  const withoutShake = await bundleConsumer(check.narrow.source, check.external, {
    treeShaking: false,
  });
  const probeSentinels = check.narrow.probe ?? check.narrow.absent;
  const shakeProbeHits = probeSentinels.filter((sentinel) =>
    withoutShake.text.includes(sentinel),
  );
  const probePass = shakeProbeHits.length === probeSentinels.length;
  rows.push({
    kind: 'probe',
    label: 'treeShaking:false probe',
    bytes: withoutShake.bytes,
    pass: probePass,
    detail: probePass
      ? `all ${probeSentinels.length} sentinels appear without tree-shaking`
      : shakeProbeHits.length === 0
        ? 'sentinels never appear even with treeShaking:false — sentinels may be stale'
        : `only ${shakeProbeHits.length}/${probeSentinels.length} sentinels appear with treeShaking:false`,
  });
  if (!probePass) {
    errors.push(
      `${check.package} integrity probe failed: sentinels absent even with treeShaking:false`,
    );
  }

  return { package: check.package, rows, errors };
}

async function main() {
  const allErrors = [];
  const allRows = [];

  const sideEffectsErrors = assertPackageSideEffects();
  if (sideEffectsErrors.length > 0) {
    console.error(red(`${sideEffectsErrors.length} package.json sideEffects check(s) failed.`));
    for (const error of sideEffectsErrors) {
      console.error(red(`  ✗ ${error}`));
    }
    process.exit(1);
  }

  for (const check of CHECKS) {
    const result = await runPackageCheck(check);
    allRows.push(result);
    allErrors.push(...result.errors);
  }

  console.log('');
  console.log(bold('Tree-shaking verification'));
  console.log(dim('  Resolved from built dist via esbuild alias; exports map not exercised'));
  console.log('');

  for (const result of allRows) {
    console.log(bold(result.package));
    for (const row of result.rows) {
      const status = row.pass ? green('PASS') : red('FAIL');
      const bundle = `${(row.bytes / 1024).toFixed(1)} KB`.padStart(10);
      console.log(`  ${row.label.padEnd(36)} ${bundle}  ${status}  ${dim(row.detail)}`);
    }
    console.log('');
  }

  if (allErrors.length > 0) {
    console.error(red(`${allErrors.length} tree-shaking check(s) failed.`));
    for (const error of allErrors) {
      console.error(red(`  ✗ ${error}`));
    }
    process.exit(1);
  }

  console.log(green('All tree-shaking checks passed.'));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
