module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  env: {
    node: true,
  },
  rules: {
    curly: 'warn',
    'prettier/prettier': 'warn',
  },
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    {
      files: ['ava.config.js'],
      parserOptions: {
        sourceType: 'module',
      },
    },
    {
      files: ['packages/plugin-truffle/**'],
      globals: {
        artifacts: 'readonly',
        contract: 'readonly',
        it: 'readonly',
      },
    },
  ],
};
