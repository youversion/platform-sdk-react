import { describe, it } from 'node:test';
import { RuleTester } from 'oxlint/plugins-dev';
import config from '../../../oxlint.config.ts';
import { noRuntimeTypeofRule } from './rules/no-runtime-typeof.ts';
import { noUnknownParametersRule } from './rules/no-unknown-parameters.ts';
import { noForbiddenTermInSymbolNamesRule } from './rules/no-shape-in-symbol-names.ts';
import { requireSafetyCommentForTypeAssertionRule } from './rules/require-safety-comment-for-type-assertion.ts';

RuleTester.describe = describe;
RuleTester.it = it;
const tester = new RuleTester({ languageOptions: { parserOptions: { lang: 'ts' } } });
const guard =
  "function isText(value: unknown): value is string { return typeof value === 'string'; }";
const ordinary = "function isText(value: unknown): boolean { return typeof value === 'string'; }";
const setting = config.rules['anti-slop/no-runtime-typeof'];
const options = Array.isArray(setting) ? setting.slice(1) : [];

tester.run('no-runtime-typeof', noRuntimeTypeofRule, {
  valid: [
    { code: guard, options },
    { code: "typeof window !== 'undefined'", options },
    {
      code: "declare const __SDK_PACKAGE_VERSION__: string; typeof __SDK_PACKAGE_VERSION__ !== 'undefined';",
      options,
    },
  ],
  invalid: [
    ordinary,
    "function hasValue(window: string | undefined) { return typeof window !== 'undefined'; }",
    "declare const version: string; function check(version: string) { return typeof version !== 'undefined'; }",
  ].map((code) => ({ code, options, errors: [{ messageId: 'runtimeTypeof' }] })),
});

tester.run('no-unknown-parameters', noUnknownParametersRule, {
  valid: [guard, 'function report(cause: unknown): void {}'],
  invalid: [
    ordinary,
    'function matches(other: unknown, value: unknown): value is string { return other === value; }',
  ].map((code) => ({ code, errors: [{ messageId: 'unknownParameter' }] })),
});

tester.run('require-safety-comment-for-type-assertion', requireSafetyCommentForTypeAssertionRule, {
  valid: [
    '// SAFETY: The caller validated the ID.\nexport const id = raw as Id;',
    '// SAFETY:\n// The caller validated the ID.\nexport const id = raw as Id;',
    'const event = "click" as const;',
  ],
  invalid: [
    '// SAFETY:   \nconst id = raw as Id;',
    '// SAFETY:\n\n// Unrelated comment.\nconst id = raw as Id;',
    '/** SAFETY:\n *\n */\nconst id = raw as Id;',
    'export const id = raw as Id;',
  ].map((code) => ({ code, errors: [{ messageId: 'missingSafetyComment' }] })),
});

tester.run('no-shape-in-symbol-names', noForbiddenTermInSymbolNamesRule, {
  valid: [
    'const fields = schema.shape;',
    'const fields = schema?.shape;',
    'const { shape: fields } = schema;',
  ],
  invalid: [
    'const payloadShape = {};',
    'schema[payloadShape];',
    'const { fields: payloadShape } = schema;',
    'const { [shape]: fields } = schema;',
  ].map((code) => ({
    code,
    errors: [{ messageId: 'forbiddenSymbolName' }],
  })),
});
