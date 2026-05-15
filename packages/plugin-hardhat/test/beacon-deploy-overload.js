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

  t.context.DeployOverload = await ethers.getContractFactory('DeployOverload');
});

test('no args', async t => {
  const beacon = await upgrades.deployBeacon(t.context.DeployOverload);
  const c = await upgrades.deployBeaconProxy(beacon, t.context.DeployOverload, {
    kind: 'beacon',
    initializer: 'customInitialize',
  });
  t.is((await c.value()).toString(), '42');
});
