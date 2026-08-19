import { defineConfig } from 'oxlint';

const antiSlopRules = {
  'anti-slop/no-chained-type-assertions': 'error',
  'anti-slop/no-conditional-empty-object-spread': 'error',
  'anti-slop/no-known-value-widening': 'error',
  'anti-slop/no-module-mocking': 'error',
  'anti-slop/no-object-parameters': 'error',
  'anti-slop/no-reflect-apply': 'error',
  'anti-slop/no-reflect-get': 'error',
  'anti-slop/no-runtime-typeof': 'error',
  'anti-slop/no-shape-in-symbol-names': 'error',
  'anti-slop/no-unknown-parameters': 'error',
  'anti-slop/no-unknown-returns': 'error',
  'anti-slop/no-unknown-type-aliases': 'error',
  'anti-slop/no-unsafe-dictionary-type': 'error',
  'anti-slop/no-widen-then-assert': 'error',
  'anti-slop/require-safety-comment-for-type-assertion': 'error',
} as const;

export default defineConfig({
  options: {
    typeAware: true,
  },
  ignorePatterns: [
    '.agent/**',
    '.agents/**',
    '.claude/**',
    '.codex/**',
    '.continue/**',
    '.cursor/**',
    '.gemini/**',
    '.omc/**',
    '.opencode/**',
    '.pi/**',
    '.roo/**',
    '.superset/**',
    '.windsurf/**',
    '**/scripts/**',
    'tools/oxlint/anti-slop/**',
    '**/*.config.js',
    '**/*.config.cjs',
    '**/*.config.mjs',
    '**/*.config.ts',
    '**/.storybook/**',
    '**/build-*.js',
    '**/dist/**',
    '**/storybook-static/**',
    '**/next-env.d.ts',
  ],
  jsPlugins: [
    { name: 'anti-slop', specifier: './tools/oxlint/anti-slop/index.ts' },
    { name: 'i18next', specifier: 'eslint-plugin-i18next' },
  ],
  categories: {
    correctness: 'error',
  },
  rules: {
    ...antiSlopRules,
    'typescript/no-explicit-any': 'off',
    'typescript/restrict-template-expressions': ['error', { allowNumber: true }],
    'typescript/prefer-nullish-coalescing': 'off',
    'typescript/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
    ],
    'typescript/explicit-module-boundary-types': 'error',
    'typescript/no-floating-promises': 'error',
    'typescript/no-misused-promises': 'error',
    'typescript/await-thenable': 'error',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
  },
  overrides: [
    {
      files: ['examples/**'],
      rules: {
        'typescript/explicit-module-boundary-types': 'off',
      },
    },
    {
      files: ['packages/ui/src/components/**/*.tsx'],
      excludeFiles: ['**/*.test.tsx', '**/*.stories.tsx'],
      rules: {
        'i18next/no-literal-string': [
          'error',
          {
            framework: 'react',
            mode: 'jsx-only',
            'jsx-attributes': {
              include: ['aria-label', 'title', 'placeholder', 'alt'],
            },
          },
        ],
      },
    },
  ],
});
