export default {
  files: ['test/**/*.test.ts'],
  extensions: { ts: 'module' },
  nodeArguments: ['--import', 'tsx'],
  timeout: '60s',
};
