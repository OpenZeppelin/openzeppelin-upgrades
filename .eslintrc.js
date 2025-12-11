module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2022,
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
  ignorePatterns: [
    'submodules',
    // ESLint 8.x doesn't support ES2025 import attributes syntax
    // uses import attributes (import ... with { type: 'json' })
    // which is valid ES2025 syntax but ESLint parser doesn't support it yet
    'packages/plugin-hardhat/test/*.js',
  ],
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
      files: ['ava.config.js', 'packages/plugin-hardhat/test/*.js', 'packages/plugin-hardhat/src/*.js'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      rules: {
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
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
