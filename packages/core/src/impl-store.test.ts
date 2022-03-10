import test from 'ava';

import { promises as fs } from 'fs';
import rimrafAsync from 'rimraf';
import util from 'util';
import path from 'path';
import os from 'os';

import { fetchOrDeploy, mergeAddresses } from './impl-store';
import { getVersion } from './version';
import { stubProvider } from './stub-provider';
import { ImplDeployment } from './manifest';

const rimraf = util.promisify(rimrafAsync);

test.before(async () => {
  process.chdir(await fs.mkdtemp(path.join(os.tmpdir(), 'upgrades-core-test-')));
});

test.after(async () => {
  await rimraf(process.cwd());
});

const version1 = getVersion('01');
const version2 = getVersion('02', '02');

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

test('cleans up invalid deployment', async t => {
  const chainId = 1234;
  const provider1 = stubProvider(chainId);
  // create a deployment on a network
  await fetchOrDeploy(version1, provider1, provider1.deploy);
  // try to fetch it on a different network with same chainId
  const provider2 = stubProvider(chainId);
  await t.throwsAsync(fetchOrDeploy(version1, provider2, provider2.deploy));
  // the failed deployment has been cleaned up
  await fetchOrDeploy(version1, provider2, provider2.deploy);
});

test('merge addresses', async t => {
  const depl1 = { address: '0x1' } as ImplDeployment;
  const depl2 = { address: '0x2' } as ImplDeployment;

  const { address, allAddresses } = await mergeAddresses(depl1, depl2);
  t.is(address, '0x1');
  t.true(unorderedEqual(allAddresses, ['0x1', '0x2']), allAddresses.toString());
});

test('merge multiple existing addresses', async t => {
  const depl1 = { address: '0x1', allAddresses: ['0x1a', '0x1b'] } as ImplDeployment;
  const depl2 = { address: '0x2' } as ImplDeployment;

  const { address, allAddresses } = await mergeAddresses(depl1, depl2);
  t.is(address, '0x1');
  t.true(unorderedEqual(allAddresses, ['0x1', '0x1a', '0x1b', '0x2']), allAddresses.toString());
});

test('merge all addresses', async t => {
  const depl1 = { address: '0x1', allAddresses: ['0x1a', '0x1b'] } as ImplDeployment;
  const depl2 = { address: '0x2', allAddresses: ['0x2a', '0x2b'] } as ImplDeployment;

  const { address, allAddresses } = await mergeAddresses(depl1, depl2);
  t.is(address, '0x1');
  t.true(unorderedEqual(allAddresses, ['0x1', '0x1a', '0x1b', '0x2', '0x2a', '0x2b']), allAddresses.toString());
});

function unorderedEqual(arr1: string[], arr2: string[]) {
  return arr1.every(i => arr2.includes(i)) && arr2.every(i => arr1.includes(i));
}
