/**
 * Computed-style diff harness.
 *
 * "The component looks wrong" is not a test result. This module turns that
 * judgment into a number. It reads every tracked computed property on every
 * element of an SDK subtree. It does that once clean, and once under consumer
 * host CSS. Then it reports the exact (element, property) pairs that moved.
 *
 * The output is the residual-leak report that YPE-4113 asks for. The same
 * numbers are the pass/fail gate for the later isolation phases.
 */

/**
 * The properties that the report watches.
 *
 * Longhands only. A shorthand such as `padding` reads back as one string in some
 * engines, and as an empty string in others. The phase gates also name
 * individual sides (`padding-top`). Each entry here is one of three kinds:
 *
 * - A box-model property that a consumer reset can move.
 * - A typography property that a consumer `body` rule can inherit into us.
 * - A color.
 *
 * Two properties are absent on purpose: `transform` and `opacity`.
 * `tw-animate-css` animates both. A sample taken during an animation reports a
 * leak that is only a timing artifact.
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
  // Color
  'color',
  'background-color',
] as const;

export type TrackedProperty = (typeof TRACKED_PROPERTIES)[number];

/** Structural path -> computed values for the element at that path. */
export type StyleSnapshot = Map<string, Record<string, string>>;

/** Elements whose computed style says nothing about how the component looks. */
const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE']);

/**
 * A path that identifies an element by its position, not by its name.
 *
 * Class names do change between a clean render and a consumer render. That is not
 * the worry. The worry is that any identity based on styling is circular. A tag
 * name plus a same-tag sibling index is stable while the DOM shape is stable.
 * A diff is meaningful under that same condition only.
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
 * Reads every tracked property on `root` and on its descendants.
 *
 * Call this function against the SDK subtree, not against the Storybook canvas.
 * The canvas root is consumer DOM, and the SDK makes no promise about it. A
 * snapshot that holds the canvas root reports a false positive on every run.
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
  consumer: string;
};

/**
 * Compares two snapshots of the same subtree.
 *
 * A path that is in one snapshot only is skipped, not reported. A missing path
 * means that the DOM shape changed between the two renders. That is a harness
 * error, not a style leak, and a report of it hides the real findings.
 */
export function diffSnapshots(clean: StyleSnapshot, consumer: StyleSnapshot): StyleLeak[] {
  const leaks: StyleLeak[] = [];

  for (const [path, cleanValues] of clean) {
    const consumerValues = consumer.get(path);
    if (!consumerValues) continue;

    for (const property of Object.keys(cleanValues)) {
      const cleanValue = cleanValues[property];
      const consumerValue = consumerValues[property];

      if (consumerValue === undefined) continue;
      if (cleanValue === consumerValue) continue;

      leaks.push({ path, property, clean: cleanValue ?? '', consumer: consumerValue });
    }
  }

  return leaks;
}

/** The distinct property names in a leak set, sorted. The tests assert on this list. */
export function leakedProperties(leaks: StyleLeak[]): string[] {
  return [...new Set(leaks.map((leak) => leak.property))].sort();
}

/** Leak counts per property, highest count first. The residual report reads this list. */
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
 * Formats a leak set as a table for the console.
 *
 * A person reads the residual report to decide whether to ship shadow DOM. The
 * harness thus prints the findings, and does not only assert on them.
 */
export function formatLeakReport(label: string, leaks: StyleLeak[]): string {
  if (leaks.length === 0) return `${label}: no leaks`;

  const lines = summarizeLeaks(leaks).map(({ property, count }) => `  ${property} x${count}`);
  return [`${label}: ${leaks.length} leak(s)`, ...lines].join('\n');
}
