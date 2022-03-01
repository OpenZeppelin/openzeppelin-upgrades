const assert = require('assert');
const { withDefaults } = require('@openzeppelin/truffle-upgrades/dist/utils/options.js');
const {
  getProxyFactory,
  getTransparentUpgradeableProxyFactory,
  getProxyAdminFactory,
} = require('@openzeppelin/truffle-upgrades/dist/utils/factories.js');
const { getInitializerData } = require('@openzeppelin/truffle-upgrades/dist/utils/initializer-data');

const { forceImport, upgradeProxy, deployProxy, erc1967 } = require('@openzeppelin/truffle-upgrades');

const { deployer } = withDefaults({});

const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');
const GreeterProxiable = artifacts.require('GreeterProxiable');
const GreeterV2Proxiable = artifacts.require('GreeterV2Proxiable');

contract('Greeter', function () {
  it('import then deploy with same impl', async function () {
    const impl = await deployer.deploy(GreeterProxiable);
    const proxy = await deployer.deploy(
      getProxyFactory(),
      impl.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle!']),
    );

    const greeter = await forceImport(proxy.address, GreeterProxiable);
    assert.equal(await greeter.greet(), 'Hello, Truffle!');

    const greeter2 = await deployProxy(GreeterProxiable, ['Hello, Truffle 2!']);
    assert.equal(await greeter2.greet(), 'Hello, Truffle 2!');

    // do not check impl addresses here since they may not match due to a previous deployment on the network
  });

  it('deploy then import with same impl', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello, Truffle!']);

    const impl = await deployer.deploy(GreeterProxiable);
    const proxy = await deployer.deploy(
      getProxyFactory(),
      impl.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle 2!']),
    );

    const greeter2 = await forceImport(proxy.address, GreeterProxiable);
    assert.equal(await greeter2.greet(), 'Hello, Truffle 2!');

    const implAddr1 = await erc1967.getImplementationAddress(greeter.address);
    const implAddr2 = await erc1967.getImplementationAddress(greeter2.address);
    assert.notEqual(implAddr2, implAddr1);

    // upgrade imported proxy to the same impl
    await upgradeProxy(greeter2, GreeterProxiable);
    const implAddrUpgraded = await erc1967.getImplementationAddress(greeter2.address);
    assert.ok(implAddrUpgraded === implAddr1 || implAddrUpgraded === implAddr2, implAddrUpgraded);

    // upgrade imported proxy to different impl
    await upgradeProxy(greeter2, GreeterV2Proxiable);
    const implAddrUpgraded2 = await erc1967.getImplementationAddress(greeter2.address);
    assert.notEqual(implAddrUpgraded2, implAddrUpgraded);
  });

  it('import previous deployment', async function () {
    const greeter = await deployProxy(GreeterProxiable, ['Hello, Truffle!']);

    const greeterImported = await forceImport(greeter.address, GreeterProxiable);
    assert.equal(await greeterImported.greet(), 'Hello, Truffle!');

    assert.equal(greeterImported.address, greeter.address);
    assert.equal(
      await erc1967.getImplementationAddress(greeterImported.address),
      await erc1967.getImplementationAddress(greeter.address),
    );
  });

  it('import previous import', async function () {
    const impl = await deployer.deploy(GreeterProxiable);
    const proxy = await deployer.deploy(
      getProxyFactory(),
      impl.address,
      getInitializerData(GreeterProxiable, ['Hello, Truffle 2!']),
    );

    const greeterImported = await forceImport(proxy.address, GreeterProxiable);
    const greeterImportedAgain = await forceImport(proxy.address, GreeterProxiable);

    assert.equal(greeterImportedAgain.address, greeterImported.address);
    assert.equal(
      await erc1967.getImplementationAddress(greeterImported.address),
      await erc1967.getImplementationAddress(greeterImported.address),
    );
  });

  it('import then deploy transparent', async function () {
    const { deployer } = withDefaults({});

    const impl = await deployer.deploy(Greeter);
    const admin = await deployer.deploy(getProxyAdminFactory());
    const proxy = await deployer.deploy(
      getTransparentUpgradeableProxyFactory(),
      impl.address,
      admin.address,
      getInitializerData(Greeter, ['Hello, Truffle!']),
    );

    // admin may be different than what's already on the network
    await forceImport(proxy.address, Greeter);

    const greeter2 = await deployProxy(Greeter, ['Hello, Truffle 2!']);

    // ensure we can at least upgrade the plugin deployed proxy since it is using an admin in the manifest
    await upgradeProxy(greeter2.address, GreeterV2);
  });
});
