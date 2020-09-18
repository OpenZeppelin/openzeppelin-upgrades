import test from 'ava';
import path from 'path';
import { migrateManifestsData } from './migrate-oz-cli-project';
import { promises as fs } from 'fs';

const BASE_PATH = 'src/scripts';
const MIGRATABLE_MANIFEST = path.join(BASE_PATH, 'migratable-manifest.test.json');

// TODO: end to end tests including file management
// const PROJCT_FILE = path.join(BASE_PATH, 'project-file.test.json');

test('transforms manifest data', async t => {
  const migratableData = JSON.parse(await fs.readFile(MIGRATABLE_MANIFEST, 'utf8'));
  const migrationOutput = migrateManifestsData({ rinkeby: migratableData });
  t.snapshot(migrationOutput.newManifestsData);
});

test('produces network export data', async t => {
  const migratableData = JSON.parse(await fs.readFile(MIGRATABLE_MANIFEST, 'utf8'));
  const migrationOutput = migrateManifestsData({ rinkeby: migratableData });
  t.snapshot(migrationOutput.networksExportData);
});
