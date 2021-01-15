const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
});

test('admin.getInstance', async t => {
  await t.throwsAsync(() => upgrades.admin.getInstance(), undefined, 'No ProxyAdmin was found in the network manifest');

  const { Greeter } = t.context;
  await upgrades.deployProxy(Greeter, ['Hola admin!']);
  const proxyAdmin = await upgrades.admin.getInstance();
  t.assert(proxyAdmin);
});
