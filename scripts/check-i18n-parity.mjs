#!/usr/bin/env node
/**
 * i18n parity checker for @youversion/platform-react-ui locale bundles.
 *
 * Hard-fail (exit 1): invalid JSON, t()/i18nKey references missing from en.json,
 * extra translation locale keys not in en.json, interpolation token mismatches,
 * stale resources.generated.ts (run pnpm generate:i18n).
 *
 * Warn-only (exit 0): en.json keys missing from translation locales (upstream Crowdin sync),
 * orphan en.json keys unused in UI source (static scan misses dynamic t() patterns;
 * add intentional dynamic keys to ORPHAN_KEY_ALLOWLIST).
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const localesDir = resolve(repoRoot, 'packages/ui/src/i18n/locales');
const uiSrcDir = resolve(repoRoot, 'packages/ui/src');
const generatedResourcesPath = resolve(repoRoot, 'packages/ui/src/i18n/resources.generated.ts');
const generateScriptPath = resolve(repoRoot, 'packages/ui/scripts/generate-i18n-resources.mjs');

function discoverTranslationLocales() {
  return readdirSync(localesDir)
    .filter((file) => file.endsWith('.json') && file !== 'en.json')
    .map((file) => file.replace(/\.json$/, ''))
    .sort((a, b) => a.localeCompare(b));
}

// i18next allows whitespace and formatter args: {{ count }}, {{count, number}}
const INTERPOLATION_TOKEN_RE = /\{\{\s*(\w+)[^}]*\}\}/g;
// Matches literal-string args to any function named `t` (not i18next-specific).
// Dynamic keys (templates/vars) and non-i18n `t()` helpers can false-pos/neg.
const T_CALL_RE = /\bt\(\s*['"]([^'"]+)['"]/g;
const I18N_KEY_RE = /i18nKey\s*=\s*['"]([^'"]+)['"]/g;

/** Keys referenced only via dynamic t(`prefix_${x}`) patterns; static scan cannot detect them. */
const ORPHAN_KEY_ALLOWLIST = new Set([
  // 'action_create',
  // 'action_delete',
]);

const bold = (s) => `\x1B[1m${s}\x1B[0m`;
const dim = (s) => `\x1B[2m${s}\x1B[0m`;
const red = (s) => `\x1B[31m${s}\x1B[0m`;
const yellow = (s) => `\x1B[33m${s}\x1B[0m`;
const green = (s) => `\x1B[32m${s}\x1B[0m`;

const errors = [];
const warnings = [];

function loadLocale(filename) {
  const filePath = join(localesDir, filename);
  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err instanceof SyntaxError) {
      errors.push(`Invalid JSON in ${relative(repoRoot, filePath)}: ${err.message}`);
      return null;
    }
    errors.push(`Unable to read ${relative(repoRoot, filePath)}: ${err.message}`);
    return null;
  }
}

function checkGeneratedResourcesDrift() {
  const before = existsSync(generatedResourcesPath)
    ? readFileSync(generatedResourcesPath, 'utf8')
    : null;

  const result = spawnSync(process.execPath, [generateScriptPath], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    errors.push(
      `Failed to run generate-i18n-resources.mjs${detail ? `: ${detail}` : ''}`,
    );
    return;
  }

  const after = readFileSync(generatedResourcesPath, 'utf8');
  if (before !== after) {
    if (before !== null) {
      writeFileSync(generatedResourcesPath, before, 'utf8');
    }
    errors.push(
      `${relative(repoRoot, generatedResourcesPath)} is out of date. Run \`pnpm generate:i18n\` and commit the updated file.`,
    );
  }
}

function extractInterpolationTokens(value) {
  const tokens = new Set();
  if (typeof value !== 'string') {
    return tokens;
  }
  for (const match of value.matchAll(INTERPOLATION_TOKEN_RE)) {
    tokens.add(match[1]);
  }
  return tokens;
}

function compareInterpolationTokens(enValue, localeValue, locale, key) {
  const enTokens = extractInterpolationTokens(enValue);
  const localeTokens = extractInterpolationTokens(localeValue);

  for (const token of enTokens) {
    if (!localeTokens.has(token)) {
      errors.push(
        `Interpolation mismatch for "${key}" in ${locale}.json: en uses {{${token}}} but translation is missing it`,
      );
    }
  }

  for (const token of localeTokens) {
    if (!enTokens.has(token)) {
      errors.push(
        `Interpolation mismatch for "${key}" in ${locale}.json: translation uses {{${token}}} but en.json does not`,
      );
    }
  }
}

function shouldScanSourceFile(filePath) {
  const rel = relative(uiSrcDir, filePath);
  if (rel.startsWith('i18n/locales/')) {
    return false;
  }
  if (/\.(test|stories)\.[jt]sx?$/.test(rel)) {
    return false;
  }
  return /\.(ts|tsx)$/.test(rel);
}

function walkSourceFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkSourceFiles(fullPath, files);
      continue;
    }
    if (shouldScanSourceFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectUsedKeys() {
  const usedKeys = new Map();

  for (const filePath of walkSourceFiles(uiSrcDir)) {
    const content = readFileSync(filePath, 'utf8');
    const relPath = relative(repoRoot, filePath);

    for (const match of content.matchAll(T_CALL_RE)) {
      const key = match[1];
      if (!usedKeys.has(key)) {
        usedKeys.set(key, []);
      }
      usedKeys.get(key).push(relPath);
    }

    for (const match of content.matchAll(I18N_KEY_RE)) {
      const key = match[1];
      if (!usedKeys.has(key)) {
        usedKeys.set(key, []);
      }
      usedKeys.get(key).push(relPath);
    }
  }

  return usedKeys;
}

console.log(`\n${bold('Checking i18n parity...')}\n`);

checkGeneratedResourcesDrift();

const translationLocales = discoverTranslationLocales();

const en = loadLocale('en.json');
const localeBundles = Object.fromEntries(
  translationLocales.map((locale) => [locale, loadLocale(`${locale}.json`)]),
);

if (!en) {
  reportAndExit();
}

const enKeys = Object.keys(en);
const usedKeys = collectUsedKeys();

for (const [key, locations] of usedKeys) {
  if (!Object.hasOwn(en, key)) {
    const locList = [...new Set(locations)].join(', ');
    errors.push(`Key "${key}" used in source but missing from en.json (${locList})`);
  }
}

for (const key of enKeys) {
  if (!usedKeys.has(key) && !ORPHAN_KEY_ALLOWLIST.has(key)) {
    warnings.push(`Orphan key "${key}" in en.json is not referenced by t() or i18nKey in UI source`);
  }
}

for (const locale of translationLocales) {
  const bundle = localeBundles[locale];
  if (!bundle) {
    continue;
  }

  const localeKeys = new Set(Object.keys(bundle));

  for (const key of enKeys) {
    if (!localeKeys.has(key)) {
      warnings.push(
        `Key "${key}" exists in en.json but is missing from ${locale}.json (upstream Crowdin sync will resolve)`,
      );
    } else {
      compareInterpolationTokens(en[key], bundle[key], locale, key);
    }
  }

  for (const key of localeKeys) {
    if (!Object.hasOwn(en, key)) {
      errors.push(`Extra key "${key}" in ${locale}.json is not present in en.json`);
    }
  }
}

checkLocalesAreRegistered();

reportAndExit();

/**
 * A synced bundle is dead weight until resources.generated.ts includes it,
 * since supportedLngs (and browser-language detection) derives from that map.
 */
function checkLocalesAreRegistered() {
  if (!existsSync(generatedResourcesPath)) {
    errors.push(
      `${relative(repoRoot, generatedResourcesPath)} is missing. Run \`pnpm generate:i18n\`.`,
    );
    return;
  }

  const generated = readFileSync(generatedResourcesPath, 'utf8');

  for (const locale of translationLocales) {
    const quoted = JSON.stringify(locale);
    if (!generated.includes(`${quoted}: { [defaultNS]: locale`)) {
      errors.push(
        `Locale "${locale}.json" is not registered in resources.generated.ts — run \`pnpm generate:i18n\` so browser-language detection can select it`,
      );
    }
  }
}

function reportAndExit() {
  if (warnings.length > 0) {
    console.log(yellow(`Warnings (${warnings.length}):`));
    for (const warning of warnings) {
      console.log(yellow(`  ⚠ ${warning}`));
    }
    console.log(
      dim(
        '\n  Note: Translation locale files (other than en.json) are owned by platform-localization and synced via Crowdin → distribute-react.yml (PRs authored by platform-localization-pr-bot[bot]). Missing translation keys are expected until upstream sync lands.\n',
      ),
    );
    if (warnings.some((w) => w.startsWith('Orphan key'))) {
      console.log(
        dim(
          '\n  Note: Orphan-key warnings use a static scan of t("...") and i18nKey="..." literals. Dynamic keys (e.g. t(`action_${type}`)) are not detected — add them to ORPHAN_KEY_ALLOWLIST in scripts/check-i18n-parity.mjs if intentional.\n',
        ),
      );
    }
  }

  if (errors.length > 0) {
    console.log(red(`\nErrors (${errors.length}):`));
    for (const error of errors) {
      console.log(red(`  ✗ ${error}`));
    }
    console.log(red('\ni18n parity check failed.\n'));
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(yellow('i18n parity check passed with warnings.\n'));
  } else {
    console.log(green('i18n parity check passed.\n'));
  }

  process.exit(0);
}
