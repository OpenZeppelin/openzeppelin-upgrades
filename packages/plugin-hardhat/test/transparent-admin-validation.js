const test = require('ava');

const { ethers, upgrades } = require('hardhat');

const NEW_ADMIN = '0xeAD9C93b79Ae7C1591b1FB5323BD777E86e150d4';

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

test('admin validation', async t => {
  const { Greeter, GreeterV2 } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hola admin!'], { kind: 'transparent' });
  await upgrades.admin.changeProxyAdmin(await greeter.getAddress(), NEW_ADMIN);
  await t.throwsAsync(
    () => upgrades.upgradeProxy(greeter, GreeterV2),
    undefined,
    'Proxy admin is not the one registered in the network manifest',
  );
});
