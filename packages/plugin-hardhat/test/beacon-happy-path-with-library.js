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

  t.context.Adder = await ethers.getContractFactory('Adder');
  t.context.AdderV2 = await ethers.getContractFactory('AdderV2');
});

test('happy path with library', async t => {
  const { Adder, AdderV2 } = t.context;

  const beacon = await upgrades.deployBeacon(Adder);
  const adder = await upgrades.deployBeaconProxy(beacon, Adder);

  await upgrades.upgradeBeacon(beacon, AdderV2);
  const adder2 = Adder.attach(await adder.getAddress());
  await adder2.add(1);
});
