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

function findManifestKeyByAddress(impls, address) {
  const entry = Object.entries(impls).find(([, v]) => v.address === address);
  return entry?.[0];
}

test.serial('upgrade refreshes stale V1 layout srcs', async t => {
  const V1 = await ethers.getContractFactory('MultipleNamespacesAndRegularVariables');
  const V2 = await ethers.getContractFactory('MultipleNamespacesAndRegularVariablesV2_Ok');

  const proxy = await upgrades.deployProxy(V1, { kind: 'transparent' });
  const proxyAddress = await proxy.getAddress();
  const v1ImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  const data = await readManifest(ethers.provider);
  const v1Key = findManifestKeyByAddress(data.impls, v1ImplAddress);
  t.truthy(v1Key, `expected manifest entry for impl ${v1ImplAddress}`);
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
  const v2ImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  const after = await readManifest(ethers.provider);
  const v1After = after.impls[v1Key];
  t.truthy(v1After);
  t.is(v1After.address, v1.address);
  t.is(v1After.txHash, v1.txHash);
  t.true(collectSrcs(v1After.layout).every(s => !s.startsWith('legacy/')));
  t.deepEqual(omitSrcs(v1After.layout), omitSrcs(v1.layout));

  const v2Key = findManifestKeyByAddress(after.impls, v2ImplAddress);
  t.truthy(v2Key, `expected manifest entry for impl ${v2ImplAddress}`);
  t.true(collectSrcs(after.impls[v2Key].layout).every(s => !s.startsWith('legacy/')));
});

test.serial('upgrade preserves V1 entry with no version hash match', async t => {
  const V1 = await ethers.getContractFactory('Example');
  const V2 = await ethers.getContractFactory('ExampleV2_Ok');

  const proxy = await upgrades.deployProxy(V1, { kind: 'transparent' });
  const proxyAddress = await proxy.getAddress();
  const v1ImplAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

  const fakeHash = 'deadbeef'.repeat(8);
  await patchManifest(ethers.provider, d => {
    const realKey = findManifestKeyByAddress(d.impls, v1ImplAddress);
    if (!realKey) {
      throw new Error(`Missing manifest entry for impl ${v1ImplAddress}`);
    }
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
