import test from 'ava';
import hre from 'hardhat';
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

const connection = await hre.network.connect();
const { ethers } = connection;

/** @type {import('@openzeppelin/hardhat-upgrades').HardhatUpgrades} */
let upgrades;

test.after.always(async () => {
  await connection.close();
});

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);

  t.context.Greeter = await ethers.getContractFactory('Greeter');
  t.context.Invalid = await ethers.getContractFactory('Invalid');
});

test('invalid upgrade', async t => {
  const { Greeter, Invalid } = t.context;

  const beacon = await upgrades.deployBeacon(Greeter);
  await upgrades.deployBeaconProxy(beacon, Greeter, ['Hola mundo!']);
  const error = await t.throwsAsync(() => upgrades.upgradeBeacon(beacon, Invalid));
  t.true(error.message.includes('Contract `Invalid` is not upgrade safe'), error.message);
});
