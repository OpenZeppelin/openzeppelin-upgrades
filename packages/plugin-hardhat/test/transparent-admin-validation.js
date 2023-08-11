const test = require('ava');

const hre = require('hardhat');
const { getProxyAdminFactory } = require('@openzeppelin/hardhat-upgrades/dist/utils/factories.js');

const { ethers, upgrades } = hre;

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

test('admin validation', async t => {
  const { Greeter, GreeterV2 } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hola admin!'], { kind: 'transparent' });

  const [, signer] = await ethers.getSigners();
  const AdminFactory = await getProxyAdminFactory(hre, signer);
  const deployedAdmin = await AdminFactory.deploy();
  const deployedAdminAddress = await deployedAdmin.getAddress();
  await upgrades.admin.changeProxyAdmin(await greeter.getAddress(), deployedAdminAddress);

  // Old admin signer cannot upgrade this
  await t.throwsAsync(() => upgrades.upgradeProxy(greeter, GreeterV2));

  const GreeterV3 = Greeter.connect(signer);
  await upgrades.upgradeProxy(greeter, GreeterV3);
});
