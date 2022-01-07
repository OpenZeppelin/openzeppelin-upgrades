const assert = require('assert');
const { withDefaults } = require('@openzeppelin/truffle-upgrades/dist/utils/options.js');
const upgrades = require('@openzeppelin/truffle-upgrades');

const WithConstructor = artifacts.require('WithConstructor');

contract('constructor aguments', function () {
  const { deployer } = withDefaults({});

  it('new beacon- same parameters', async function () {
    const beacon = await upgrades.deployBeacon(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation1 = await upgrades.beacon.getImplementationAddress(beacon.address);

    const beacon2 = await upgrades.deployBeacon(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation2 = await upgrades.beacon.getImplementationAddress(beacon2.address);

    assert.notStrictEqual(beacon.address, beacon2.address);

    assert.strictEqual(implementation1, implementation2);
  });

  it('new beacon- different parameters', async function () {
    const beacon = await upgrades.deployBeacon(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation1 = await upgrades.beacon.getImplementationAddress(beacon.address);

    const beacon2 = await upgrades.deployBeacon(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [42],
    });
    const implementation2 = await upgrades.beacon.getImplementationAddress(beacon2.address);

    assert.notStrictEqual(beacon.address, beacon2.address);

    assert.notStrictEqual(implementation1, implementation2);
  });

  it('upgrade - same parameters', async function () {
    const beacon = await upgrades.deployBeacon(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation1 = await upgrades.beacon.getImplementationAddress(beacon.address);

    const beacon2 = await upgrades.upgradeBeacon(beacon, WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation2 = await upgrades.beacon.getImplementationAddress(beacon2.address);

    assert.strictEqual(beacon.address, beacon2.address);

    assert.strictEqual(implementation1, implementation2);
  });

  it('upgrade - different parameters', async function () {
    const beacon = await upgrades.deployBeacon(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation1 = await upgrades.beacon.getImplementationAddress(beacon.address);

    const beacon2 = await upgrades.upgradeBeacon(beacon, WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [42],
    });
    const implementation2 = await upgrades.beacon.getImplementationAddress(beacon2.address);

    assert.strictEqual(beacon.address, beacon2.address);

    assert.notStrictEqual(implementation1, implementation2);
  });
});
