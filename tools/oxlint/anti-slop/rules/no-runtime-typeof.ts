import { defineRule } from '@oxlint/plugins';

import type { ESTree, SourceCode } from '@oxlint/plugins';

type RuntimeFunction = ESTree.ArrowFunctionExpression | ESTree.Function;

function isRuntimeFunction(node: ESTree.Node): node is RuntimeFunction {
  return (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionDeclaration' ||
    node.type === 'FunctionExpression'
  );
}

function isInsideTypeGuard(node: ESTree.Node): boolean {
  let current: ESTree.Node | null = node.parent;
  while (current !== null && current.type !== 'Program') {
    if (isRuntimeFunction(current)) {
      return current.returnType?.typeAnnotation.type === 'TSTypePredicate';
    }
    current = current.parent;
  }
  return false;
}

function probesGlobalExistence(node: ESTree.UnaryExpression, sourceCode: SourceCode): boolean {
  const comparison = node.parent;
  if (
    comparison.type !== 'BinaryExpression' ||
    !['===', '!==', '==', '!='].includes(comparison.operator)
  )
    return false;
  const other = comparison.left === node ? comparison.right : comparison.left;
  if (
    other.type !== 'Literal' ||
    other.value !== 'undefined' ||
    node.argument.type !== 'Identifier'
  )
    return false;
  return sourceCode
    .getScope(node)
    .references.some(
      (ref) =>
        ref.identifier === node.argument &&
        (ref.resolved === null ||
          ref.resolved.defs.every(
            (def) => def.parent?.type === 'VariableDeclaration' && def.parent.declare,
          )),
    );
}

/** Disallow runtime typeof checks that narrow unparsed values instead of decoding them. */
export const noRuntimeTypeofRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow runtime typeof checks; external values must be decoded into meaningful types at their I/O boundary.',
    },
    messages: {
      runtimeTypeof:
        'A `typeof` check narrows a representation without establishing its contract. Parse input at its I/O boundary, then branch on the domain value.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTypeGuards: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ allowInTypeGuards: false }],
  },
  createOnce(context) {
    return {
      UnaryExpression(node) {
        const option = context.options?.[0];
        const allowInTypeGuards =
          typeof option === 'object' &&
          option !== null &&
          !Array.isArray(option) &&
          option.allowInTypeGuards === true;
        if (
          node.operator === 'typeof' &&
          !probesGlobalExistence(node, context.sourceCode) &&
          (!allowInTypeGuards || !isInsideTypeGuard(node))
        ) {
          context.report({ node, messageId: 'runtimeTypeof' });
        }
      },
    };
  },
});
