const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterV2Proxiable = await ethers.getContractFactory('GreeterV2Proxiable');
  t.context.GreeterFallback = await ethers.getContractFactory('GreeterFallback');
});

const BEACON_PROXY_NOT_SUPPORTED = 'Beacon proxies are not supported with the current function';
const ADDRESS_IS_A_TRANSPARENT_OR_UUPS_PROXY = 'Address is a transparent or UUPS proxy';
const ADDRESS_IS_A_BEACON_PROXY = 'Address is a beacon proxy which cannot be upgraded directly.';
const PROXY_KIND_UUPS_NOT_SUPPORTED = "Unsupported proxy kind 'uups'";
const NOT_REGISTERED_REGEX = /Deployment at address \S+ is not registered/;
const NOT_BEACON = /Contract at \S+ doesn't look like a beacon/;
const MUST_SPECIFY_CONTRACT_FACTORY = 'attachTo must specify a contract factory';

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
  const { Greeter, GreeterV2 } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(beacon, Greeter, ['Hello, Hardhat!']);

  try {
    await upgrades.upgradeProxy(greeter, GreeterV2);
    t.fail('upgradeProxy() should not allow a beacon proxy to be upgraded');
  } catch (e) {
    t.true(e.message.includes(BEACON_PROXY_NOT_SUPPORTED), e.message);
  }
});

test('block beacon proxy upgrade via upgradeBeacon', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(beacon, Greeter, ['Hello, Hardhat!']);

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
    await upgrades.deployBeaconProxy(beacon, Greeter, ['Hello, Hardhat!'], { kind: 'uups' });
    t.fail('deployBeaconProxy() should not allow a non-beacon kind');
  } catch (e) {
    t.true(e.message.includes(PROXY_KIND_UUPS_NOT_SUPPORTED), e.message);
  }
});

test('block deployBeaconProxy with non-beacon address', async t => {
  const { Greeter } = t.context;

  const genericContract = await Greeter.deploy();
  try {
    await upgrades.deployBeaconProxy(genericContract, Greeter, ['Hello, Hardhat!']);
    t.fail('deployBeaconProxy() should not allow a non-beacon address');
  } catch (e) {
    t.true(NOT_BEACON.test(e.message), e.message);
  }
});

test('block prepareUpgrade on generic contract', async t => {
  const { Greeter, GreeterV2 } = t.context;
  const genericContract = await Greeter.deploy();

  try {
    await upgrades.prepareUpgrade(genericContract, GreeterV2, { kind: 'transparent' });
    t.fail('prepareUpgrade() should not allow generic contract that is not registered');
  } catch (e) {
    t.true(NOT_REGISTERED_REGEX.test(e.message), e.message);
  }
});

test('block prepareUpgrade on generic contract with fallback', async t => {
  const { GreeterFallback, GreeterV2 } = t.context;
  const genericContract = await GreeterFallback.deploy();
  await genericContract.waitForDeployment();

  try {
    await upgrades.prepareUpgrade(genericContract, GreeterV2, { kind: 'transparent' });
    t.fail('prepareUpgrade() should not allow generic contract with fallback that is not registered');
  } catch (e) {
    t.true(NOT_REGISTERED_REGEX.test(e.message), e.message);
  }
});

test('block deployBeaconProxy without attachTo with args', async t => {
  const { Greeter } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);

  const error = await t.throwsAsync(() => upgrades.deployBeaconProxy(beacon, ['Hello, Hardhat!']));
  t.true(error.message.includes(MUST_SPECIFY_CONTRACT_FACTORY));
});

test('block deployBeaconProxy without attachTo without args', async t => {
  const { Greeter } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);

  const error = await t.throwsAsync(() => upgrades.deployBeaconProxy(beacon));
  t.true(error.message.includes(MUST_SPECIFY_CONTRACT_FACTORY));
});
