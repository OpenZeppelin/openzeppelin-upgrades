import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

const hre = require('hardhat');

const { fetchOrDeployAdmin } = require('@openzeppelin/upgrades-core');
import { deploy } from '../dist/utils.js';

const ProxyAdmin = require('@openzeppelin/upgrades-core/artifacts/@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol/ProxyAdmin.json');

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
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
