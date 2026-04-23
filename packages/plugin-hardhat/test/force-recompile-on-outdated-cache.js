import test from 'ava';
import hre from 'hardhat';
import { promises as fs } from 'fs';
import path from 'path';
import { isCurrentValidationData } from '@openzeppelin/upgrades-core';

const connection = await hre.network.connect();
test.after.always(async () => connection.close());

const CACHE_PATH = path.join(hre.config.paths.cache, 'validations.json');

async function readCache() {
  return JSON.parse(await fs.readFile(CACHE_PATH, 'utf8'));
}

async function writeCache(cache) {
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
}

test.serial('hardhat compile regenerates the validations cache when it is outdated', async t => {
  t.timeout(60000); // Forcing a full recompile of all contracts takes several seconds.

  const originalRaw = await fs.readFile(CACHE_PATH, 'utf8');
  const currentCache = JSON.parse(originalRaw);
  t.true(isCurrentValidationData(currentCache));
  t.true(currentCache.log.length > 0);

  try {
    const outdatedCache = { ...currentCache, version: '3.0' };
    t.false(isCurrentValidationData(outdatedCache), 'precondition: modified cache must be detectable as outdated');
    await writeCache(outdatedCache);

    await hre.tasks.getTask('compile').run({});

    const cacheAfterCompile = await readCache();
    t.true(isCurrentValidationData(cacheAfterCompile), 'compile should regenerate the cache to current schema');
    t.true(cacheAfterCompile.log.length > 0, 'regenerated cache must retain log entries');
  } finally {
    await fs.writeFile(CACHE_PATH, originalRaw);
  }
});
