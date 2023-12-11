const test = require('ava');

const hre = require('hardhat');
const ProxyAdmin = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json');
const TransparentUpgradableProxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json');

const { ethers, upgrades } = hre;

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.GreeterV2 = await ethers.getContractFactory('GreeterV2');

  t.context.ProxyAdmin = await ethers.getContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode);
  t.context.TransparentUpgradableProxy = await ethers.getContractFactory(
    TransparentUpgradableProxy.abi,
    TransparentUpgradableProxy.bytecode,
  );
});

test('use different admin addresses', async t => {
  const { Greeter, GreeterV2, ProxyAdmin, TransparentUpgradableProxy } = t.context;

  // Deploy a v4 proxy and admin, and import them
  const impl = await Greeter.deploy();
  await impl.waitForDeployment();
  const admin = await ProxyAdmin.deploy();
  await admin.waitForDeployment();
  const proxy = await TransparentUpgradableProxy.deploy(
    await impl.getAddress(),
    await admin.getAddress(),
    Greeter.interface.encodeFunctionData('initialize', ['Hello, Hardhat!']),
  );
  const greeter = await upgrades.forceImport(await proxy.getAddress(), Greeter);

  // Change to new admin owned by signer 2
  const [signer1, signer2] = await ethers.getSigners();
  const ProxyAdminSigner2 = ProxyAdmin.connect(signer2);
  const newAdmin = await ProxyAdminSigner2.deploy();

  await upgrades.admin.changeProxyAdmin(await greeter.getAddress(), await newAdmin.getAddress(), signer1);

  // Signer 1 cannot upgrade since it doesn't own the new admin
  await t.throwsAsync(() => upgrades.upgradeProxy(greeter, GreeterV2));

  // Upgrade using signer 2
  const GreeterV3 = Greeter.connect(signer2);
  await upgrades.upgradeProxy(greeter, GreeterV3);

  // Use the new admin to change the admin again, even though new admin is not the one in the manifest
  const deployedAdmin2 = await ProxyAdmin.deploy();

  await upgrades.admin.changeProxyAdmin(await greeter.getAddress(), await deployedAdmin2.getAddress(), signer2);
});
