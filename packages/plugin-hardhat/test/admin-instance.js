const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
});

test('admin.deployedProxyAdmin', async t => {
  const { Greeter } = t.context;
  await upgrades.deployProxy(Greeter, ['Hola admin!']);
  const proxyAdmin = await upgrades.admin.deployedProxyAdmin();
  t.assert(proxyAdmin);
});
