export default {
  verbose: true,
  ignoredByWatcher: ['**/*.{ts,map,tsbuildinfo}', 'artifacts', 'cache'],
  typescript: { rewritePaths: { 'src/': 'dist/' } },
  environmentVariables: {
    FORCE_COLOR: '0',
  },
};
