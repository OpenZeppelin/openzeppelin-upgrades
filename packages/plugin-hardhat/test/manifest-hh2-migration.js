import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';
import manifest from '@openzeppelin/upgrades-core/dist/manifest.js';

/** @type {import('@openzeppelin/hardhat-upgrades').HardhatUpgrades} */
let upgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
});

async function patchManifest(provider, fn) {
  const m = await manifest.Manifest.forNetwork(provider);
  await m.lockedRun(async () => {
    const data = await m.read();
    fn(data);
    await m.write(data);
  });
}

async function readManifest(provider) {
  const m = await manifest.Manifest.forNetwork(provider);
  return m.read();
}

function rewriteLayoutSrcs(layout, fn) {
  const rewrite = ({ src, ...rest }) => ({ ...rest, ...fn(src) });
  return {
    ...layout,
    storage: layout.storage.map(rewrite),
    namespaces: layout.namespaces
      ? Object.fromEntries(
          Object.entries(layout.namespaces).map(([key, items]) => [key, items.map(rewrite)]),
        )
      : undefined,
  };
}

function toLegacySrcs(layout) {
  return rewriteLayoutSrcs(layout, src => ({ src: `legacy/${src}` }));
}

function omitSrcs(layout) {
  return rewriteLayoutSrcs(layout, () => ({}));
}

function collectSrcs(layout) {
  return [
    ...layout.storage.map(item => item.src),
    ...Object.values(layout.namespaces ?? {}).flatMap(items => items.map(item => item.src)),
  ];
}

test.serial('upgrade refreshes stale V1 src paths when V1 source still exists', async t => {
  const V1 = await ethers.getContractFactory('MultipleNamespacesAndRegularVariables');
  const V2 = await ethers.getContractFactory('MultipleNamespacesAndRegularVariablesV2_Ok');

  const proxy = await upgrades.deployProxy(V1, { kind: 'transparent' });

  const data = await readManifest(ethers.provider);
  const v1Key = Object.keys(data.impls)[0];
  const v1 = data.impls[v1Key];

  const srcs = collectSrcs(v1.layout);
  t.true(srcs.length > 0);
  t.truthy(v1.layout.namespaces);
  t.true(Object.keys(v1.layout.namespaces).length > 0);
  t.true(srcs.every(s => !s.startsWith('legacy/')));

  await patchManifest(ethers.provider, d => {
    d.impls[v1Key].layout = toLegacySrcs(v1.layout);
  });

  const patched = await readManifest(ethers.provider);
  t.true(collectSrcs(patched.impls[v1Key].layout).every(s => s.startsWith('legacy/')));

  const upgraded = await upgrades.upgradeProxy(proxy, V2);
  await upgraded.waitForDeployment();

  const after = await readManifest(ethers.provider);
  const v1After = after.impls[v1Key];
  t.truthy(v1After);
  t.is(v1After.address, v1.address);
  t.is(v1After.txHash, v1.txHash);
  t.true(collectSrcs(v1After.layout).every(s => !s.startsWith('legacy/')));
  t.deepEqual(omitSrcs(v1After.layout), omitSrcs(v1.layout));

  const v2Key = Object.keys(after.impls).find(k => k !== v1Key);
  t.truthy(v2Key);
  t.true(collectSrcs(after.impls[v2Key].layout).every(s => !s.startsWith('legacy/')));
});

test.serial('upgrade preserves V1 manifest entry when V1 source is gone', async t => {
  const V1 = await ethers.getContractFactory('Example');
  const V2 = await ethers.getContractFactory('ExampleV2_Ok');

  const proxy = await upgrades.deployProxy(V1, { kind: 'transparent' });
  const proxyAddress = await proxy.getAddress();

  const fakeHash = 'deadbeef'.repeat(8);
  await patchManifest(ethers.provider, d => {
    const realKey = Object.keys(d.impls).find(k => d.impls[k].address !== undefined);
    const entry = d.impls[realKey];
    delete d.impls[realKey];
    entry.layout = toLegacySrcs(entry.layout);
    d.impls[fakeHash] = entry;
  });

  const patched = await readManifest(ethers.provider);
  const patchedEntry = patched.impls[fakeHash];

  const upgraded = await upgrades.upgradeProxy(proxyAddress, V2);
  await upgraded.waitForDeployment();

  const after = await readManifest(ethers.provider);
  const v1After = after.impls[fakeHash];
  t.truthy(v1After);
  t.is(v1After.address, patchedEntry.address);
  t.is(v1After.txHash, patchedEntry.txHash);
  t.truthy(v1After.layout.namespaces);
  t.true(Object.keys(v1After.layout.namespaces).length > 0);
  t.true(collectSrcs(v1After.layout).every(s => s.startsWith('legacy/')));
  t.deepEqual(v1After.layout, patchedEntry.layout);
});