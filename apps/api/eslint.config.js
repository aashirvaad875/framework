import sharedConfig from '@framework/eslint-config';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...sharedConfig,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
];
