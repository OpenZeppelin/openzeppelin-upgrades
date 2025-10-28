import test from 'ava';
import hre from 'hardhat';

const connection = await hre.network.connect();
const { ethers } = connection;
import { upgrades as upgradesFactory } from '@openzeppelin/hardhat-upgrades';

let upgrades;

test.before(async t => {
  upgrades = await upgradesFactory(hre, connection);
  upgrades.silenceWarnings();
  
  t.context.Action = await ethers.getContractFactory('Action');
  t.context.ActionV2 = await ethers.getContractFactory('ActionV2');
  t.context.ActionV2Bad = await ethers.getContractFactory('ActionV2Bad');
});

test('deployBeaconProxy', async t => {
  const { Action } = t.context;
  const beacon = await upgrades.deployBeacon(Action);
  await upgrades.deployBeaconProxy(beacon, Action, []);
});

test('upgradeBeacon', async t => {
  const { Action, ActionV2 } = t.context;
  const beacon = await upgrades.deployBeacon(Action);
  await upgrades.deployBeaconProxy(beacon, Action, []);

  await upgrades.upgradeBeacon(beacon, ActionV2);
});

test('upgradeBeacon with incompatible layout', async t => {
  const { Action, ActionV2Bad } = t.context;
  const beacon = await upgrades.deployBeacon(Action);
  await upgrades.deployBeaconProxy(beacon, Action, []);

  const error = await t.throwsAsync(() => upgrades.upgradeBeacon(beacon, ActionV2Bad));
  t.true(error.message.includes('Upgraded `action` to an incompatible type'));
});
