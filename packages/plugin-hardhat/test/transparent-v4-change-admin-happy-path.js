const test = require('ava');

const { ethers, upgrades } = require('hardhat');

const ProxyAdmin = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json');
const TransparentUpgradableProxy = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol/TransparentUpgradeableProxy.json');

const testAddress = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.ProxyAdmin = await ethers.getContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode);
  t.context.TransparentUpgradableProxy = await ethers.getContractFactory(
    TransparentUpgradableProxy.abi,
    TransparentUpgradableProxy.bytecode,
  );
});

test('changeProxyAdmin', async t => {
  const { Greeter, ProxyAdmin, TransparentUpgradableProxy } = t.context;

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

  await upgrades.admin.changeProxyAdmin(await greeter.getAddress(), testAddress);
  const newAdmin = await upgrades.erc1967.getAdminAddress(await greeter.getAddress());

  t.is(newAdmin, testAddress);
});
