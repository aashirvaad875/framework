import sharedConfig from '@framework/eslint-config';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...sharedConfig,
  {
    ignores: ['tooling/**', 'examples/**', '**/dist/**', '**/templates/**'],
  },
];
