import { parse, walk } from 'css-tree';

const referenceOnlyExceptions = new Map([
  [
    '--yv-reader-max-width',
    {
      category: 'SDK-owned component input',
      supplier: 'BibleCard inline style or the 65ch literal fallback',
      reason: 'The core reader stylesheet is also published for configurable light-DOM use.',
    },
  ],
  [
    '--radix-accordion-content-height',
    {
      category: 'third-party runtime input',
      supplier: '@radix-ui/react-accordion',
      reason: 'Radix sets the measured content height on its accordion content element.',
    },
  ],
  [
    '--radix-popover-content-available-height',
    {
      category: 'third-party runtime input',
      supplier: '@radix-ui/react-popover',
      reason: 'Radix sets the available height on the popover content element.',
    },
  ],
  [
    '--radix-popover-content-available-width',
    {
      category: 'third-party runtime input',
      supplier: '@radix-ui/react-popover',
      reason: 'Radix sets the available width on the popover content element.',
    },
  ],
  [
    '--radix-popover-content-transform-origin',
    {
      category: 'third-party runtime input',
      supplier: '@radix-ui/react-popover',
      reason: 'Radix sets the transform origin on the popover content element.',
    },
  ],
  ...[
    '--bits-accordion-content-height',
    '--reka-accordion-content-height',
    '--kb-accordion-content-height',
    '--ngp-accordion-content-height',
  ].map((name) => [
    name,
    {
      category: 'third-party generated fallback input',
      supplier: 'tw-animate-css',
      reason: 'The imported cross-framework accordion fallback chain terminates in auto.',
    },
  ]),
]);

function sorted(values) {
  return [...values].sort();
}

/**
 * Inventory custom-property names in one compiled stylesheet.
 *
 * This is intentionally a name-level check: a declaration or @property
 * registration explains a reference, but does not prove selector-level cascade
 * reachability. The reviewed exceptions cover reference-only runtime inputs.
 */
export function auditCustomProperties(css) {
  const ast = parse(css, { context: 'stylesheet', parseCustomProperty: true });
  const declarations = new Set();
  const references = new Set();

  walk(ast, (node) => {
    if (node.type === 'Declaration' && node.property.startsWith('--')) {
      declarations.add(node.property);
      return;
    }

    if (node.type === 'Atrule' && node.name.toLowerCase() === 'property') {
      const name = node.prelude?.children.first;
      const hasInitialValue =
        node.block?.children.some(
          (child) => child.type === 'Declaration' && child.property === 'initial-value',
        ) ?? false;

      if (name?.type === 'Identifier' && name.name.startsWith('--') && hasInitialValue) {
        declarations.add(name.name);
      }
      return;
    }

    if (node.type === 'Function' && node.name.toLowerCase() === 'var') {
      const name = node.children.first;
      if (name?.type === 'Identifier' && name.name.startsWith('--')) {
        references.add(name.name);
      }
    }
  });

  const unexplainedReferences = [...references].filter(
    (name) => !declarations.has(name) && !referenceOnlyExceptions.has(name),
  );

  return {
    declarations: sorted(declarations),
    references: sorted(references),
    unexplainedReferences: sorted(unexplainedReferences),
  };
}
