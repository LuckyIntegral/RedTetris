import globals from 'globals';
import nextPlugin from '@next/eslint-plugin-next';
import stylisticPlugin from '@stylistic/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactCompilerPlugin from 'eslint-plugin-react-compiler';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

/** @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigFile} */
export default [
  {
    ignores: ['client/.next/**', 'client/public/**/*.js', 'server/dist/**', 'node_modules/**', 'build/**', '**/*.d.ts'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.{mjs,cjs,ts,mts,cts,tsx}'],
    plugins: {
      react: reactPlugin,
      '@next/next': nextPlugin,
      'unused-imports': unusedImports,
      '@stylistic': stylisticPlugin,
      'react-compiler': reactCompilerPlugin,
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
