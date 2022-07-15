const assert = require('assert');
const { withDefaults } = require('@openzeppelin/truffle-upgrades/dist/utils/options.js');
const {
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
  getBeaconProxyFactory,
  getUpgradeableBeaconFactory,
} = require('@openzeppelin/truffle-upgrades/dist/utils/factories.js');
const { getInitializerData } = require('@openzeppelin/truffle-upgrades/dist/utils/initializer-data');

const {
  forceImport,
  deployProxy,
  upgradeProxy,
  upgradeBeacon,
  prepareUpgrade,
  deployBeacon,
  validateImplementation,
  deployImplementation,
  validateUpgrade,
  erc1967,
} = require('@openzeppelin/truffle-upgrades');

const { deployer } = withDefaults({});

const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');
const GreeterV3 = artifacts.require('GreeterV3');
const GreeterProxiable = artifacts.require('GreeterProxiable');
const GreeterV2Proxiable = artifacts.require('GreeterV2Proxiable');
const Invalid = artifacts.require('Invalid');
const GreeterStorageConflict = artifacts.require('GreeterStorageConflict');
const GreeterStorageConflictProxiable = artifacts.require('GreeterStorageConflictProxiable');

contract('Greeter', function () {
  it('validate implementation - happy path', async function () {
    await validateImplementation(Greeter);
  });

  it('validate implementation - invalid', async function () {
    await assert.rejects(validateImplementation(Invalid), error => error.message.includes('Contract `Invalid` is not upgrade safe'));
  });

  it('deploy implementation - happy path', async function () {
    const greeterImplAddr = await deployImplementation(Greeter);
    const greeter = await Greeter.at(greeterImplAddr);
    await greeter.greet();
  });

  it('deploy implementation - multiple times', async function () {
    const greeterImplAddr = await deployImplementation(Greeter);
    const greeterImplAddrB = await deployImplementation(Greeter);
    assert.equal(greeterImplAddr, greeterImplAddrB);

    const greeterImplAddr2 = await deployImplementation(GreeterV2);
    assert.notEqual(greeterImplAddr, greeterImplAddr2);
  });

  it('deploy implementation - before proxy deployment', async function () {
    const greeterImplAddr = await deployImplementation(Greeter);
    const greeter = await deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
    assert.equal(greeterImplAddr, await erc1967.getImplementationAddress(greeter.address));
  });

  it('deploy implementation - after proxy deployment', async function () {
    const greeter = await deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
    const greeterImplAddr = await deployImplementation(Greeter);
    assert.equal(greeterImplAddr, await erc1967.getImplementationAddress(greeter.address));
  });

  it('deploy implementation - invalid', async function () {
    await assert.rejects(deployImplementation(Invalid), error => error.message.includes('Contract `Invalid` is not upgrade safe'));
  });

  it('validate upgrade beacon - happy path', async function () {
    const beacon = await deployBeacon(Greeter);
    await validateUpgrade(beacon, GreeterV2);
  });

  it('validate upgrade beacon - incompatible storage', async function () {
    const beacon = await deployBeacon(Greeter);
    await assert.rejects(validateUpgrade(beacon, GreeterStorageConflict), error => error.message.includes('New storage layout is incompatible'));
  });

  it('validate upgrade beacon - incompatible storage - forced', async function () {
    const beacon = await deployBeacon(Greeter);
    await validateUpgrade(beacon, GreeterStorageConflict, { unsafeSkipStorageCheck: true });
  });

  it('validate transparent - happy path', async function () {
    const greeter = await deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
    await validateUpgrade(greeter, GreeterV2);
  });

  it('validate upgrade transparent - incompatible storage', async function () {
    const greeter = await deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
    await assert.rejects(validateUpgrade(greeter, GreeterStorageConflict), error => error.message.includes('New storage layout is incompatible'));
  });

  it('validate upgrade transparent - incompatible storage - forced', async function () {
    const greeter = await deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });
    await validateUpgrade(greeter, GreeterStorageConflict, { unsafeSkipStorageCheck: true });
  });

  it('validate uups - happy path', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello, Hardhat!'], { kind: 'uups' });
    await validateUpgrade(greeter, GreeterV2Proxiable);
  });

  it('validate upgrade uups - incompatible storage', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello, Hardhat!'], { kind: 'uups' });
    await assert.rejects(validateUpgrade(greeter, GreeterStorageConflictProxiable), error => error.message.includes('New storage layout is incompatible'));
  });

  it('validate upgrade uups - incompatible storage - forced', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello, Hardhat!'], { kind: 'uups' });
    await validateUpgrade(greeter, GreeterStorageConflictProxiable, { unsafeSkipStorageCheck: true });
  });

  it('validate upgrade - contracts only - happy path', async function () {
    await validateUpgrade(Greeter, GreeterV2);
  });

  it('validate upgrade - contracts only - incompatible storage', async function () {
    await assert.rejects(validateUpgrade(Greeter, GreeterStorageConflict), error => error.message.includes('New storage layout is incompatible'));
  });

  it('validate upgrade - contracts only - incompatible storage - forced', async function () {
    await validateUpgrade(Greeter, GreeterStorageConflict, { unsafeSkipStorageCheck: true });
  });

});

