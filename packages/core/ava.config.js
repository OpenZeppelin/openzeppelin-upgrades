export default {
  verbose: true,
  ignoredByWatcher: ['**/*.{ts,map,tsbuildinfo}', 'artifacts', 'cache'],
  typescript: { rewritePaths: { 'src/': 'dist/' } },
  require: 'ts-node/register',
};
