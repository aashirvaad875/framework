import sharedConfig from '@dancha/eslint-config';

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
