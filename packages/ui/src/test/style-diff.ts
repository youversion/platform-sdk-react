/**
 * Computed-style diff harness.
 *
 * "The component looks wrong" is not a test result. This module turns that
 * judgement into a number: snapshot every tracked computed property on every
 * element of an SDK subtree, do it once clean and once under hostile host CSS,
 * and report the exact (element, property) pairs that moved.
 *
 * The output is the residual-leak report YPE-4113 asks for, and the same numbers
 * are the pass/fail gate for the later isolation phases.
 */

/**
 * The properties the report watches.
 *
 * Longhands only. A shorthand like `padding` reads back as a single string in
 * some engines and as an empty string in others, and the phase gates name
 * individual sides (`padding-top`). Every entry here is either a box-model
 * property a consumer reset can move, a typography property a consumer `body`
 * rule can inherit into us, or a colour.
 *
 * Deliberately excluded: `transform` and `opacity`, which `tw-animate-css`
 * animates. Sampling either one mid-animation produces a leak that is really
 * just a timing artefact.
 */
export const TRACKED_PROPERTIES = [
  // Box model
  'box-sizing',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  // Typography
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'text-align',
  'text-transform',
  'text-indent',
  'white-space',
  'text-decoration-line',
  'list-style-type',
  // Colour
  'color',
  'background-color',
] as const;

export type TrackedProperty = (typeof TRACKED_PROPERTIES)[number];

/** Structural path -> computed values for the element at that path. */
export type StyleSnapshot = Map<string, Record<string, string>>;

/** Elements whose computed style says nothing about how the component looks. */
const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE']);

/**
 * A path that identifies an element by where it sits, not by what it is called.
 *
 * Class names change between a clean and a hostile render is not the worry;
 * the worry is that any identity based on styling would be circular. Tag name
 * plus same-tag sibling index is stable as long as the DOM shape is stable,
 * which is exactly the condition under which a diff is meaningful.
 *
 * @example `div > ul > li[2] > button`
 */
function pathOf(element: Element, parentPath: string | null): string {
  const tag = element.tagName.toLowerCase();

  if (parentPath === null) return tag;

  const parent = element.parentElement;
  let index = 0;
  if (parent) {
    for (const sibling of parent.children) {
      if (sibling === element) break;
      if (sibling.tagName === element.tagName) index += 1;
    }
  }

  const segment = index === 0 ? tag : `${tag}[${index}]`;
  return `${parentPath} > ${segment}`;
}

/**
 * Reads every tracked property on `root` and its descendants.
 *
 * Call this against the SDK subtree, not against the Storybook canvas. The
 * canvas root is consumer DOM, and the SDK makes no promise about it, so
 * including it would report a false positive on every run.
 */
export function snapshotComputedStyles(root: Element): StyleSnapshot {
  const snapshot: StyleSnapshot = new Map();

  const visit = (element: Element, parentPath: string | null): void => {
    if (IGNORED_TAGS.has(element.tagName)) return;

    const path = pathOf(element, parentPath);
    const computed = getComputedStyle(element);
    const values: Record<string, string> = {};

    for (const property of TRACKED_PROPERTIES) {
      values[property] = computed.getPropertyValue(property);
    }

    snapshot.set(path, values);

    for (const child of element.children) visit(child, path);
  };

  visit(root, null);
  return snapshot;
}

/** One property on one element that the host CSS moved. */
export type StyleLeak = {
  path: string;
  property: string;
  clean: string;
  hostile: string;
};

/**
 * Compares two snapshots of the same subtree.
 *
 * Paths present in only one snapshot are skipped rather than reported. A
 * missing path means the DOM shape changed between the two renders, which is a
 * harness problem, not a style leak, and reporting it as a leak would bury the
 * real findings.
 */
export function diffSnapshots(clean: StyleSnapshot, hostile: StyleSnapshot): StyleLeak[] {
  const leaks: StyleLeak[] = [];

  for (const [path, cleanValues] of clean) {
    const hostileValues = hostile.get(path);
    if (!hostileValues) continue;

    for (const property of Object.keys(cleanValues)) {
      const cleanValue = cleanValues[property];
      const hostileValue = hostileValues[property];

      if (hostileValue === undefined) continue;
      if (cleanValue === hostileValue) continue;

      leaks.push({ path, property, clean: cleanValue ?? '', hostile: hostileValue });
    }
  }

  return leaks;
}

/** The distinct property names in a leak set, sorted. Test assertions read this. */
export function leakedProperties(leaks: StyleLeak[]): string[] {
  return [...new Set(leaks.map((leak) => leak.property))].sort();
}

/** Leak counts per property, highest first. The residual report reads this. */
export function summarizeLeaks(leaks: StyleLeak[]): { property: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const leak of leaks) {
    counts.set(leak.property, (counts.get(leak.property) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([property, count]) => ({ property, count }))
    .sort((a, b) => b.count - a.count || a.property.localeCompare(b.property));
}

/**
 * Renders a leak set as a table for the console.
 *
 * The residual report is read by a human deciding whether to ship Shadow DOM,
 * so the harness prints findings rather than only asserting on them.
 */
export function formatLeakReport(label: string, leaks: StyleLeak[]): string {
  if (leaks.length === 0) return `${label}: no leaks`;

  const lines = summarizeLeaks(leaks).map(({ property, count }) => `  ${property} x${count}`);
  return [`${label}: ${leaks.length} leak(s)`, ...lines].join('\n');
}
