const test = require('ava');

const hre = require('hardhat');
const { getProxyAdminFactory } = require('@openzeppelin/hardhat-upgrades/dist/utils/factories.js');

const { ethers, upgrades } = hre;

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');
});

test('use different admin address than manifest', async t => {
  // Deploy a proxy
  const { Greeter, GreeterV2 } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hola admin!'], { kind: 'transparent' });

  // Change to new admin owned by signer 2
  const [, signer] = await ethers.getSigners();
  const AdminFactory = await getProxyAdminFactory(hre, signer);
  const deployedAdmin = await AdminFactory.deploy();
  await upgrades.admin.changeProxyAdmin(await greeter.getAddress(), await deployedAdmin.getAddress());

  // Signer 1 cannot upgrade since it doesn't own the new admin
  await t.throwsAsync(() => upgrades.upgradeProxy(greeter, GreeterV2));

  // Upgrade using signer 2
  const GreeterV3 = Greeter.connect(signer);
  await upgrades.upgradeProxy(greeter, GreeterV3);

  // Change the admin again, even though current admin is not the one in the manifest
  const deployedAdmin2 = await AdminFactory.deploy();
  await upgrades.admin.changeProxyAdmin(await greeter.getAddress(), await deployedAdmin2.getAddress(), signer);
});
