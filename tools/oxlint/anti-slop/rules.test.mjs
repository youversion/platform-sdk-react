import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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

it('enforces SDK source restrictions without applying them to host examples', (t) => {
  const root = resolve(import.meta.dirname, '../../..');
  const cwd = mkdtempSync(join(tmpdir(), 'sdk-lint-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  copyFileSync(join(root, 'oxlint.config.ts'), join(cwd, 'oxlint.config.ts'));
  for (const dir of ['tools', 'node_modules']) {
    symlinkSync(join(root, dir), join(cwd, dir), 'junction');
  }
  const fixtures = {
    'packages/core/src/check.ts': [
      "require('@youversion/platform-react-hooks');",
      "import 'react/jsx-runtime';",
      "export type { ReactNode } from 'react';",
      "import 'zod/mini';",
    ],
    'packages/hooks/src/check.ts': [
      "import '@youversion/platform-react-ui';",
      "import '@youversion/platform-core';",
    ],
    'packages/ui/src/check.ts': [
      'export type Input = any;',
      "import '@youversion/platform-react-hooks';",
    ],
    'examples/check.ts': ["require('react');", 'export type Input = any;'],
  };
  for (const [file, lines] of Object.entries(fixtures)) {
    mkdirSync(join(cwd, dirname(file)), { recursive: true });
    writeFileSync(join(cwd, file), lines.join('\n'));
  }
  const run = spawnSync(
    process.execPath,
    [join(root, 'node_modules/oxlint/bin/oxlint'), '--format=json', ...Object.keys(fixtures)],
    { cwd, encoding: 'utf8' },
  );
  assert.equal(run.status, 1, run.stderr || run.stdout);
  const result = JSON.parse(run.stdout);
  assert.equal(result.number_of_files, 4);
  assert.deepEqual(
    result.diagnostics
      .map(
        ({ filename, labels, code }) =>
          `${filename.replaceAll('\\', '/')}:${labels[0].span.line} ${code}`,
      )
      .sort(),
    [
      'packages/core/src/check.ts:1 typescript(no-require-imports)',
      'packages/core/src/check.ts:2 eslint(no-restricted-imports)',
      'packages/hooks/src/check.ts:1 eslint(no-restricted-imports)',
      'packages/ui/src/check.ts:1 typescript(no-explicit-any)',
    ],
  );
});

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
