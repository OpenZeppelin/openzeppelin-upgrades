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

const { forceImport, upgradeProxy, upgradeBeacon, prepareUpgrade, erc1967 } = require('@openzeppelin/truffle-upgrades');

const { deployer } = withDefaults({});

const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');
const GreeterProxiable = artifacts.require('GreeterProxiable');
const GreeterV2Proxiable = artifacts.require('GreeterV2Proxiable');
const CustomProxy = artifacts.require('CustomProxy');

const NOT_REGISTERED_ADMIN = 'Proxy admin is not the one registered in the network manifest';
const NOT_SUPPORTED_FUNCTION = 'Beacon proxies are not supported with the current function';
const NOT_SUPPORTED_PROXY_OR_BEACON = /Contract at address \S+ doesn't look like a supported proxy or beacon/;
const ONLY_PROXY_OR_BEACON =
  'Only transparent, UUPS, or beacon proxies or beacons can be used with the forceImport() function.';

contract('Greeter', function () {
  it('transparent happy path', async function () {
    const impl = await deployer.deploy(Greeter);
    const admin = await deployer.deploy(getProxyAdminFactory());
    const proxy = await deployer.deploy(
      getTransparentUpgradeableProxyFactory(),
      impl.address,
      admin.address,
      getInitializerData(Greeter, ['Hello, Truffle!']),
    );

    const greeter = await forceImport(proxy.address, Greeter);
    assert.equal(await greeter.greet(), 'Hello, Truffle!');

    // can't upgrade directly because different admin was deployed during migrations
  });

  it('uups happy path', async function () {
    const impl = await deployer.deploy(GreeterProxiable);
    const proxy = await deployer.deploy(
      getProxyFactory(),
      impl.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle!']),
    );

    const greeter = await forceImport(proxy.address, GreeterProxiable);
    assert.equal(await greeter.greet(), 'Hello, Truffle!');

    const greeter2 = await upgradeProxy(greeter, GreeterV2Proxiable);
    assert.equal(await greeter2.greet(), 'Hello, Truffle!');
    await greeter2.resetGreeting();
    assert.equal(await greeter2.greet(), 'Hello World');
  });

  it('beacon proxy happy path', async function () {
    const impl = await deployer.deploy(Greeter);
    const beacon = await deployer.deploy(getUpgradeableBeaconFactory(), impl.address);
    const proxy = await deployer.deploy(
      getBeaconProxyFactory(),
      beacon.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle!']),
    );

    const greeter = await forceImport(proxy.address, Greeter);
    assert.equal(await greeter.greet(), 'Hello, Truffle!');

    await upgradeBeacon(beacon, GreeterV2);
    const greeter2 = await GreeterV2.at(greeter.address);
    assert.equal(await greeter2.greet(), 'Hello, Truffle!');
    await greeter2.resetGreeting();
    assert.equal(await greeter2.greet(), 'Hello World');
  });

  it('beacon happy path', async function () {
    const impl = await deployer.deploy(Greeter);
    const beacon = await deployer.deploy(getUpgradeableBeaconFactory(), impl.address);

    const beaconImported = await forceImport(beacon.address, Greeter);
    assert.equal(await beaconImported.implementation(), impl.address);

    await upgradeBeacon(beacon, GreeterV2);
  });

  it('not proxy or beacon', async function () {
    const impl = await deployer.deploy(Greeter);

    await assert.rejects(
      forceImport(impl.address, Greeter),
      error => NOT_SUPPORTED_PROXY_OR_BEACON.test(error.message) && error.message.includes(ONLY_PROXY_OR_BEACON),
    );
  });

  it('import proxy using contract instance', async function () {
    const impl = await deployer.deploy(GreeterProxiable);
    const proxy = await deployer.deploy(
      getProxyFactory(),
      impl.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle!']),
    );

    const greeter = await forceImport(proxy, GreeterProxiable);
    assert.equal(await greeter.greet(), 'Hello, Truffle!');

    const greeter2 = await upgradeProxy(greeter, GreeterV2Proxiable);
    assert.equal(await greeter2.greet(), 'Hello, Truffle!');
    await greeter2.resetGreeting();
    assert.equal(await greeter2.greet(), 'Hello World');
  });

  it('ignore kind', async function () {
    const impl = await deployer.deploy(Greeter);
    const beacon = await deployer.deploy(getUpgradeableBeaconFactory(), impl.address);
    const proxy = await deployer.deploy(
      getBeaconProxyFactory(),
      beacon.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle!']),
    );

    // specify uups, but import should detect that it is a beacon proxy
    const greeter = await forceImport(proxy.address, Greeter, { kind: 'uups' });

    await assert.rejects(upgradeProxy(greeter, GreeterV2), error => error.message.startsWith(NOT_SUPPORTED_FUNCTION));
  });

  it('import custom proxy', async function () {
    const impl = await deployer.deploy(GreeterProxiable);
    const proxy = await deployer.deploy(
      CustomProxy,
      impl.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle!']),
    );

    const greeter = await forceImport(proxy.address, GreeterProxiable);
    assert.equal(await greeter.greet(), 'Hello, Truffle!');

    await upgradeProxy(greeter, GreeterV2Proxiable);
  });

  it('wrong implementation', async function () {
    const impl = await deployer.deploy(Greeter);
    const admin = await deployer.deploy(getProxyAdminFactory());
    const proxy = await deployer.deploy(
      getTransparentUpgradeableProxyFactory(),
      impl.address,
      admin.address,
      getInitializerData(Greeter, ['Hello, Truffle!']),
    );

    const greeter = await forceImport(proxy.address, GreeterV2);
    assert.equal(await greeter.greet(), 'Hello, Truffle!');

    // since this is the wrong impl, expect it to have an error if using a non-existent function
    await assert.rejects(greeter.resetGreeting(), error => error.message.includes('revert'));
  });

  it('multiple identical implementations', async function () {
    const impl = await deployer.deploy(GreeterProxiable);
    const proxy = await deployer.deploy(
      getProxyFactory(),
      impl.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle!']),
    );

    const impl2 = await deployer.deploy(GreeterProxiable);
    const proxy2 = await deployer.deploy(
      getProxyFactory(),
      impl2.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle 2!']),
    );

    const greeter = await forceImport(proxy.address, GreeterProxiable);
    const greeterUpgraded = await upgradeProxy(greeter, GreeterV2Proxiable);
    assert.equal(await greeterUpgraded.greet(), 'Hello, Truffle!');

    const greeter2 = await forceImport(proxy2.address, GreeterProxiable);
    const greeter2Upgraded = await upgradeProxy(greeter2, GreeterV2Proxiable);
    assert.equal(await greeter2Upgraded.greet(), 'Hello, Truffle 2!');
  });

  it('same implementations', async function () {
    const impl = await deployer.deploy(GreeterProxiable);
    const proxy = await deployer.deploy(
      getProxyFactory(),
      impl.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle!']),
    );
    const proxy2 = await deployer.deploy(
      getProxyFactory(),
      impl.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle 2!']),
    );

    const greeter = await forceImport(proxy.address, GreeterProxiable);
    const greeter2 = await forceImport(proxy2.address, GreeterProxiable);

    const implAddr1 = await erc1967.getImplementationAddress(greeter.address);
    const implAddr2 = await erc1967.getImplementationAddress(greeter2.address);
    assert.equal(implAddr2, implAddr1);
  });

  it('import transparents with different admin', async function () {
    const impl = await deployer.deploy(Greeter);
    const admin = await deployer.deploy(getProxyAdminFactory());
    const proxy = await deployer.deploy(
      getTransparentUpgradeableProxyFactory(),
      impl.address,
      admin.address,
      getInitializerData(Greeter, ['Hello, Truffle!']),
    );

    const admin2 = await deployer.deploy(getProxyAdminFactory());
    const proxy2 = await deployer.deploy(
      getTransparentUpgradeableProxyFactory(),
      impl.address,
      admin2.address,
      getInitializerData(Greeter, ['Hello, Truffle!']),
    );

    const greeter = await forceImport(proxy.address, Greeter);
    const greeter2 = await forceImport(proxy2.address, Greeter);

    assert.notEqual(await erc1967.getAdminAddress(greeter2.address), await erc1967.getAdminAddress(greeter.address));

    // cannot upgrade directly
    await assert.rejects(upgradeProxy(proxy.address, GreeterV2), error => NOT_REGISTERED_ADMIN === error.message);

    // prepare upgrades instead
    const greeterV2ImplAddr = await prepareUpgrade(greeter.address, GreeterV2);
    const greeterV2ImplAddr_2 = await prepareUpgrade(greeter2.address, GreeterV2);

    assert.equal(greeterV2ImplAddr_2, greeterV2ImplAddr);
  });
});
