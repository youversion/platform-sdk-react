import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decideSizeLimitAction,
  isLocaleSyncPath,
  isPureLocaleSync,
  parseChangedPaths,
} from '../../scripts/bundle-size-policy.mjs';

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

  it('passes when every entry is within its limit', () => {
    const decision = decideSizeLimitAction(
      [
        { name: 'ui / YouVersionProvider only', passed: true, size: 54000, sizeLimit: 54000 },
        { name: 'ui / full barrel', passed: true, size: 175000, sizeLimit: 175000 },
      ],
      ['packages/ui/src/components/Button.tsx'],
    );
    assert.equal(decision.status, 'pass');
    assert.deepEqual(decision.skipped, []);
  });

  it('passes a locale sync that stays within every limit', () => {
    const decision = decideSizeLimitAction(
      [
        { name: 'ui / YouVersionProvider only', passed: true, size: 61520, sizeLimit: 62000 },
        { name: 'ui / full barrel', passed: true, size: 179000, sizeLimit: 180000 },
      ],
      ['packages/ui/src/i18n/locales/en.json'],
    );
    assert.equal(decision.status, 'pass');
    assert.deepEqual(decision.skipped, []);
  });

  it('fails a non-locale diff that exceeds a limit', () => {
    const checks = [
      { name: 'ui / YouVersionProvider only', passed: false, size: 61520, sizeLimit: 54000 },
      { name: 'ui / full barrel', passed: false, size: 179150, sizeLimit: 175000 },
    ];
    const decision = decideSizeLimitAction(checks, [
      'packages/ui/src/i18n/locales/en.json',
      'packages/ui/src/components/Button.tsx',
    ]);
    assert.equal(decision.status, 'fail');
    assert.deepEqual(decision.skipped, []);
  });

  it('skips only the exceeded UI JS entries on a locale sync', () => {
    const decision = decideSizeLimitAction(
      [
        { name: 'ui / YouVersionProvider only', passed: false, size: 61520, sizeLimit: 54000 },
        { name: 'ui / Separator only', passed: true, size: 18000, sizeLimit: 19000 },
        { name: 'ui / full barrel', passed: true, size: 175000, sizeLimit: 175000 },
        { name: 'core / full barrel (esm)', passed: true, size: 21000, sizeLimit: 21500 },
      ],
      ['packages/ui/src/i18n/locales/de.json', '.changeset/sync.md'],
    );
    assert.equal(decision.status, 'skip');
    assert.deepEqual(decision.skipped, ['ui / YouVersionProvider only']);
  });

  it('skips both UI JS entries on a locale sync', () => {
    const decision = decideSizeLimitAction(
      [
        { name: 'ui / YouVersionProvider only', passed: false, size: 61524, sizeLimit: 54000 },
        { name: 'ui / full barrel', passed: false, size: 179231, sizeLimit: 175000 },
        { name: 'ui / Separator only', passed: true, size: 17386, sizeLimit: 19000 },
      ],
      ['packages/ui/src/i18n/resources.generated.ts', '.size-limit.js'],
    );
    assert.equal(decision.status, 'skip');
    assert.deepEqual(decision.skipped, [
      'ui / YouVersionProvider only',
      'ui / full barrel',
    ]);
  });

  it('fails when a locale sync exceeds some other entry', () => {
    const decision = decideSizeLimitAction(
      [
        { name: 'ui / YouVersionProvider only', passed: false, size: 61520, sizeLimit: 54000 },
        { name: 'ui / Separator only', passed: false, size: 20000, sizeLimit: 19000 },
      ],
      ['packages/ui/src/i18n/locales/en.json'],
    );
    assert.equal(decision.status, 'fail');
    assert.deepEqual(decision.skipped, []);
  });

  it('fails when a locale diff also changes changeset config', () => {
    assert.equal(isLocaleSyncPath('.changeset/sync.md'), true);
    assert.equal(isLocaleSyncPath('.changeset/config.json'), false);
    const decision = decideSizeLimitAction(
      [{ name: 'ui / YouVersionProvider only', passed: false, size: 61520, sizeLimit: 54000 }],
      ['packages/ui/src/i18n/locales/en.json', '.changeset/config.json'],
    );
    assert.equal(decision.status, 'fail');
    assert.deepEqual(decision.skipped, []);
  });
});
