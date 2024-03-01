module.exports = {
  workerThreads: false, // required because of chdir in tests
  watchMode: {
    ignoreChanges: ['**/*.{ts,map,tsbuildinfo}', 'artifacts', 'cache'],
  },
  typescript: {
    rewritePaths: { 'src/': 'dist/' },
    compile: false,
  },
  environmentVariables: {
    FORCE_COLOR: '0',
  },
  timeout: '30s',
};
