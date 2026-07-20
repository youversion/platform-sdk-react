import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import i18nextPlugin from 'eslint-plugin-i18next';
import prettierConfig from 'eslint-config-prettier';

const typescriptFiles = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];

const applyTypeScriptFileGlobs = (configs) =>
  configs.map((config) => ({
    ...config,
    files: config.files ?? typescriptFiles,
  }));

export default tseslint.config(
  // Base JS recommended
  eslint.configs.recommended,

  // Enable TypeScript Project Service for typed linting (monorepo-friendly)
  {
    name: 'internal/ts-project-service',
    files: typescriptFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },

  // TypeScript ESLint v8 presets (typed)
  ...applyTypeScriptFileGlobs(tseslint.configs.recommendedTypeChecked),
  ...applyTypeScriptFileGlobs(tseslint.configs.stylisticTypeChecked),

  // Allow default project for tests and .d.ts so projectService doesn't error on files outside tsconfig "include"
  {
    name: 'internal/ts-allow-default-project',
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.d.ts'],
    languageOptions: {
      parserOptions: {
        allowDefaultProject: true,
      },
    },
  },

  // i18next: forbid hardcoded user-facing strings in UI components
  {
    name: 'internal/i18next',
    files: ['packages/ui/src/components/**/*.tsx'],
    ignores: ['**/*.test.tsx', '**/*.stories.tsx'],
    plugins: {
      i18next: i18nextPlugin,
    },
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

  // React + Hooks rules
  {
    name: 'internal/react',
    files: ['**/*.jsx', '**/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },

  // Custom TS rules
  {
    name: 'internal/custom-ts-rules',
    files: typescriptFiles,
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Strict async rules
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      // Import style consistency for types
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      // both types and interfaces are fine to use
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },

  // Prettier compatibility: disable conflicting rules
  {
    name: 'internal/prettier',
    rules: {
      ...(prettierConfig.rules || {}),
    },
  },

  // Ignores
  {
    name: 'internal/ignores',
    ignores: [
      'node_modules/**',
      '.turbo/**',
      'coverage/**',
      '**/dist/**',
      '**/build/**',
      '**/lib/**',
      '**/.next/**',
      '**/out/**',
      // Next.js generated env typing file
      '**/next-env.d.ts',
      // Storybook build output
      '**/storybook-static/**',
      // Generated public files (e.g. MSW)
      '**/public/**',
      // common config and build files (avoid linting tool configs)
      '**/*.config.js',
      '**/*.config.cjs',
      '**/*.config.mjs',
      '**/*.config.ts',
      '**/scripts/**',
      '**/build-*.js',
    ],
  },
);
