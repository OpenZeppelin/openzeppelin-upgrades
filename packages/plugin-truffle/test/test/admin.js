const assert = require('assert');

const { deployProxyAdmin, admin, deployProxy } = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');

contract('ProxyAdmin', function () {
  it('deployProxyAdmin', async function () {
    const deployedAdminAddress = await deployProxyAdmin();
    const deployedAdminAddress2 = await deployProxyAdmin();

    assert.equal(deployedAdminAddress2, deployedAdminAddress);

    const adminInstance = await admin.getInstance();

    const greeter = await deployProxy(Greeter, ['Hola admin!'], { kind: 'transparent' });
    const adminAddress = await adminInstance.getProxyAdmin(greeter.address);

    assert.equal(adminInstance.address, deployedAdminAddress);
    assert.equal(adminInstance.address, adminAddress);
  });
});
