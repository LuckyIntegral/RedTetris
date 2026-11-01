import globals from 'globals';
import nextPlugin from '@next/eslint-plugin-next';
import stylisticPlugin from '@stylistic/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default [
  {
    ignores: ['client/.next/**', 'client/public/**/*.js', 'server/dist/**', 'node_modules/**', 'build/**', '**/coverage/**', '**/*.d.ts'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/tests/**', '**/*.test.*', '**/*.spec.*'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['**/*.{mjs,cjs,ts,mts,cts,tsx}'],
    plugins: {
      react: reactPlugin,
      '@next/next': nextPlugin,
      'unused-imports': unusedImports,
      '@stylistic': stylisticPlugin,
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'jsx-quotes': ['error', 'prefer-single'],
      'react/jsx-curly-brace-presence': ['error', { propElementValues: 'always' }],
      quotes: ['error', 'single', { avoidEscape: true }],
    },
  },
];
