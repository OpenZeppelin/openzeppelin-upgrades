module.exports = {
  workerThreads: false,
  files: ['test/*.js'],
  ignoredByWatcher: ['**/*.ts', '.openzeppelin'],
  serial: true,
  failWithoutAssertions: false,
  snapshotDir: '.',
  environmentVariables: {
    FORCE_COLOR: '0',
  },
};
