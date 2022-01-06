const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterProxiable = await ethers.getContractFactory('GreeterProxiable');
});

test('infer proxy kind', async t => {
  const { Greeter, GreeterProxiable } = t.context;

  const uups = await upgrades.deployProxy(GreeterProxiable, ['Hello, Hardhat!']);
  t.is(await upgrades.erc1967.getAdminAddress(uups.address), ethers.constants.AddressZero);

  const transparent = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!']);
  t.is(await upgrades.erc1967.getAdminAddress(transparent.address), (await upgrades.admin.getInstance()).address);
});
