const assert = require('assert');
const { getAdminAddress } = require('@openzeppelin/upgrades-core');
const upgrades = require('@openzeppelin/truffle-upgrades');
const { getManifestAdmin } = require('@openzeppelin/truffle-upgrades/dist/admin.js');
const { wrapProvider } = require('@openzeppelin/truffle-upgrades/dist/utils/wrap-provider.js');
const { withDefaults } = require('@openzeppelin/truffle-upgrades/dist/utils/options.js');
const { getProxyAdminFactory } = require('@openzeppelin/truffle-upgrades/dist/utils/factories.js');

const Greeter = artifacts.require('Greeter');
const GreeterV2 = artifacts.require('GreeterV2');

contract('Admin', function () {
  const { deployer } = withDefaults({});
  const provider = wrapProvider(deployer.provider);

  it('use different admin address than manifest', async function () {
    // Deploy a proxy
    const greeter = await upgrades.deployProxy(Greeter, ['Hello Truffle'], { kind: 'transparent' });

    // Change to new admin
    const AdminFactory = getProxyAdminFactory();
    const deployedAdmin = await deployer.deploy(AdminFactory);
    await upgrades.admin.changeProxyAdmin(greeter.address, deployedAdmin.address);

    // Check the admin changed
    const newAdmin = await getAdminAddress(provider, greeter.address);
    assert.strictEqual(newAdmin, deployedAdmin.address);
    assert.notEqual(newAdmin, (await getManifestAdmin(provider)).address);

    // Upgrade
    await upgrades.upgradeProxy(greeter, GreeterV2);

    // Change the admin again, even though current admin is not the one in the manifest
    const deployedAdmin2 = await deployer.deploy(AdminFactory);
    await upgrades.admin.changeProxyAdmin(greeter.address, deployedAdmin2.address);
  });
});
