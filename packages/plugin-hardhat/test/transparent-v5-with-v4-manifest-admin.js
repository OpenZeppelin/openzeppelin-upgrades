const test = require('ava');

const { ethers, upgrades } = require('hardhat');
const hre = require('hardhat');

const { fetchOrDeployAdmin } = require('@openzeppelin/upgrades-core');
const { deploy } = require('../dist/utils');

const ProxyAdmin = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json');

test.before(async t => {
  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.ProxyAdmin = await ethers.getContractFactory(ProxyAdmin.abi, ProxyAdmin.bytecode);
});

test('add v4 admin to manifest, then deploy v5 transparent', async t => {
  const { Greeter, ProxyAdmin } = t.context;

  const admin = await ProxyAdmin.deploy();
  await admin.waitForDeployment();

  await fetchOrDeployAdmin(ethers.provider, () => deploy(hre, {}, ProxyAdmin), {});

  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!']);
  await greeter.waitForDeployment();
  const greeterAdmin = await upgrades.erc1967.getAdminAddress(await greeter.getAddress());

  t.not(greeterAdmin, await admin.getAddress());
});
