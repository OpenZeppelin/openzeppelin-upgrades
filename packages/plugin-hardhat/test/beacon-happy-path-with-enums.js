const test = require('ava');

const { ethers, upgrades } = require('hardhat');

upgrades.silenceWarnings();

test.before(async t => {
  t.context.Action = await ethers.getContractFactory('Action');
  t.context.ActionV2 = await ethers.getContractFactory('ActionV2');
  t.context.ActionV2Bad = await ethers.getContractFactory('ActionV2Bad');
});

test('deployBeaconProxy', async t => {
  const { Action } = t.context;
  const beacon = await upgrades.deployBeacon(Action);
  await upgrades.deployBeaconProxy(beacon, []);
});

test('upgradeBeacon', async t => {
  const { Action, ActionV2 } = t.context;
  const beacon = await upgrades.deployBeacon(Action);
  await upgrades.deployBeaconProxy(beacon, []);

  await upgrades.upgradeBeacon(beacon, ActionV2);
});

test('upgradeBeacon with incompatible layout', async t => {
  const { Action, ActionV2Bad } = t.context;
  const beacon = await upgrades.deployBeacon(Action);
  await upgrades.deployBeaconProxy(beacon, []);

  const error = await t.throwsAsync(() => upgrades.upgradeBeacon(beacon, ActionV2Bad));
  t.true(error.message.includes('Upgraded `action` to an incompatible type'));
});
