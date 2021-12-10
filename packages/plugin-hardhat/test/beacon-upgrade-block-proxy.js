const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterV2Proxiable = await ethers.getContractFactory('GreeterV2Proxiable');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3');
});

const BEACON_PROXY_NOT_SUPPORTED = 'Beacon proxies are not supported with the current function';
const DOESNT_LOOK_LIKE_PROXY = "doesn't look like an administered ERC 1967 proxy";
const ADDRESS_IS_A_TRANSPARENT_OR_UUPS_PROXY = 'Address is a transparent or uups proxy';
const ADDRESS_IS_A_BEACON_PROXY = 'Address is a beacon proxy which cannot be upgraded directly.';
const PROXY_KIND_UUPS_NOT_SUPPORTED = "The proxy kind 'uups' is not supported with the current function.";

test('block beacon proxy deploy via deployProxy', async t => {
  const { Greeter } = t.context;

  try {
    await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'beacon' });
    t.fail('deployProxy() should not allow a beacon proxy to be deployed');
  } catch (e) {
    t.true(e.message.includes(BEACON_PROXY_NOT_SUPPORTED), e.message);
  }
});

test('block beacon upgrade via upgradeProxy', async t => {
  const { Greeter, GreeterV2, GreeterV3 } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(beacon, ['Hello, Hardhat!']);

  try {
    await upgrades.upgradeProxy(greeter, GreeterV2);
    t.fail('upgradeProxy() should not allow a beacon proxy to be upgraded');
  } catch (e) {
    t.true(e.message.includes(BEACON_PROXY_NOT_SUPPORTED), e.message);
  }

  try {
    await upgrades.prepareUpgrade(greeter.address, GreeterV3);
    t.fail('prepareUpgrade() should not allow a beacon proxy to be prepared for upgrade');
  } catch (e) {
    t.true(e.message.includes(BEACON_PROXY_NOT_SUPPORTED), e.message);
  }

  try {
    await upgrades.prepareUpgrade(beacon.address, GreeterV3);
    t.fail('prepareUpgrade() should not allow a beacon to be prepared for upgrade');
  } catch (e) {
    t.true(e.message.includes(DOESNT_LOOK_LIKE_PROXY), e.message);
  }
});

test('block beacon proxy upgrade via upgradeBeacon', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(beacon, ['Hello, Hardhat!']);

  try {
    await upgrades.upgradeBeacon(greeter, GreeterV2);
    t.fail('upgradeBeacon() should not allow a non-beacon address');
  } catch (e) {
    t.true(e.message.includes(ADDRESS_IS_A_BEACON_PROXY), e.message);
  }
});

test('block transparent proxy upgrade via upgradeBeacon', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

  try {
    await upgrades.upgradeBeacon(greeter, GreeterV2);
    t.fail('upgradeBeacon() should not allow a non-beacon address');
  } catch (e) {
    t.true(e.message.includes(ADDRESS_IS_A_TRANSPARENT_OR_UUPS_PROXY), e.message);
  }
});

test('block uups proxy upgrade via upgradeBeacon', async t => {
  const { GreeterProxiable, GreeterV2Proxiable } = t.context;

  const greeter = await upgrades.deployProxy(GreeterProxiable, ['Hello, Hardhat!'], { kind: 'uups' });

  try {
    await upgrades.upgradeBeacon(greeter, GreeterV2Proxiable);
    t.fail('upgradeBeacon() should not allow a non-beacon address');
  } catch (e) {
    t.true(e.message.includes(ADDRESS_IS_A_TRANSPARENT_OR_UUPS_PROXY), e.message);
  }
});

test('block deployBeaconProxy with non-beacon kind', async t => {
  const { Greeter } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);

  try {
    await upgrades.deployBeaconProxy(beacon, ['Hello, Hardhat!'], { kind: 'uups' });
    t.fail('deployBeaconProxy() should not allow a non-beacon kind');
  } catch (e) {
    t.true(e.message.includes(PROXY_KIND_UUPS_NOT_SUPPORTED), e.message);
  }
});
