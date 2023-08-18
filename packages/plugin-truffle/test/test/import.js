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

const { forceImport, deployProxy, upgradeProxy, upgradeBeacon, erc1967 } = require('@openzeppelin/truffle-upgrades');

const { deployer } = withDefaults({});

const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');
const GreeterProxiable = artifacts.require('GreeterProxiable');
const GreeterV2Proxiable = artifacts.require('GreeterV2Proxiable');
const CustomProxy = artifacts.require('CustomProxy');
const CustomProxyWithAdmin = artifacts.require('CustomProxyWithAdmin');

const REQUESTED_UPGRADE_WRONG_KIND = 'Requested an upgrade of kind uups but proxy is transparent';

contract('Greeter', function () {
  it('implementation happy path', async function () {
    const impl = await deployer.deploy(GreeterProxiable);

    const contract = await forceImport(impl.address, GreeterProxiable);
    assert.equal(impl.address, contract.address);
    assert.equal(await contract.greet(), '');

    const greeter = await deployProxy(GreeterProxiable, ['Hello, Truffle!'], {
      useDeployedImplementation: true,
    });
    assert.equal(await greeter.greet(), 'Hello, Truffle!');
  });

  it('no contract', async function () {
    await assert.rejects(forceImport('0x0000000000000000000000000000000000000001', GreeterProxiable), error =>
      error.message.startsWith('No contract at address 0x0000000000000000000000000000000000000001'),
    );
  });

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

  it('wrong kind', async function () {
    const impl = await deployer.deploy(GreeterProxiable);
    const proxy = await deployer.deploy(
      getProxyFactory(),
      impl.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle!']),
    );

    // specify wrong kind
    const greeter = await forceImport(proxy.address, GreeterProxiable, { kind: 'transparent' });
    assert.equal(await greeter.greet(), 'Hello, Truffle!');

    // an error is expected since the user force imported the wrong kind
    await assert.rejects(upgradeProxy(greeter, GreeterV2Proxiable), error =>
      error.message.startsWith(REQUESTED_UPGRADE_WRONG_KIND),
    );
  });

  it('import custom UUPS proxy', async function () {
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

  it('import custom UUPS proxy with admin', async function () {
    const impl = await deployer.deploy(GreeterProxiable);
    const proxy = await deployer.deploy(
      CustomProxyWithAdmin,
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

    // proxy with a different admin can be imported
    await upgradeProxy(proxy.address, GreeterV2);
  });
});
