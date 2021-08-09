export default {
  verbose: true,
  ignoredByWatcher: ['**/*.{ts,map,tsbuildinfo}', 'artifacts', 'cache'],
  typescript: {
    rewritePaths: { 'src/': 'dist/' },
    compile: false,
  },
  environmentVariables: {
    FORCE_COLOR: '0',
  },
};
