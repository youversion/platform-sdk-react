/**
 * Pure locale-sync rules for the bundle-size gate.
 *
 * A changed-file set is a locale sync when every path is a locale catalog,
 * the generated resource module, a `.changeset/*.md` file, or `.size-limit.js`
 * (so the ceiling bump committed with the locale PR does not disqualify the
 * next run). `.changeset/config.json` is not a locale path. An empty diff is
 * not a sync.
 *
 * size-limit 11 parses `KB` with bytes-iec metric mode (1 kB = 1000 bytes)
 * and compares brotli bytes. Ceilings are whole kB so `N KB` is N * 1000
 * and still covers the measured size (`sizeLimit >= size` passes).
 */

/** UI JS entries a locale catalog is allowed to grow. */
export const RAISABLE_UI_ENTRIES = ['ui / YouVersionProvider only', 'ui / full barrel'];

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
 * @param {number} sizeBytes brotli size reported by size-limit
 * @returns {string} whole-kB limit, rounded up
 */
export function wholeKbLimit(sizeBytes) {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    throw new Error(`Bundle size must be a non-negative finite number, received ${sizeBytes}`);
  }
  const kb = Math.ceil(sizeBytes / 1000);
  return `${kb} KB`;
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
 *   status: 'pass' | 'fail' | 'raise',
 *   updates: Array<{ name: string, limit: string }>,
 *   exceeded: Array<{ name: string, size: number, sizeLimit: number }>,
 * }}
 */
export function decideSizeLimitAction(checks, files) {
  const exceeded = [];
  for (const check of checks) {
    if (check.passed !== false) continue;
    if (typeof check.size !== 'number' || typeof check.sizeLimit !== 'number' || !check.name) {
      return { status: 'fail', updates: [], exceeded };
    }
    exceeded.push({ name: check.name, size: check.size, sizeLimit: check.sizeLimit });
  }
  if (exceeded.length === 0) return { status: 'pass', updates: [], exceeded };
  if (!isPureLocaleSync(files)) return { status: 'fail', updates: [], exceeded };

  const updates = [];
  for (const check of exceeded) {
    if (!RAISABLE_UI_ENTRIES.includes(check.name)) {
      return { status: 'fail', updates: [], exceeded };
    }
    updates.push({ name: check.name, limit: wholeKbLimit(check.size) });
  }
  return { status: 'raise', updates, exceeded };
}

/**
 * Replace `limit` for the named checks. Other entries stay as they are.
 *
 * @param {string} source
 * @param {readonly { name: string, limit: string }[]} updates
 * @returns {string}
 */
export function applyLimitUpdates(source, updates) {
  const limits = new Map(updates.map((update) => [update.name, update.limit]));
  const replaced = new Set();
  let currentName = '';
  const lines = source.split('\n').map((line) => {
    const name = line.match(/^\s*name:\s*'([^']*)',?\s*$/);
    if (name) currentName = name[1];
    if (currentName === '' || !limits.has(currentName)) return line;
    if (!/^\s*limit:\s*'[^']*',?\s*$/.test(line)) return line;
    replaced.add(currentName);
    const limit = limits.get(currentName);
    return line.replace(/'[^']*'/, `'${limit}'`);
  });
  for (const name of limits.keys()) {
    if (!replaced.has(name)) {
      throw new Error(`No limit entry named ${name} in .size-limit.js`);
    }
  }
  return lines.join('\n');
}
