import { defineRule } from '@oxlint/plugins';
import type { ESTree } from '@oxlint/plugins';

const FORBIDDEN_SYMBOL_NAME = 'shape';

function containsForbiddenSymbolName(name: string): boolean {
  return name.toLowerCase().includes(FORBIDDEN_SYMBOL_NAME);
}

/** Reject vague shape names without asking callers to rename a static member access. */
export const noForbiddenTermInSymbolNamesRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow the case-insensitive substring "shape" in symbol names except statically accessed members.',
    },
    messages: {
      forbiddenSymbolName:
        'Rename symbol "{{name}}" for its domain role; "shape" describes structure rather than ownership.',
    },
  },
  createOnce(context) {
    const reportForbiddenSymbolName = (node: ESTree.Node & { name: string }) => {
      if (!containsForbiddenSymbolName(node.name)) return;
      const parent = node.parent;
      if (parent?.type === 'MemberExpression' && !parent.computed && parent.property === node)
        return;
      if (
        parent?.type === 'Property' &&
        parent.parent.type === 'ObjectPattern' &&
        !parent.computed &&
        !parent.shorthand &&
        parent.key === node
      )
        return;
      context.report({
        node,
        messageId: 'forbiddenSymbolName',
        data: { name: node.name },
      });
    };

    return {
      Identifier: reportForbiddenSymbolName,
      PrivateIdentifier: reportForbiddenSymbolName,
      JSXIdentifier: reportForbiddenSymbolName,
    };
  },
});
