module.exports = {
  workerThreads: false,
  files: ['test/*.js'],
  watchMode: {
    ignoreChanges: ['**/*.ts', '.openzeppelin'],
  },
  serial: true,
  failWithoutAssertions: false,
  snapshotDir: '.',
  environmentVariables: {
    FORCE_COLOR: '0',
  },
};
