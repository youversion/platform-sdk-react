/**
 * Pure locale-sync rules for the bundle-size gate.
 *
 * A changed-file set is a locale sync when every path is a locale catalog,
 * the generated resource module, a `.changeset/*.md` file, or `.size-limit.js`
 * (a ceiling edit committed with the locale files stays a locale sync).
 * `.changeset/config.json` is not a locale path. An empty diff is not a sync.
 *
 * A locale sync may exceed `ui / YouVersionProvider only` and
 * `ui / full barrel` without failing the gate. Every other entry still fails
 * when it is over its limit.
 */

/** UI JS entries a locale catalog is allowed to exceed. */
export const SKIPPABLE_UI_ENTRIES = ['ui / YouVersionProvider only', 'ui / full barrel'];

const LOCALE_JSON = /^packages\/ui\/src\/i18n\/locales\/[^/]+\.json$/;
const GENERATED_RESOURCES = 'packages/ui/src/i18n/resources.generated.ts';
const SIZE_LIMIT_FILE = '.size-limit.js';

/**
 * @param {string} file
 * @returns {string}
 */
function normalizePath(file) {
  return file.replaceAll('\\', '/').replace(/^\.\//, '');
}

/**
 * @param {string} file
 * @returns {boolean}
 */
export function isLocaleSyncPath(file) {
  const path = normalizePath(file);
  if (LOCALE_JSON.test(path)) return true;
  if (path === GENERATED_RESOURCES) return true;
  if (path === SIZE_LIMIT_FILE) return true;
  return /^\.changeset\/[^/]+\.md$/.test(path);
}

/**
 * @param {readonly string[]} files
 * @returns {boolean}
 */
export function isPureLocaleSync(files) {
  return files.length > 0 && files.every(isLocaleSyncPath);
}

/**
 * @param {string} nameStatus `git diff --name-status` output
 * @returns {string[]}
 */
export function parseChangedPaths(nameStatus) {
  const paths = [];
  for (const line of nameStatus.split('\n')) {
    if (line === '') continue;
    const tab = line.indexOf('\t');
    if (tab === -1) continue;
    const status = line.slice(0, tab);
    const rest = line.slice(tab + 1);
    if (status.startsWith('R') || status.startsWith('C')) {
      for (const path of rest.split('\t')) paths.push(path);
    } else {
      paths.push(rest);
    }
  }
  return paths;
}

/**
 * @param {Array<{ name?: string, passed?: boolean, size?: number, sizeLimit?: number }>} checks
 * @param {readonly string[]} files
 * @returns {{
 *   status: 'pass' | 'fail' | 'skip',
 *   skipped: string[],
 *   exceeded: Array<{ name: string, size: number, sizeLimit: number }>,
 * }}
 */
export function decideSizeLimitAction(checks, files) {
  const exceeded = [];
  for (const check of checks) {
    if (check.passed !== false) continue;
    if (typeof check.size !== 'number' || typeof check.sizeLimit !== 'number' || !check.name) {
      return { status: 'fail', skipped: [], exceeded };
    }
    exceeded.push({ name: check.name, size: check.size, sizeLimit: check.sizeLimit });
  }
  if (exceeded.length === 0) return { status: 'pass', skipped: [], exceeded };
  if (!isPureLocaleSync(files)) return { status: 'fail', skipped: [], exceeded };

  const skipped = [];
  for (const check of exceeded) {
    if (!SKIPPABLE_UI_ENTRIES.includes(check.name)) {
      return { status: 'fail', skipped: [], exceeded };
    }
    skipped.push(check.name);
  }
  return { status: 'skip', skipped, exceeded };
}
