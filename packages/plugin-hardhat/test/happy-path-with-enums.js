const test = require('ava');

const { ethers, upgrades } = require('hardhat');

upgrades.silenceWarnings();

test.before(async t => {
  t.context.Action = await ethers.getContractFactory('Action');
  t.context.ActionV2 = await ethers.getContractFactory('ActionV2');
});

test('deployProxy with flag', async t => {
  const { Action } = t.context;
  await upgrades.deployProxy(Action, []);
});

test('upgradeProxy with flag', async t => {
  const { Action, ActionV2 } = t.context;
  const action = await upgrades.deployProxy(Action, []);
  await upgrades.upgradeProxy(action.address, ActionV2);
});
