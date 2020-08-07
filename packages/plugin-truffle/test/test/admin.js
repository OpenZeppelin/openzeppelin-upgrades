const { deployProxy, admin } = require('@openzeppelin/truffle-upgrades');

const Greeter = artifacts.require('Greeter');
const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

contract('Admin', function () {
  it('changeProxyAdmin', async function () {
    const greeter = await deployProxy(Greeter, ['Hello Truffle']);
    const newAdmin = testAddress;
    await admin.changeProxyAdmin(greeter.address, newAdmin);
  });

  it('transferProxyAdminOwnership', async function () {
    const newOwner = testAddress;
    await admin.transferProxyAdminOwnership(newOwner);
  });
});
