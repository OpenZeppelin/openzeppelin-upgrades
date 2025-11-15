import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

const TEST_ADDRESS = '0x1E6876a6C2757de611c9F12B23211dBaBd1C9028';
const OWNABLE_ABI = ['function owner() view returns (address)'];

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  t.context.Greeter = await ethers.getContractFactory('Greeter');
});

test('transferProxyAdminOwnership', async t => {
  // we need to deploy a proxy so we have a Proxy Admin
  const { Greeter } = t.context;
  const greeter = await upgrades.deployProxy(Greeter, ['Hello, Hardhat!'], { kind: 'transparent' });

  await upgrades.admin.transferProxyAdminOwnership(await greeter.getAddress(), TEST_ADDRESS);

  const adminAddress = await upgrades.erc1967.getAdminAddress(await greeter.getAddress());
  const admin = await ethers.getContractAt(OWNABLE_ABI, adminAddress); // ← mudou aqui de hre.ethers para ethers
  const newOwner = await admin.owner();

  t.is(newOwner, TEST_ADDRESS);
});