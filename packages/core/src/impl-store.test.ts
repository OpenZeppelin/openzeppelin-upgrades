import test from 'ava';

import { promises as fs } from 'fs';
import rimrafAsync from 'rimraf';
import util from 'util';
import path from 'path';
import os from 'os';

import { fetchOrDeploy } from './impl-store';
import { getVersion } from './version';
import { stubProvider } from './stub-provider';

const rimraf = util.promisify(rimrafAsync);

test.before(async () => {
  process.chdir(await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-')));
});

test.after(async () => {
  await rimraf(process.cwd());
});

const version1 = getVersion('01');
const version2 = getVersion('02');

test('deploys on cache miss', async t => {
  const provider = stubProvider();
  await fetchOrDeploy(version1, provider, provider.deploy);
  t.is(provider.deployCount, 1);
});

test('reuses on cache hit', async t => {
  const provider = stubProvider();
  const cachedDeploy = () => fetchOrDeploy(version1, provider, provider.deploy);
  const address1 = await cachedDeploy();
  const address2 = await cachedDeploy();
  t.is(provider.deployCount, 1);
  t.is(address2, address1);
});

test('does not reuse unrelated version', async t => {
  const provider = stubProvider();
  const address1 = await fetchOrDeploy(version1, provider, provider.deploy);
  const address2 = await fetchOrDeploy(version2, provider, provider.deploy);
  t.is(provider.deployCount, 2);
  t.not(address2, address1);
});
