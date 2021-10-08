const assert = require('assert');
const { withDefaults } = require('@openzeppelin/truffle-upgrades/dist/utils/options.js');
const upgrades = require('@openzeppelin/truffle-upgrades');

const WithConstructor = artifacts.require('WithConstructor');

contract('constructor aguments', function () {
  const { deployer } = withDefaults({});

  it('new proxy- same parameters', async function () {
    const proxy1 = await upgrades.deployProxy(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation1 = await upgrades.erc1967.getImplementationAddress(proxy1.address);

    const proxy2 = await upgrades.deployProxy(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation2 = await upgrades.erc1967.getImplementationAddress(proxy2.address);

    assert.strictEqual(implementation1, implementation2);
  });

  it('new proxy- different parameters', async function () {
    const proxy1 = await upgrades.deployProxy(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation1 = await upgrades.erc1967.getImplementationAddress(proxy1.address);

    const proxy2 = await upgrades.deployProxy(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [42],
    });
    const implementation2 = await upgrades.erc1967.getImplementationAddress(proxy2.address);

    assert.notStrictEqual(implementation1, implementation2);
  });

  it('upgrade - same parameters', async function () {
    const proxy1 = await upgrades.deployProxy(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation1 = await upgrades.erc1967.getImplementationAddress(proxy1.address);

    const proxy2 = await upgrades.upgradeProxy(proxy1, WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation2 = await upgrades.erc1967.getImplementationAddress(proxy2.address);

    assert.strictEqual(implementation1, implementation2);
  });

  it('upgrade - different parameters', async function () {
    const proxy1 = await upgrades.deployProxy(WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [17],
    });
    const implementation1 = await upgrades.erc1967.getImplementationAddress(proxy1.address);

    const proxy2 = await upgrades.upgradeProxy(proxy1, WithConstructor, {
      deployer,
      unsafeAllow: ['constructor'],
      constructorArgs: [42],
    });
    const implementation2 = await upgrades.erc1967.getImplementationAddress(proxy2.address);

    assert.notStrictEqual(implementation1, implementation2);
  });
});
