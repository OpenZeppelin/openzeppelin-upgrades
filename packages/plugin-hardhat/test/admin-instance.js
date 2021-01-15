const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
});

test('admin.getInstance', async t => {
  await t.throwsAsync(upgrades.admin.getInstance(), undefined, 'No ProxyAdmin was found in the network manifest');

  const { Greeter } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hola admin!']);
  const adminInstance = await upgrades.admin.getInstance();
  const adminAddress = await adminInstance.getProxyAdmin(greeter.address);
  t.is(adminInstance.address, adminAddress);
});
