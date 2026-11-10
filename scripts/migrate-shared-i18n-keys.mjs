import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceDir = resolve(root, 'packages/ui/src');
const replacements = {
  shareAriaLabel: 'share',
  languageSearchAriaLabel: 'searchLanguages',
  versionSearchAriaLabel: 'searchVersions',
  fontLabel: 'font',
  closeAriaLabel: 'close',
  searchPlaceholder: 'search',
  selectLanguageAriaLabel: 'selectLanguage',
  regionalHeading: 'regional',
  suggestedTab: 'suggested',
  errorHeading: 'error',
  bibleAppTitle: 'bibleApp',
  passageNotFoundError: 'passageUnavailable',
  genericCancel: 'cancel',
  bibleSearchClearAriaLabel: 'clearSearch',
};
const english = JSON.parse(readFileSync(resolve(sourceDir, 'i18n/locales/en.json'), 'utf8'));
const files = readdirSync(sourceDir, { recursive: true })
  .filter((file) => /\.tsx?$/.test(file) && !/\.(test|stories)\./.test(file))
  .map((file) => resolve(sourceDir, file));
let remaining = 0;

for (const [oldKey, sharedKey] of Object.entries(replacements)) {
  assert.equal(typeof english[sharedKey], 'string', `Missing shared key ${sharedKey}`);
  const tokens = (value) => [...value.matchAll(/\{\{(.*?)\}\}/g)].map((match) => match[1]).sort();
  if (oldKey in english) {
    assert.deepEqual(tokens(english[oldKey]), tokens(english[sharedKey]), oldKey);
  }
  const reference = new RegExp(`(\\bt\\(\\s*['"])${oldKey}(['"])`, 'g');
  let count = 0;
  for (const file of files) {
    const before = readFileSync(file, 'utf8');
    const after = before.replace(reference, (_, prefix, suffix) => {
      count++;
      return `${prefix}${sharedKey}${suffix}`;
    });
    if (before !== after && process.argv.includes('--write')) {
      writeFileSync(file, after);
      assert.equal(reference.test(readFileSync(file, 'utf8')), false, file);
    }
  }
  remaining += count;
  console.log(
    `${oldKey} -> ${sharedKey}: ${count} ${process.argv.includes('--write') ? 'migrated' : 'remaining'}`,
  );
}

for (const locale of ['ko', 'cs']) {
  const strings = JSON.parse(
    readFileSync(resolve(sourceDir, `i18n/locales/${locale}.json`), 'utf8'),
  );
  const missing = [...new Set(Object.values(replacements))].filter((key) => !(key in strings));
  console.log(`${locale} missing shared translations: ${missing.join(', ')}`);
}

if (remaining > 0 && !process.argv.includes('--write')) process.exitCode = 1;
