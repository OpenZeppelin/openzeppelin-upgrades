const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter50Proxiable');
  t.context.GreeterV2 = await ethers.getContractFactory('Greeter50V2Proxiable');
});

test('happy path', async t => {
  const { Greeter, GreeterV2 } = t.context;

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'uups' });

  const greeter2 = await upgrades.upgradeProxy(greeter, GreeterV2);
  await greeter2.waitForDeployment();
  await greeter2.resetGreeting();
});
