const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

test('onchange', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const impl1 = await upgrades.deployImplementation(Greeter);
  const impl2 = await upgrades.deployImplementation(Greeter, { redeployImplementation: 'onchange' });
  t.is(impl2, impl1);

  const impl3 = await upgrades.deployImplementation(GreeterV2, { redeployImplementation: 'onchange' });
  t.not(impl3, impl1);
});
