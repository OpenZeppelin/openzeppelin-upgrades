module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2018,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  env: {
    node: true,
    es2022: true,
  },
  plugins: ['unicorn'],
  rules: {
    curly: 'warn',
    'prettier/prettier': 'warn',
    'unicorn/no-array-reduce': 'warn',
    'no-plusplus': ['warn', { allowForLoopAfterthoughts: true }],
  },
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
      rules: {
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
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
