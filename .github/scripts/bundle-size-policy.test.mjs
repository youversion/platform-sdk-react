import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  applyLimitUpdates,
  decideSizeLimitAction,
  isLocaleSyncPath,
  isPureLocaleSync,
  parseChangedPaths,
  wholeKbLimit,
} from '../../scripts/bundle-size-policy.mjs';

const sizeLimitPackage = realpathSync(
  fileURLToPath(new URL('../../node_modules/size-limit/package.json', import.meta.url)),
);
const bytes = createRequire(sizeLimitPackage)('bytes-iec');

const SOURCE = `export default [
  {
    name: 'core / full barrel (esm)',
    limit: '21.5 KB',
  },
  {
    name: 'ui / YouVersionProvider only',
    limit: '54 KB',
  },
  {
    name: 'ui / Separator only',
    limit: '19 KB',
  },
  {
    name: 'ui / full barrel',
    limit: '175 KB',
  },
];
`;

describe('locale sync bundle-size policy', () => {
  it('treats locale catalogs, the generator, markdown changesets, and the size file as a sync', () => {
    const files = [
      'packages/ui/src/i18n/locales/en.json',
      'packages/ui/src/i18n/locales/fr.json',
      'packages/ui/src/i18n/resources.generated.ts',
      '.changeset/sync-localization-react.md',
      '.changeset/locale-sync-size-limits.md',
      '.size-limit.js',
    ];
    assert.equal(files.every(isLocaleSyncPath), true);
    assert.equal(isPureLocaleSync(files), true);
  });

  it('rejects an empty diff and any file outside the locale set', () => {
    assert.equal(isPureLocaleSync([]), false);
    const strangers = [
      'packages/ui/src/i18n/index.ts',
      'packages/ui/src/i18n/locales/notes.md',
      'packages/ui/src/i18n/locales/nested/en.json',
      '.changeset/nested/extra.md',
      '.changeset/config.json',
      '.changeset/pre.json',
      '.github/workflows/ci.yml',
      'scripts/check-bundle-size.mjs',
      'README.md',
    ];
    for (const file of strangers) {
      assert.equal(isLocaleSyncPath(file), false, file);
      assert.equal(
        isPureLocaleSync(['packages/ui/src/i18n/locales/en.json', file]),
        false,
        file,
      );
    }
  });

  it('reads both paths from a rename in name-status output', () => {
    const paths = parseChangedPaths(
      [
        'M\tpackages/ui/src/i18n/locales/en.json',
        'R100\tpackages/ui/src/Button.tsx\tpackages/ui/src/button.tsx',
        'A\t.changeset/empty.md',
      ].join('\n'),
    );
    assert.deepEqual(paths, [
      'packages/ui/src/i18n/locales/en.json',
      'packages/ui/src/Button.tsx',
      'packages/ui/src/button.tsx',
      '.changeset/empty.md',
    ]);
    assert.equal(isPureLocaleSync(paths), false);
  });

  it('rounds a measured brotli size up to a whole kB that size-limit accepts', () => {
    assert.equal(wholeKbLimit(61.52 * 1000), '62 KB');
    assert.equal(wholeKbLimit(179.15 * 1000), '180 KB');
    assert.equal(wholeKbLimit(62000), '62 KB');
    assert.equal(wholeKbLimit(62001), '63 KB');
    assert.equal(bytes.parse('54 KB'), 54000);
    assert.ok(bytes.parse(wholeKbLimit(61520)) >= 61520);
    assert.ok(bytes.parse(wholeKbLimit(179150)) >= 179150);
  });

  it('passes when every entry is within its limit', () => {
    const decision = decideSizeLimitAction(
      [
        { name: 'ui / YouVersionProvider only', passed: true, size: 54000, sizeLimit: 54000 },
        { name: 'ui / full barrel', passed: true, size: 175000, sizeLimit: 175000 },
      ],
      ['packages/ui/src/components/Button.tsx'],
    );
    assert.equal(decision.status, 'pass');
    assert.deepEqual(decision.updates, []);
  });

  it('fails a non-locale diff without changing limits', () => {
    const checks = [
      { name: 'ui / YouVersionProvider only', passed: false, size: 61520, sizeLimit: 54000 },
      { name: 'ui / full barrel', passed: false, size: 179150, sizeLimit: 175000 },
    ];
    const decision = decideSizeLimitAction(checks, [
      'packages/ui/src/i18n/locales/en.json',
      'packages/ui/src/components/Button.tsx',
    ]);
    assert.equal(decision.status, 'fail');
    assert.deepEqual(decision.updates, []);
  });

  it('raises only the exceeded UI JS entries on a locale sync', () => {
    const decision = decideSizeLimitAction(
      [
        { name: 'ui / YouVersionProvider only', passed: false, size: 61520, sizeLimit: 54000 },
        { name: 'ui / Separator only', passed: true, size: 18000, sizeLimit: 19000 },
        { name: 'ui / full barrel', passed: true, size: 175000, sizeLimit: 175000 },
        { name: 'core / full barrel (esm)', passed: true, size: 21000, sizeLimit: 21500 },
      ],
      ['packages/ui/src/i18n/locales/de.json', '.changeset/sync.md'],
    );
    assert.equal(decision.status, 'raise');
    assert.deepEqual(decision.updates, [
      { name: 'ui / YouVersionProvider only', limit: '62 KB' },
    ]);
    const next = applyLimitUpdates(SOURCE, decision.updates);
    assert.match(next, /name: 'ui \/ YouVersionProvider only',\n\s*limit: '62 KB',/);
    assert.match(next, /limit: '21.5 KB'/);
    assert.match(next, /limit: '19 KB'/);
    assert.match(next, /limit: '175 KB'/);
  });

  it('raises both UI JS entries from the measured brotli sizes', () => {
    const decision = decideSizeLimitAction(
      [
        { name: 'ui / YouVersionProvider only', passed: false, size: 61524, sizeLimit: 54000 },
        { name: 'ui / full barrel', passed: false, size: 179231, sizeLimit: 175000 },
        { name: 'ui / Separator only', passed: true, size: 17386, sizeLimit: 19000 },
      ],
      ['packages/ui/src/i18n/resources.generated.ts', '.size-limit.js'],
    );
    assert.equal(decision.status, 'raise');
    assert.deepEqual(decision.updates, [
      { name: 'ui / YouVersionProvider only', limit: '62 KB' },
      { name: 'ui / full barrel', limit: '180 KB' },
    ]);
    assert.ok(bytes.parse('62 KB') >= 61524);
    assert.ok(bytes.parse('180 KB') >= 179231);
  });

  it('does not raise limits when a locale sync exceeds some other entry', () => {
    const decision = decideSizeLimitAction(
      [
        { name: 'ui / YouVersionProvider only', passed: false, size: 61520, sizeLimit: 54000 },
        { name: 'ui / Separator only', passed: false, size: 20000, sizeLimit: 19000 },
      ],
      ['packages/ui/src/i18n/locales/en.json'],
    );
    assert.equal(decision.status, 'fail');
    assert.deepEqual(decision.updates, []);
  });

  it('does not raise limits when a locale diff also changes changeset config', () => {
    assert.equal(isLocaleSyncPath('.changeset/sync.md'), true);
    assert.equal(isLocaleSyncPath('.changeset/config.json'), false);
    const decision = decideSizeLimitAction(
      [{ name: 'ui / YouVersionProvider only', passed: false, size: 61520, sizeLimit: 54000 }],
      ['packages/ui/src/i18n/locales/en.json', '.changeset/config.json'],
    );
    assert.equal(decision.status, 'fail');
    assert.deepEqual(decision.updates, []);
  });
});
