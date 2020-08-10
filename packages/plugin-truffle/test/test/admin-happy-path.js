const assert = require('assert');
const { getAdminAddress } = require('@openzeppelin/upgrades-core');
const upgrades = require('@openzeppelin/truffle-upgrades');
const { getManifestAdmin } = require('@openzeppelin/truffle-upgrades/dist/admin.js');
const { wrapProvider } = require('@openzeppelin/truffle-upgrades/dist/wrap-provider.js');
const { withDefaults } = require('@openzeppelin/truffle-upgrades/dist/options.js');

const Greeter = artifacts.require('Greeter');

contract('Admin', function () {
  const { deployer } = withDefaults({});
  const provider = wrapProvider(deployer.provider);
  const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

  it('changeProxyAdmin', async function () {
    const greeter = await upgrades.deployProxy(Greeter, ['Hello Truffle']);
    await upgrades.admin.changeProxyAdmin(greeter.address, testAddress);
    const newAdmin = await getAdminAddress(provider, greeter.address);
    assert.strictEqual(newAdmin, testAddress);
  });

  it('transferProxyAdminOwnership', async function () {
    await upgrades.admin.transferProxyAdminOwnership(testAddress);
    const admin = await getManifestAdmin(provider);
    const newOwner = await admin.owner();
    assert.strictEqual(newOwner, testAddress);
  });
});
