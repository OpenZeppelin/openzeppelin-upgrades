const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
  t.context.GreeterV2Proxiable = await ethers.getContractFactory('GreeterV2Proxiable');
  t.context.GreeterV3 = await ethers.getContractFactory('GreeterV3');
});

test('block beacon upgrade via upgradeProxy', async t => {
  const { Greeter, GreeterV2, GreeterV3 } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(beacon, Greeter, ['Hello, Hardhat!']);

  try {
    await upgrades.upgradeProxy(greeter, GreeterV2);
    t.fail("upgradeProxy() should not allow a beacon proxy to be upgraded");
  } catch (e) {
  }

  try {
    await upgrades.prepareUpgrade(greeter.address, GreeterV3);
    t.fail("prepareUpgrade() should not allow a beacon proxy to be prepared for upgrade");
  } catch (e) {
  }

  try {
    await upgrades.prepareUpgrade(beacon.address, GreeterV3);
    t.fail("prepareUpgrade() should not allow a beacon to be prepared for upgrade");
  } catch (e) {
  }
});

test('block beacon proxy upgrade via upgradeBeacon', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  const greeter = await upgrades.deployBeaconProxy(beacon, Greeter, ['Hello, Hardhat!']);

  try {
    await upgrades.upgradeBeacon(greeter, GreeterV2);
    t.fail("upgradeBeacon() should not allow a non-beacon address");
  } catch (e) {
  }
});

test('block transparent proxy upgrade via upgradeBeacon', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

  try {
    await upgrades.upgradeBeacon(greeter, GreeterV2);
    t.fail("upgradeBeacon() should not allow a non-beacon address");
  } catch (e) {
  }
});

test('block uups proxy upgrade via upgradeBeacon', async t => {
  const { GreeterProxiable, GreeterV2Proxiable } = t.context;

  const greeter = await upgrades.deployProxy(GreeterProxiable, ['Hello, Hardhat!'], { kind: 'uups' });

  try {
    await upgrades.upgradeBeacon(greeter, GreeterV2Proxiable);
    t.fail("upgradeBeacon() should not allow a non-beacon address");
  } catch (e) {
  }
});