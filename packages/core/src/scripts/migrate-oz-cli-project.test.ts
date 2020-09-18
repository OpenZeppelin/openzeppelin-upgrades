import test from 'ava';
import path from 'path';
import { migrateManifestsData } from './migrate-oz-cli-project';
import { promises as fs } from 'fs';

const BASE_PATH = 'src/scripts';
const MIGRATABLE_MANIFEST = path.join(BASE_PATH, 'migratable-manifest.test.json');
const MIGRATED_MANIFEST = path.join(BASE_PATH, 'migrated-manifest.test.json');
const EXPORT_FILE = path.join(BASE_PATH, 'openzeppelin-cli-export.test.json');

// TODO: end to end tests including file management
// const PROJCT_FILE = path.join(BASE_PATH, 'project-file.test.json');

test('transforms manifest data', async t => {
  const migratableData = await readJSONFile(MIGRATABLE_MANIFEST);
  const migratedData = await readJSONFile(MIGRATED_MANIFEST);
  const migrationOutput = migrateManifestsData({ rinkeby: migratableData });
  t.deepEqual(migrationOutput.newManifestsData, { rinkeby: migratedData });
});

test('produces network export data', async t => {
  const migratableData = await readJSONFile(MIGRATABLE_MANIFEST);
  const exportData = await readJSONFile(EXPORT_FILE);
  const migrationOutput = migrateManifestsData({ rinkeby: migratableData });
  t.deepEqual(migrationOutput.networksExportData, exportData.networks);
});

async function readJSONFile(filename: string) {
  return JSON.parse(await fs.readFile(filename, 'utf8'));
}
