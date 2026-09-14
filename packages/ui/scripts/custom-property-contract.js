import { parse, walk } from 'css-tree';

const referenceOnlyExceptions = new Set([
  // SDK-owned component input
  '--yv-reader-max-width',
  // Third-party runtime inputs
  '--radix-accordion-content-height',
  '--radix-popover-content-available-height',
  '--radix-popover-content-available-width',
  '--radix-popover-content-transform-origin',
  // Third-party generated fallback inputs
  '--bits-accordion-content-height',
  '--reka-accordion-content-height',
  '--kb-accordion-content-height',
  '--ngp-accordion-content-height',
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
