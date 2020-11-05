const test = require('ava');

const { ethers, upgrades } = require('hardhat');

test.before(async t => {
  t.context.Action = await ethers.getContractFactory('Action');
  t.context.ActionV2 = await ethers.getContractFactory('ActionV2');
});

test('deployProxy without flag', async t => {
  const { Action } = t.context;
  await t.throwsAsync(() => upgrades.deployProxy(Action));
});

test('deployProxy with flag', async t => {
  const { Action } = t.context;
  await upgrades.deployProxy(Action, [], { unsafeAllowCustomTypes: true });
});

test('upgradeProxy without flag', async t => {
  const { Action, ActionV2 } = t.context;
  const action = await upgrades.deployProxy(Action, [], { unsafeAllowCustomTypes: true });
  await t.throwsAsync(() => upgrades.upgradeProxy(action.address, ActionV2));
});

test('upgradeProxy with flag', async t => {
  const { Action, ActionV2 } = t.context;
  const action = await upgrades.deployProxy(Action, [], { unsafeAllowCustomTypes: true });
  await upgrades.upgradeProxy(action.address, ActionV2, { unsafeAllowCustomTypes: true });
});
