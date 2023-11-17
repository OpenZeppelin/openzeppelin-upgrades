const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.GreeterProxiable40Fallback = await ethers.getContractFactory('GreeterProxiable40Fallback');
  t.context.GreeterProxiable40FallbackV2 = await ethers.getContractFactory('GreeterProxiable40FallbackV2');

  t.context.GreeterProxiable40FallbackString = await ethers.getContractFactory('GreeterProxiable40FallbackString');
  t.context.GreeterProxiable40FallbackStringV2 = await ethers.getContractFactory('GreeterProxiable40FallbackStringV2');
});

test('unknown upgrades interface version due to fallback returning non-string', async t => {
  const { GreeterProxiable40Fallback, GreeterProxiable40FallbackV2 } = t.context;

  const greeter = await upgrades.deployProxy(GreeterProxiable40Fallback, ['Hello, Hardhat!'], { kind: 'uups' });

  const greeter2 = await upgrades.upgradeProxy(greeter, GreeterProxiable40FallbackV2);
  await greeter2.resetGreeting();
});

test('unknown upgrades interface version due to fallback returning string', async t => {
  const { GreeterProxiable40FallbackString, GreeterProxiable40FallbackStringV2 } = t.context;

  const greeter = await upgrades.deployProxy(GreeterProxiable40FallbackString, ['Hello, Hardhat!'], { kind: 'uups' });

  const greeter2 = await upgrades.upgradeProxy(greeter, GreeterProxiable40FallbackStringV2);
  await greeter2.resetGreeting();
});